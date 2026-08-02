import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// GET /api/growth/mandalarts/[userId]?cohort_id=xxx
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { userId } = await params;
  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohort_id");

  const supabase = createServerClient();

  let query = supabase
    .from("growth_mandalarts")
    .select("*, users(display_name)")
    .eq("user_id", userId);

  if (cohortId) query = query.eq("cohort_id", cohortId);

  const { data: mandalarts, error } = await query.order("updated_at", { ascending: false }).limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!mandalarts || mandalarts.length === 0) return NextResponse.json(null);

  const m = mandalarts[0] as Record<string, unknown>;

  if (m.visibility === "private" && m.user_id !== session.userId) {
    return NextResponse.json({ error: "비공개 만다라트" }, { status: 403 });
  }

  const { data: cells } = await supabase
    .from("growth_mandalart_cells")
    .select("*")
    .eq("mandalart_id", m.id as string)
    .order("block_idx")
    .order("cell_idx");

  const cellList = cells ?? [];
  const cellIds = cellList.map((c: Record<string, unknown>) => c.id as string).filter(Boolean);
  let todosMap: Record<string, Array<{ id: string; cell_id: string; text: string; done: boolean; order_idx: number }>> = {};

  if (cellIds.length > 0) {
    try {
      const { data: todos, error: todosErr } = await supabase
        .from("growth_mandalart_cell_todos")
        .select("*")
        .in("cell_id", cellIds)
        .order("order_idx");
      if (!todosErr && todos) {
        for (const t of todos) {
          if (!todosMap[t.cell_id]) todosMap[t.cell_id] = [];
          todosMap[t.cell_id].push(t);
        }
      }
    } catch { /* table not created yet */ }
  }

  // ── 체크 이력 (반복 항목 연간 진행률 계산용) ────────────────────────────────
  const todoIds = Object.values(todosMap).flat().map((t) => t.id).filter(Boolean);
  const checkedPeriodsByItem: Record<string, string[]> = {};
  if (cellIds.length > 0 || todoIds.length > 0) {
    try {
      let checkinsQuery = supabase
        .from("growth_mandalart_checkins")
        .select("item_type, item_id, period_key, rep_index");
      const orParts: string[] = [];
      if (cellIds.length > 0) orParts.push(`and(item_type.eq.cell,item_id.in.(${cellIds.join(",")}))`);
      if (todoIds.length > 0) orParts.push(`and(item_type.eq.todo,item_id.in.(${todoIds.join(",")}))`);
      if (orParts.length > 0) checkinsQuery = checkinsQuery.or(orParts.join(","));
      const { data: checkins, error: checkinsErr } = await checkinsQuery;
      if (!checkinsErr && checkins) {
        for (const c of checkins) {
          const key = `${c.item_type}:${c.item_id}`;
          if (!checkedPeriodsByItem[key]) checkedPeriodsByItem[key] = [];
          checkedPeriodsByItem[key].push(`${c.period_key}__${c.rep_index}`);
        }
      }
    } catch { /* table not created yet */ }
  }

  const enrichedCells = cellList.map((c: Record<string, unknown>) => {
    const cellId = c.id as string;
    const cellTodos = (todosMap[cellId] ?? []).map((t) => ({
      ...t,
      checked_periods: checkedPeriodsByItem[`todo:${t.id}`] ?? [],
    }));
    return {
      ...c,
      todos: cellTodos,
      checked_periods: checkedPeriodsByItem[`cell:${cellId}`] ?? [],
      progress: { done: cellTodos.filter((t) => t.done).length, total: cellTodos.length },
    };
  });

  const u = m.users as { display_name: string } | null;
  return NextResponse.json({ ...m, users: undefined, display_name: u?.display_name ?? "", cells: enrichedCells });
}

// POST /api/growth/mandalarts/[userId]
export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { userId } = await params;
  if (userId !== session.userId) {
    return NextResponse.json({ error: "본인 만다라트만 수정 가능" }, { status: 403 });
  }

  const body = await req.json();
  const { cohort_id, center_goal, visibility, cells, subgoal_order } = body;

  const supabase = createServerClient();

  // ── 1. Upsert mandalart container ──────────────────────────────────────────
  let mandalartId: string;
  let existingQuery = supabase
    .from("growth_mandalarts")
    .select("id")
    .eq("user_id", userId);
  if (cohort_id) existingQuery = existingQuery.eq("cohort_id", cohort_id);
  const { data: existing } = await existingQuery.order("updated_at", { ascending: false }).limit(1).single();

  if (existing) {
    mandalartId = existing.id;
    // Try to save subgoal_order; fall back without it if column not yet added
    const updatePayload: Record<string, unknown> = {
      center_goal,
      visibility,
      updated_at: new Date().toISOString(),
    };
    if (subgoal_order !== undefined) updatePayload.subgoal_order = subgoal_order;

    const { error: updErr } = await supabase
      .from("growth_mandalarts")
      .update(updatePayload)
      .eq("id", mandalartId);

    if (updErr) {
      const isColErr =
        updErr.code === "PGRST204" ||
        (updErr.message ?? "").toLowerCase().includes("subgoal_order");
      if (isColErr && subgoal_order !== undefined) {
        // Retry without subgoal_order (column not yet added to DB)
        const { error: updErr2 } = await supabase
          .from("growth_mandalarts")
          .update({ center_goal, visibility, updated_at: new Date().toISOString() })
          .eq("id", mandalartId);
        if (updErr2) return NextResponse.json({ stage: "mandalart_update_failed", error: updErr2.message }, { status: 500 });
      } else {
        return NextResponse.json({ stage: "mandalart_update_failed", error: updErr.message }, { status: 500 });
      }
    }
  } else {
    const insertData: Record<string, unknown> = {
      user_id: userId,
      center_goal,
      visibility: visibility ?? "cohort",
    };
    if (cohort_id) insertData.cohort_id = cohort_id;
    if (subgoal_order !== undefined) insertData.subgoal_order = subgoal_order;

    const { data: newM, error: insErr } = await supabase
      .from("growth_mandalarts")
      .insert(insertData)
      .select("id")
      .single();

    if (insErr || !newM) {
      const isColErr =
        insErr &&
        (insErr.code === "PGRST204" ||
          (insErr.message ?? "").toLowerCase().includes("subgoal_order"));
      if (isColErr && subgoal_order !== undefined) {
        // Retry without subgoal_order
        delete insertData.subgoal_order;
        const { data: newM2, error: insErr2 } = await supabase
          .from("growth_mandalarts")
          .insert(insertData)
          .select("id")
          .single();
        if (insErr2 || !newM2) return NextResponse.json({ stage: "mandalart_insert_failed", error: insErr2?.message }, { status: 500 });
        mandalartId = newM2.id;
      } else {
        return NextResponse.json({ stage: "mandalart_insert_failed", error: insErr?.message }, { status: 500 });
      }
    } else {
      mandalartId = newM.id;
    }
  }

  if (!cells || !Array.isArray(cells) || cells.length === 0) {
    return NextResponse.json({ id: mandalartId });
  }

  type CellInput = {
    block_idx: number;
    cell_idx: number;
    text: string;
    emoji: string;
    done: boolean;
    cycle_type?: string;
    cycle_weekdays?: number[] | null;
    cycle_count?: number;
    todos?: Array<{
      id?: string;
      text: string;
      done: boolean;
      order_idx: number;
      cycle_type?: string;
      cycle_weekdays?: number[] | null;
      cycle_count?: number;
    }>;
  };

  const typedCells = cells as CellInput[];

  // ── 2. Fetch existing cells to decide insert vs update (fallback for DBs without unique constraint) ──
  const { data: existingCells } = await supabase
    .from("growth_mandalart_cells")
    .select("id, block_idx, cell_idx")
    .eq("mandalart_id", mandalartId);

  const existingMap: Record<string, string> = {};
  for (const ec of existingCells ?? []) {
    existingMap[`${ec.block_idx}-${ec.cell_idx}`] = ec.id;
  }

  // ── 3. Split cells into inserts and updates ────────────────────────────────
  // NOTE: cells that already exist in the DB (existingMap) must ALWAYS be
  // included in toUpdate, even when now completely empty — otherwise clearing
  // a cell's text/emoji (with no todos left) would never be persisted, since
  // the row would be silently skipped and the stale text would reappear on reload.
  // Only brand-new (not-yet-created) empty cells are skipped to avoid useless inserts.
  type CellRow = {
    text: string;
    emoji: string;
    done: boolean;
    cycle_type: string;
    cycle_weekdays: number[] | null;
    cycle_count: number;
  };
  const toInsert: Array<{ mandalart_id: string; block_idx: number; cell_idx: number } & CellRow> = [];
  const toUpdate: Array<{ id: string; block_idx: number; cell_idx: number } & CellRow> = [];

  for (const c of typedCells) {
    const existingId = existingMap[`${c.block_idx}-${c.cell_idx}`];
    const isEmpty = (!c.text || c.text.trim() === "") && (!c.emoji || c.emoji.trim() === "") && (!c.todos || c.todos.length === 0);
    if (!existingId && isEmpty) continue; // brand-new empty cell — nothing to persist

    const cellTodos = c.todos ?? [];
    const autoDone = cellTodos.length > 0 && cellTodos.every((t) => t.done);
    const row: CellRow = {
      text: c.text ?? "",
      emoji: c.emoji ?? "",
      done: c.done || autoDone,
      cycle_type: c.cycle_type ?? "none",
      cycle_weekdays: c.cycle_weekdays ?? null,
      cycle_count: c.cycle_count ?? 1,
    };
    if (existingId) {
      toUpdate.push({ id: existingId, block_idx: c.block_idx, cell_idx: c.cell_idx, ...row });
    } else {
      toInsert.push({ mandalart_id: mandalartId, block_idx: c.block_idx, cell_idx: c.cell_idx, ...row });
    }
  }

  const isColumnError = (err: { code?: string; message?: string } | null) =>
    !!err &&
    (err.code === "PGRST204" ||
      err.code === "42703" ||
      (err.message ?? "").toLowerCase().includes("schema") ||
      (err.message ?? "").toLowerCase().includes("column"));

  // Insert new cells
  let insertedIds: Record<string, string> = {};
  if (toInsert.length > 0) {
    const { data: inserted, error: insErr } = await supabase
      .from("growth_mandalart_cells")
      .insert(toInsert)
      .select("id, block_idx, cell_idx");
    if (insErr) {
      if (isColumnError(insErr)) {
        // cycle_* 컬럼이 아직 마이그레이션되지 않았을 수 있음 — 제외 후 재시도
        const toInsertNoCycle = toInsert.map(({ cycle_type: _ct, cycle_weekdays: _cw, cycle_count: _cc, ...rest }) => rest);
        const { data: ins2, error: insErr2 } = await supabase
          .from("growth_mandalart_cells")
          .insert(toInsertNoCycle)
          .select("id, block_idx, cell_idx");
        if (insErr2) {
          if (isColumnError(insErr2)) {
            // 'done' 컬럼도 없는 아주 오래된 DB — 마저 제외 후 재시도
            const toInsertMinimal = toInsertNoCycle.map(({ done: _d, ...rest }) => rest);
            const { data: ins3, error: insErr3 } = await supabase
              .from("growth_mandalart_cells")
              .insert(toInsertMinimal)
              .select("id, block_idx, cell_idx");
            if (insErr3) return NextResponse.json({ stage: "cells_insert_failed", error: insErr3.message }, { status: 500 });
            for (const r of ins3 ?? []) insertedIds[`${r.block_idx}-${r.cell_idx}`] = r.id;
          } else {
            return NextResponse.json({ stage: "cells_insert_failed", error: insErr2.message }, { status: 500 });
          }
        } else {
          for (const r of ins2 ?? []) insertedIds[`${r.block_idx}-${r.cell_idx}`] = r.id;
        }
      } else {
        return NextResponse.json({ stage: "cells_insert_failed", error: insErr.message }, { status: 500 });
      }
    } else {
      for (const r of inserted ?? []) insertedIds[`${r.block_idx}-${r.cell_idx}`] = r.id;
    }
  }

  // Update existing cells (개별 UPDATE — upsert 대신 안정적인 방식 사용)
  if (toUpdate.length > 0) {
    // First attempt: with cycle_* + done columns
    const { error: sampleErr } = await supabase
      .from("growth_mandalart_cells")
      .update({
        text: toUpdate[0].text,
        emoji: toUpdate[0].emoji,
        done: toUpdate[0].done,
        cycle_type: toUpdate[0].cycle_type,
        cycle_weekdays: toUpdate[0].cycle_weekdays,
        cycle_count: toUpdate[0].cycle_count,
      })
      .eq("id", toUpdate[0].id);

    const skipCycle = isColumnError(sampleErr);
    // cycle_* 제외 후에도 실패하면 done 컬럼 문제일 가능성 — 별도로 재확인
    let skipDone = false;
    if (skipCycle) {
      const { error: retryErr } = await supabase
        .from("growth_mandalart_cells")
        .update({ text: toUpdate[0].text, emoji: toUpdate[0].emoji, done: toUpdate[0].done })
        .eq("id", toUpdate[0].id);
      skipDone = isColumnError(retryErr);
    }

    // Process all rows (skip first if it already succeeded without error)
    const remaining = sampleErr ? toUpdate : toUpdate.slice(1);
    await Promise.all(
      remaining.map((row) => {
        const payload = skipDone
          ? { text: row.text, emoji: row.emoji }
          : skipCycle
          ? { text: row.text, emoji: row.emoji, done: row.done }
          : {
              text: row.text,
              emoji: row.emoji,
              done: row.done,
              cycle_type: row.cycle_type,
              cycle_weekdays: row.cycle_weekdays,
              cycle_count: row.cycle_count,
            };
        return supabase.from("growth_mandalart_cells").update(payload).eq("id", row.id);
      })
    );
  }

  // Combined cell ID map (existing + newly inserted)
  const cellIdMap: Record<string, string> = { ...existingMap, ...insertedIds };

  // ── 4. Handle todos (diff 기반 upsert — 기존 id 보존) ───────────────────────
  // 주의: 무조건 delete 후 insert하면 매번 새 id가 발급되어, 반복 체크 이력
  // (growth_mandalart_checkins.item_id)이 저장할 때마다 끊어진다. 클라이언트가
  // 함께 보낸 기존 id를 최대한 재사용(UPDATE)하고, id가 없는(신규) 항목만 INSERT,
  // 더 이상 존재하지 않는 항목만 DELETE한다.
  const affectedCellIds: string[] = [];
  for (const c of typedCells) {
    if (c.todos === undefined) continue;
    const cellId = cellIdMap[`${c.block_idx}-${c.cell_idx}`];
    if (!cellId) {
      if (c.todos.length > 0) {
        console.warn(`[mandalart POST] skipped todos for ${c.block_idx}-${c.cell_idx} — no cellId in cellIdMap`, {
          cellIdMapKeys: Object.keys(cellIdMap),
        });
      }
      continue; // no DB record for this cell yet — nothing to persist
    }
    affectedCellIds.push(cellId);
  }

  if (affectedCellIds.length > 0) {
    const { data: existingTodos, error: existingTodosErr } = await supabase
      .from("growth_mandalart_cell_todos")
      .select("id, cell_id")
      .in("cell_id", affectedCellIds);
    if (existingTodosErr) {
      return NextResponse.json({ stage: "todos_fetch_failed", error: existingTodosErr.message }, { status: 500 });
    }

    const existingIdsByCell: Record<string, Set<string>> = {};
    for (const t of existingTodos ?? []) {
      if (!existingIdsByCell[t.cell_id]) existingIdsByCell[t.cell_id] = new Set();
      existingIdsByCell[t.cell_id].add(t.id);
    }

    type TodoRow = {
      cell_id: string; text: string; done: boolean; order_idx: number;
      cycle_type: string; cycle_weekdays: number[] | null; cycle_count: number;
    };
    const toUpdateTodos: Array<TodoRow & { id: string }> = [];
    const toInsertTodos: TodoRow[] = [];
    const keptIdsByCell: Record<string, Set<string>> = {};

    for (const c of typedCells) {
      if (c.todos === undefined) continue;
      const cellId = cellIdMap[`${c.block_idx}-${c.cell_idx}`];
      if (!cellId) continue;
      const existingIds = existingIdsByCell[cellId] ?? new Set<string>();
      const kept = new Set<string>();
      for (const t of c.todos) {
        const row: TodoRow = {
          cell_id: cellId,
          text: t.text,
          done: t.done,
          order_idx: t.order_idx ?? 0,
          cycle_type: t.cycle_type ?? "none",
          cycle_weekdays: t.cycle_weekdays ?? null,
          cycle_count: t.cycle_count ?? 1,
        };
        if (t.id && existingIds.has(t.id)) {
          toUpdateTodos.push({ ...row, id: t.id });
          kept.add(t.id);
        } else {
          toInsertTodos.push(row);
        }
      }
      keptIdsByCell[cellId] = kept;
    }

    const idsToDelete: string[] = [];
    for (const cellId of affectedCellIds) {
      const existingIds = existingIdsByCell[cellId] ?? new Set<string>();
      const kept = keptIdsByCell[cellId] ?? new Set<string>();
      for (const id of existingIds) if (!kept.has(id)) idsToDelete.push(id);
    }

    if (idsToDelete.length > 0) {
      const { error: delErr } = await supabase.from("growth_mandalart_cell_todos").delete().in("id", idsToDelete);
      if (delErr) return NextResponse.json({ stage: "todos_delete_failed", error: delErr.message }, { status: 500 });
    }

    // Updates: 첫 건으로 cycle_* 컬럼 존재 여부 확인 후 나머지 일괄 처리 (cells 업데이트와 동일한 패턴)
    if (toUpdateTodos.length > 0) {
      const [first, ...rest] = toUpdateTodos;
      const { error: sampleErr } = await supabase
        .from("growth_mandalart_cell_todos")
        .update({
          text: first.text, done: first.done, order_idx: first.order_idx,
          cycle_type: first.cycle_type, cycle_weekdays: first.cycle_weekdays, cycle_count: first.cycle_count,
        })
        .eq("id", first.id);
      const skipCycle = !!sampleErr && (
        sampleErr.code === "PGRST204" || sampleErr.code === "42703" ||
        (sampleErr.message ?? "").toLowerCase().includes("cycle") ||
        (sampleErr.message ?? "").toLowerCase().includes("column") ||
        (sampleErr.message ?? "").toLowerCase().includes("schema")
      );
      if (skipCycle) {
        const { error: retryErr } = await supabase
          .from("growth_mandalart_cell_todos")
          .update({ text: first.text, done: first.done, order_idx: first.order_idx })
          .eq("id", first.id);
        if (retryErr) return NextResponse.json({ stage: "todos_update_failed", error: retryErr.message }, { status: 500 });
      } else if (sampleErr) {
        return NextResponse.json({ stage: "todos_update_failed", error: sampleErr.message }, { status: 500 });
      }

      await Promise.all(rest.map((row) => {
        const payload = skipCycle
          ? { text: row.text, done: row.done, order_idx: row.order_idx }
          : { text: row.text, done: row.done, order_idx: row.order_idx, cycle_type: row.cycle_type, cycle_weekdays: row.cycle_weekdays, cycle_count: row.cycle_count };
        return supabase.from("growth_mandalart_cell_todos").update(payload).eq("id", row.id);
      }));
    }

    if (toInsertTodos.length > 0) {
      const { error: insErr } = await supabase.from("growth_mandalart_cell_todos").insert(toInsertTodos);
      if (insErr) {
        const isColErr =
          insErr.code === "PGRST204" ||
          insErr.code === "42703" ||
          (insErr.message ?? "").toLowerCase().includes("cycle") ||
          (insErr.message ?? "").toLowerCase().includes("column") ||
          (insErr.message ?? "").toLowerCase().includes("schema");

        if (isColErr) {
          // Cycle columns not migrated yet — retry without them so save still succeeds
          const rowsWithoutCycle = toInsertTodos.map(({ cycle_type: _ct, cycle_weekdays: _cw, cycle_count: _cc, ...rest }) => rest);
          const { error: insErr2 } = await supabase.from("growth_mandalart_cell_todos").insert(rowsWithoutCycle);
          if (insErr2) {
            return NextResponse.json({ stage: "todos_insert_failed", error: insErr2.message }, { status: 500 });
          }
        } else {
          return NextResponse.json({ stage: "todos_insert_failed", error: insErr.message }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ id: mandalartId });
}

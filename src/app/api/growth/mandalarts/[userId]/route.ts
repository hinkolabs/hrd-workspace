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

  const enrichedCells = cellList.map((c: Record<string, unknown>) => {
    const cellTodos = todosMap[c.id as string] ?? [];
    return { ...c, todos: cellTodos, progress: { done: cellTodos.filter((t) => t.done).length, total: cellTodos.length } };
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
    todos?: Array<{
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
  const toInsert: Array<{ mandalart_id: string; block_idx: number; cell_idx: number; text: string; emoji: string; done: boolean }> = [];
  const toUpdate: Array<{ id: string; block_idx: number; cell_idx: number; text: string; emoji: string; done: boolean }> = [];

  for (const c of typedCells) {
    const existingId = existingMap[`${c.block_idx}-${c.cell_idx}`];
    const isEmpty = (!c.text || c.text.trim() === "") && (!c.emoji || c.emoji.trim() === "") && (!c.todos || c.todos.length === 0);
    if (!existingId && isEmpty) continue; // brand-new empty cell — nothing to persist

    const cellTodos = c.todos ?? [];
    const autoDone = cellTodos.length > 0 && cellTodos.every((t) => t.done);
    const row = { text: c.text ?? "", emoji: c.emoji ?? "", done: c.done || autoDone };
    if (existingId) {
      toUpdate.push({ id: existingId, block_idx: c.block_idx, cell_idx: c.cell_idx, ...row });
    } else {
      toInsert.push({ mandalart_id: mandalartId, block_idx: c.block_idx, cell_idx: c.cell_idx, ...row });
    }
  }

  // Insert new cells
  let insertedIds: Record<string, string> = {};
  if (toInsert.length > 0) {
    const { data: inserted, error: insErr } = await supabase
      .from("growth_mandalart_cells")
      .insert(toInsert)
      .select("id, block_idx, cell_idx");
    if (insErr) {
      // PGRST204: 'done' column may not exist in older DB — retry without it
      if (insErr.code === "PGRST204" || insErr.message?.includes("done")) {
        const toInsertNoDone = toInsert.map(({ done: _d, ...rest }) => rest);
        const { data: ins2, error: insErr2 } = await supabase
          .from("growth_mandalart_cells")
          .insert(toInsertNoDone)
          .select("id, block_idx, cell_idx");
        if (insErr2) return NextResponse.json({ stage: "cells_insert_failed", error: insErr2.message }, { status: 500 });
        for (const r of ins2 ?? []) insertedIds[`${r.block_idx}-${r.cell_idx}`] = r.id;
      } else {
        return NextResponse.json({ stage: "cells_insert_failed", error: insErr.message }, { status: 500 });
      }
    } else {
      for (const r of inserted ?? []) insertedIds[`${r.block_idx}-${r.cell_idx}`] = r.id;
    }
  }

  // Update existing cells (개별 UPDATE — upsert 대신 안정적인 방식 사용)
  if (toUpdate.length > 0) {
    // First attempt: with done column
    const { error: sampleErr } = await supabase
      .from("growth_mandalart_cells")
      .update({ text: toUpdate[0].text, emoji: toUpdate[0].emoji, done: toUpdate[0].done })
      .eq("id", toUpdate[0].id);

    // Check if done column causes schema cache error
    const skipDone =
      !!sampleErr &&
      (sampleErr.code === "PGRST204" ||
        sampleErr.code === "42703" ||
        (sampleErr.message ?? "").toLowerCase().includes("done") ||
        (sampleErr.message ?? "").toLowerCase().includes("schema") ||
        (sampleErr.message ?? "").toLowerCase().includes("column"));

    // Process all rows (skip first if it already succeeded without error)
    const remaining = sampleErr ? toUpdate : toUpdate.slice(1);
    await Promise.all(
      remaining.map((row) => {
        const payload = skipDone
          ? { text: row.text, emoji: row.emoji }
          : { text: row.text, emoji: row.emoji, done: row.done };
        return supabase.from("growth_mandalart_cells").update(payload).eq("id", row.id);
      })
    );
  }

  // Combined cell ID map (existing + newly inserted)
  const cellIdMap: Record<string, string> = { ...existingMap, ...insertedIds };

  // ── 4. Handle todos (batch delete + insert) ────────────────────────────────
  const affectedCellIds: string[] = [];
  const allTodoRows: Array<{
    cell_id: string;
    text: string;
    done: boolean;
    order_idx: number;
    cycle_type: string;
    cycle_weekdays: number[] | null;
    cycle_count: number;
  }> = [];

  // Use typedCells (all cells) instead of nonEmptyCells so that cells whose todos
  // were cleared (empty array) still trigger a DELETE on their existing DB rows.
  // nonEmptyCells skips cells with no text/emoji/todos, causing deleted todos to persist.
  for (const c of typedCells) {
    if (c.todos === undefined) continue;
    const cellId = cellIdMap[`${c.block_idx}-${c.cell_idx}`];
    if (!cellId) {
      if (c.todos.length > 0) {
        console.warn(`[mandalart POST] skipped todos for ${c.block_idx}-${c.cell_idx} — no cellId in cellIdMap`, {
          cellIdMapKeys: Object.keys(cellIdMap),
        });
      }
      continue; // no DB record for this cell yet — nothing to delete
    }
    affectedCellIds.push(cellId);
    for (const t of c.todos) {
      allTodoRows.push({
        cell_id: cellId,
        text: t.text,
        done: t.done,
        order_idx: t.order_idx ?? 0,
        cycle_type: t.cycle_type ?? "none",
        cycle_weekdays: t.cycle_weekdays ?? null,
        cycle_count: t.cycle_count ?? 1,
      });
    }
  }

  console.log("[mandalart POST] debug", {
    mandalartId,
    typedCellsCount: typedCells.length,
    toInsertCount: toInsert.length,
    toUpdateCount: toUpdate.length,
    existingMapKeys: Object.keys(existingMap),
    insertedIdsKeys: Object.keys(insertedIds),
    affectedCellIds,
    allTodoRows,
  });

  if (affectedCellIds.length > 0) {
    // Use {error} pattern — Supabase JS never throws, so try-catch is ineffective here
    const { error: delTodoErr } = await supabase
      .from("growth_mandalart_cell_todos")
      .delete()
      .in("cell_id", affectedCellIds);

    console.log("[mandalart POST] delete todos result", { delTodoErr });

    if (delTodoErr) {
      return NextResponse.json({ stage: "todos_delete_failed", error: delTodoErr.message }, { status: 500 });
    }

    if (allTodoRows.length > 0) {
      const { data: insData, error: insErr } = await supabase
        .from("growth_mandalart_cell_todos")
        .insert(allTodoRows)
        .select("*");

      console.log("[mandalart POST] insert todos result", { insErr, insertedCount: insData?.length });

      if (insErr) {
        const isColErr =
          insErr.code === "PGRST204" ||
          insErr.code === "42703" ||
          (insErr.message ?? "").toLowerCase().includes("cycle") ||
          (insErr.message ?? "").toLowerCase().includes("column") ||
          (insErr.message ?? "").toLowerCase().includes("schema");

        if (isColErr) {
          // Cycle columns not migrated yet — retry without them so save still succeeds
          const rowsWithoutCycle = allTodoRows.map(({ cycle_type: _ct, cycle_weekdays: _cw, cycle_count: _cc, ...rest }) => rest);
          const { data: insData2, error: insErr2 } = await supabase.from("growth_mandalart_cell_todos").insert(rowsWithoutCycle).select("*");
          console.log("[mandalart POST] fallback insert todos result", { insErr2, insertedCount: insData2?.length });
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

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
  const { cohort_id, center_goal, visibility, cells } = body;

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
    const { error: updErr } = await supabase
      .from("growth_mandalarts")
      .update({ center_goal, visibility, updated_at: new Date().toISOString() })
      .eq("id", mandalartId);
    if (updErr) return NextResponse.json({ stage: "mandalart_update_failed", error: updErr.message }, { status: 500 });
  } else {
    const insertData: Record<string, unknown> = {
      user_id: userId,
      center_goal,
      visibility: visibility ?? "cohort",
    };
    if (cohort_id) insertData.cohort_id = cohort_id;

    const { data: newM, error: insErr } = await supabase
      .from("growth_mandalarts")
      .insert(insertData)
      .select("id")
      .single();
    if (insErr || !newM) return NextResponse.json({ stage: "mandalart_insert_failed", error: insErr?.message }, { status: 500 });
    mandalartId = newM.id;
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
    todos?: Array<{ text: string; done: boolean; order_idx: number }>;
  };

  const typedCells = cells as CellInput[];

  // Filter out completely empty cells (no text, no emoji, no todos) to reduce writes
  const nonEmptyCells = typedCells.filter(
    (c) => (c.text && c.text.trim() !== "") || (c.emoji && c.emoji.trim() !== "") || (c.todos && c.todos.length > 0)
  );

  if (nonEmptyCells.length === 0) return NextResponse.json({ id: mandalartId });

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
  const toInsert: Array<{ mandalart_id: string; block_idx: number; cell_idx: number; text: string; emoji: string; done: boolean }> = [];
  const toUpdate: Array<{ id: string; block_idx: number; cell_idx: number; text: string; emoji: string; done: boolean }> = [];

  for (const c of nonEmptyCells) {
    const cellTodos = c.todos ?? [];
    const autoDone = cellTodos.length > 0 && cellTodos.every((t) => t.done);
    const row = { text: c.text ?? "", emoji: c.emoji ?? "", done: c.done || autoDone };
    const existingId = existingMap[`${c.block_idx}-${c.cell_idx}`];
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

  // Update existing cells (batch via upsert with id)
  if (toUpdate.length > 0) {
    const updateRows = toUpdate.map(({ id, block_idx, cell_idx, text, emoji, done }) => ({
      id,
      mandalart_id: mandalartId,
      block_idx,
      cell_idx,
      text,
      emoji,
      done,
    }));
    const { error: updErr } = await supabase
      .from("growth_mandalart_cells")
      .upsert(updateRows, { onConflict: "id" });
    if (updErr) {
      // Fallback: update one by one, skip done if schema cache error
      const skipDone = updErr.code === "PGRST204" || updErr.message?.includes("done");
      for (const row of toUpdate) {
        const updatePayload = skipDone
          ? { text: row.text, emoji: row.emoji }
          : { text: row.text, emoji: row.emoji, done: row.done };
        await supabase.from("growth_mandalart_cells").update(updatePayload).eq("id", row.id);
      }
    }
  }

  // Combined cell ID map (existing + newly inserted)
  const cellIdMap: Record<string, string> = { ...existingMap, ...insertedIds };

  // ── 4. Handle todos (batch delete + insert) ────────────────────────────────
  const affectedCellIds: string[] = [];
  const allTodoRows: Array<{ cell_id: string; text: string; done: boolean; order_idx: number }> = [];

  for (const c of nonEmptyCells) {
    if (c.todos === undefined) continue;
    const cellId = cellIdMap[`${c.block_idx}-${c.cell_idx}`];
    if (!cellId) continue;
    affectedCellIds.push(cellId);
    for (const t of c.todos) {
      allTodoRows.push({ cell_id: cellId, text: t.text, done: t.done, order_idx: t.order_idx ?? 0 });
    }
  }

  if (affectedCellIds.length > 0) {
    // Use {error} pattern — Supabase JS never throws, so try-catch is ineffective here
    const { error: delTodoErr } = await supabase
      .from("growth_mandalart_cell_todos")
      .delete()
      .in("cell_id", affectedCellIds);
    if (!delTodoErr && allTodoRows.length > 0) {
      await supabase.from("growth_mandalart_cell_todos").insert(allTodoRows);
    }
    // If delTodoErr (e.g. table not yet created), silently skip todos — cells are already saved
  }

  return NextResponse.json({ id: mandalartId });
}

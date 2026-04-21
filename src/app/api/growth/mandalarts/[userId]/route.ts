import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// GET /api/growth/mandalarts/[userId]?cohort_id=xxx
// Returns mandalart + all cells + todos for a user
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

  if (!mandalarts || mandalarts.length === 0) {
    return NextResponse.json(null);
  }

  const m = mandalarts[0] as Record<string, unknown>;

  // Visibility check
  if (m.visibility === "private" && m.user_id !== session.userId) {
    return NextResponse.json({ error: "비공개 만다라트" }, { status: 403 });
  }

  const { data: cells } = await supabase
    .from("growth_mandalart_cells")
    .select("*")
    .eq("mandalart_id", m.id as string)
    .order("block_idx")
    .order("cell_idx");

  // Fetch todos — gracefully skip if table doesn't exist yet
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
    } catch {
      // Table doesn't exist yet — continue without todos
    }
  }

  // Attach todos + progress to each cell
  const enrichedCells = cellList.map((c: Record<string, unknown>) => {
    const cellTodos = todosMap[c.id as string] ?? [];
    const progress = { done: cellTodos.filter((t) => t.done).length, total: cellTodos.length };
    return { ...c, todos: cellTodos, progress };
  });

  const u = m.users as { display_name: string } | null;
  return NextResponse.json({ ...m, users: undefined, display_name: u?.display_name ?? "", cells: enrichedCells });
}

// POST /api/growth/mandalarts/[userId] — upsert mandalart + save cells + todos
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
    await supabase
      .from("growth_mandalarts")
      .update({ center_goal, visibility, updated_at: new Date().toISOString() })
      .eq("id", mandalartId);
  } else {
    const insertData: Record<string, unknown> = {
      user_id: userId,
      center_goal,
      visibility: visibility ?? "cohort",
    };
    if (cohort_id) insertData.cohort_id = cohort_id;

    const { data: newM, error } = await supabase
      .from("growth_mandalarts")
      .insert(insertData)
      .select("id")
      .single();
    if (error || !newM) return NextResponse.json({ error: error?.message }, { status: 500 });
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

  // ── 2. Batch upsert ALL cells in one request ───────────────────────────────
  const cellRows = typedCells.map((c) => {
    const cellTodos = c.todos ?? [];
    const autoDone = cellTodos.length > 0 && cellTodos.every((t) => t.done);
    return {
      mandalart_id: mandalartId,
      block_idx: c.block_idx,
      cell_idx: c.cell_idx,
      text: c.text ?? "",
      emoji: c.emoji ?? "",
      done: c.done || autoDone,
    };
  });

  const { data: upsertedCells, error: cellsError } = await supabase
    .from("growth_mandalart_cells")
    .upsert(cellRows, { onConflict: "mandalart_id,block_idx,cell_idx" })
    .select("id, block_idx, cell_idx");

  if (cellsError) {
    return NextResponse.json({ error: cellsError.message }, { status: 500 });
  }

  // ── 3. Handle todos (batch delete + insert) — skip if table not ready ─────
  if (upsertedCells && upsertedCells.length > 0) {
    // Build lookup: block_idx-cell_idx → db cell id
    const cellIdMap: Record<string, string> = {};
    for (const uc of upsertedCells) {
      cellIdMap[`${uc.block_idx}-${uc.cell_idx}`] = uc.id;
    }

    // Collect all cell IDs where todos should be replaced
    const affectedCellIds: string[] = [];
    const allTodoRows: Array<{ cell_id: string; text: string; done: boolean; order_idx: number }> = [];

    for (const c of typedCells) {
      if (c.todos === undefined) continue; // no todos payload → don't touch
      const cellId = cellIdMap[`${c.block_idx}-${c.cell_idx}`];
      if (!cellId) continue;
      affectedCellIds.push(cellId);
      for (const t of c.todos) {
        allTodoRows.push({ cell_id: cellId, text: t.text, done: t.done, order_idx: t.order_idx ?? 0 });
      }
    }

    if (affectedCellIds.length > 0) {
      try {
        // Delete existing todos for affected cells (batch)
        await supabase
          .from("growth_mandalart_cell_todos")
          .delete()
          .in("cell_id", affectedCellIds);

        // Insert new todos (batch)
        if (allTodoRows.length > 0) {
          await supabase.from("growth_mandalart_cell_todos").insert(allTodoRows);
        }
      } catch {
        // Todos table doesn't exist yet — cells saved successfully, todos skipped
      }
    }
  }

  return NextResponse.json({ id: mandalartId });
}

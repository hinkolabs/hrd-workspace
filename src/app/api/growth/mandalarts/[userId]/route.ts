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

  // Fetch todos for all cells
  const cellIds = (cells ?? []).map((c: Record<string, unknown>) => c.id as string).filter(Boolean);
  let todosMap: Record<string, Array<{ id: string; cell_id: string; text: string; done: boolean; order_idx: number }>> = {};
  if (cellIds.length > 0) {
    const { data: todos } = await supabase
      .from("growth_mandalart_cell_todos")
      .select("*")
      .in("cell_id", cellIds)
      .order("order_idx");
    if (todos) {
      for (const t of todos) {
        if (!todosMap[t.cell_id]) todosMap[t.cell_id] = [];
        todosMap[t.cell_id].push(t);
      }
    }
  }

  // Attach todos + progress to each cell
  const enrichedCells = (cells ?? []).map((c: Record<string, unknown>) => {
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

  // Upsert mandalart container
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

  // Upsert cells + todos
  if (cells && Array.isArray(cells)) {
    type CellInput = {
      block_idx: number;
      cell_idx: number;
      text: string;
      emoji: string;
      done: boolean;
      todos?: Array<{ id?: string; text: string; done: boolean; order_idx: number }>;
    };

    for (const c of cells as CellInput[]) {
      const cellTodos = c.todos ?? [];
      // Compute derived done: all todos checked (and at least one)
      const autoDone = cellTodos.length > 0 && cellTodos.every((t) => t.done);
      const cellDone = c.done || autoDone;

      // Upsert cell
      const { data: upsertedCell } = await supabase
        .from("growth_mandalart_cells")
        .upsert(
          {
            mandalart_id: mandalartId,
            block_idx: c.block_idx,
            cell_idx: c.cell_idx,
            text: c.text ?? "",
            emoji: c.emoji ?? "",
            done: cellDone,
          },
          { onConflict: "mandalart_id,block_idx,cell_idx" }
        )
        .select("id")
        .single();

      if (upsertedCell && cellTodos.length > 0) {
        // Replace todos for this cell
        await supabase.from("growth_mandalart_cell_todos").delete().eq("cell_id", upsertedCell.id);
        const todoRows = cellTodos.map((t, idx) => ({
          cell_id: upsertedCell.id,
          text: t.text,
          done: t.done,
          order_idx: t.order_idx ?? idx,
        }));
        await supabase.from("growth_mandalart_cell_todos").insert(todoRows);
      } else if (upsertedCell && cellTodos.length === 0) {
        // If explicitly empty todos passed, clear existing
        if (c.todos !== undefined) {
          await supabase.from("growth_mandalart_cell_todos").delete().eq("cell_id", upsertedCell.id);
        }
      }
    }
  }

  return NextResponse.json({ id: mandalartId });
}

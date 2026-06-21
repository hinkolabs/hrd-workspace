import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// POST /api/admin/sync-theme-completions
// 만다라트 셀 데이터를 기반으로 theme_completions 동기화
export async function POST(_req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();

  // 1. 테마 카테고리 + 항목 가져오기
  const { data: categories, error: catErr } = await supabase
    .from("growth_theme_categories")
    .select("id, name");
  if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });

  const { data: themeItems, error: itemErr } = await supabase
    .from("growth_theme_items")
    .select("id, category_id, name");
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 });

  // 카테고리명 → id 맵
  const catNameToId: Record<string, string> = {};
  for (const cat of categories ?? []) {
    catNameToId[(cat as Record<string, string>).name.trim()] = (cat as Record<string, string>).id;
  }

  // categoryId + itemName → itemId 맵
  const itemKey = (catId: string, name: string) => `${catId}::${name.trim()}`;
  const itemNameToId: Record<string, string> = {};
  for (const item of themeItems ?? []) {
    const row = item as Record<string, string>;
    itemNameToId[itemKey(row.category_id, row.name)] = row.id;
  }

  // 2. 모든 mandalart 셀 + todos 가져오기
  const { data: cells, error: cellErr } = await supabase
    .from("growth_mandalart_cells")
    .select("id, mandalart_id, text");
  if (cellErr) return NextResponse.json({ error: cellErr.message }, { status: 500 });

  // 카테고리 이름과 일치하는 셀만 필터
  const matchingCells = (cells ?? []).filter((c) => {
    const row = c as Record<string, string>;
    return row.text && catNameToId[row.text.trim()];
  });

  if (matchingCells.length === 0) {
    return NextResponse.json({ synced: 0, message: "매칭된 셀 없음" });
  }

  // 3. 해당 셀들의 mandalart_id → user_id 조회
  const mandalartIds = [...new Set(matchingCells.map((c) => (c as Record<string, string>).mandalart_id))];
  const { data: mandalarts } = await supabase
    .from("growth_mandalarts")
    .select("id, user_id")
    .in("id", mandalartIds);
  const mandalartToUser: Record<string, string> = {};
  for (const m of mandalarts ?? []) {
    const row = m as Record<string, string>;
    mandalartToUser[row.id] = row.user_id;
  }

  // 4. 각 매칭 셀의 완료된 todos 가져오기
  const cellIds = matchingCells.map((c) => (c as Record<string, string>).id);
  const { data: todos, error: todoErr } = await supabase
    .from("growth_mandalart_cell_todos")
    .select("cell_id, text, done")
    .in("cell_id", cellIds);
  if (todoErr) return NextResponse.json({ error: todoErr.message }, { status: 500 });

  // cell_id → { text, done }[] 맵
  const cellTodos: Record<string, Array<{ text: string; done: boolean }>> = {};
  for (const t of todos ?? []) {
    const row = t as Record<string, string | boolean>;
    const cellId = row.cell_id as string;
    if (!cellTodos[cellId]) cellTodos[cellId] = [];
    cellTodos[cellId].push({ text: (row.text as string).trim(), done: row.done as boolean });
  }

  // 5. completions upsert
  let synced = 0;
  const toInsert: Array<{ item_id: string; user_id: string }> = [];

  for (const cell of matchingCells) {
    const row = cell as Record<string, string>;
    const catId = catNameToId[row.text.trim()];
    const userId = mandalartToUser[row.mandalart_id];
    if (!catId || !userId) continue;

    const doneTodos = (cellTodos[row.id] ?? []).filter((t) => t.done);
    for (const todo of doneTodos) {
      const itemId = itemNameToId[itemKey(catId, todo.text)];
      if (!itemId) continue;
      toInsert.push({ item_id: itemId, user_id: userId });
    }
  }

  if (toInsert.length > 0) {
    const { error: upsertErr } = await supabase
      .from("growth_theme_completions")
      .upsert(toInsert, { onConflict: "item_id,user_id" });
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    synced = toInsert.length;
  }

  return NextResponse.json({ synced, message: `${synced}개 달성 기록 동기화 완료` });
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type ThemeCompletionFromMandalart = {
  item_id: string;
  user_id: string;
};

/** 만다라트 셀·todo 현재 상태에서 테마 달성을 실시간 조회 */
export async function queryThemeCompletionsFromMandalart(
  supabase: SupabaseClient
): Promise<ThemeCompletionFromMandalart[]> {
  const { data: categories, error: catErr } = await supabase
    .from("growth_theme_categories")
    .select("id, name");
  if (catErr || !categories?.length) return [];

  const { data: themeItems, error: itemErr } = await supabase
    .from("growth_theme_items")
    .select("id, category_id, name");
  if (itemErr || !themeItems?.length) return [];

  const catNameToId: Record<string, string> = {};
  for (const cat of categories) {
    catNameToId[(cat as { name: string }).name.trim()] = (cat as { id: string }).id;
  }

  const itemKey = (catId: string, name: string) => `${catId}::${name.trim()}`;
  const itemNameToId: Record<string, string> = {};
  for (const item of themeItems) {
    const row = item as { id: string; category_id: string; name: string };
    itemNameToId[itemKey(row.category_id, row.name)] = row.id;
  }

  const { data: cells, error: cellErr } = await supabase
    .from("growth_mandalart_cells")
    .select("id, mandalart_id, text");
  if (cellErr || !cells?.length) return [];

  const matchingCells = cells.filter((c) => {
    const text = (c as { text: string }).text;
    return text && catNameToId[text.trim()];
  });
  if (matchingCells.length === 0) return [];

  const mandalartIds = [...new Set(matchingCells.map((c) => (c as { mandalart_id: string }).mandalart_id))];
  const { data: mandalarts } = await supabase
    .from("growth_mandalarts")
    .select("id, user_id")
    .in("id", mandalartIds);

  const mandalartToUser: Record<string, string> = {};
  for (const m of mandalarts ?? []) {
    const row = m as { id: string; user_id: string };
    mandalartToUser[row.id] = row.user_id;
  }

  const cellIds = matchingCells.map((c) => (c as { id: string }).id);
  const { data: todos, error: todoErr } = await supabase
    .from("growth_mandalart_cell_todos")
    .select("cell_id, text, done")
    .in("cell_id", cellIds);
  if (todoErr) return [];

  const cellTodos: Record<string, Array<{ text: string; done: boolean }>> = {};
  for (const t of todos ?? []) {
    const row = t as { cell_id: string; text: string; done: boolean };
    if (!cellTodos[row.cell_id]) cellTodos[row.cell_id] = [];
    cellTodos[row.cell_id].push({ text: row.text.trim(), done: row.done });
  }

  const results: ThemeCompletionFromMandalart[] = [];
  const seen = new Set<string>();

  for (const cell of matchingCells) {
    const row = cell as { id: string; mandalart_id: string; text: string };
    const catId = catNameToId[row.text.trim()];
    const userId = mandalartToUser[row.mandalart_id];
    if (!catId || !userId) continue;

    for (const todo of cellTodos[row.id] ?? []) {
      if (!todo.done) continue;
      const itemId = itemNameToId[itemKey(catId, todo.text)];
      if (!itemId) continue;
      const dedupeKey = `${itemId}::${userId}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      results.push({ item_id: itemId, user_id: userId });
    }
  }

  return results;
}

/**
 * 학점 등 항목 카탈로그가 없는 테마용:
 * 만다라트 셀 텍스트가 카테고리명과 같고,
 * (셀 done=true) 또는 (할 일이 1개 이상이며 전부 완료) 인 사용자 조회
 */
export async function queryCategoryCellDoneFromMandalart(
  supabase: SupabaseClient,
  categoryId: string,
  categoryName: string
): Promise<string[]> {
  const name = categoryName.trim();
  if (!name) return [];

  type CellRow = { id: string; mandalart_id: string; text: string | null; done?: boolean | null };
  let cells: CellRow[] = [];

  const withDone = await supabase
    .from("growth_mandalart_cells")
    .select("id, mandalart_id, text, done");
  if (!withDone.error) {
    cells = (withDone.data ?? []) as CellRow[];
  } else {
    const withoutDone = await supabase
      .from("growth_mandalart_cells")
      .select("id, mandalart_id, text");
    if (withoutDone.error || !withoutDone.data?.length) return [];
    cells = (withoutDone.data ?? []).map((c) => ({
      ...(c as { id: string; mandalart_id: string; text: string | null }),
      done: null,
    }));
  }
  if (cells.length === 0) return [];

  const matching = cells.filter((c) => c.text?.trim() === name);
  if (matching.length === 0) return [];

  const cellIds = matching.map((c) => c.id);
  const { data: todos } = await supabase
    .from("growth_mandalart_cell_todos")
    .select("cell_id, done")
    .in("cell_id", cellIds);

  const todosByCell: Record<string, boolean[]> = {};
  for (const t of todos ?? []) {
    const row = t as { cell_id: string; done: boolean };
    if (!todosByCell[row.cell_id]) todosByCell[row.cell_id] = [];
    todosByCell[row.cell_id].push(!!row.done);
  }

  const achievedMandalartIds = new Set<string>();
  for (const cell of matching) {
    const cellTodos = todosByCell[cell.id] ?? [];
    const allTodosDone = cellTodos.length > 0 && cellTodos.every(Boolean);
    if (cell.done || allTodosDone) {
      achievedMandalartIds.add(cell.mandalart_id);
    }
  }
  if (achievedMandalartIds.size === 0) return [];

  const { data: mandalarts } = await supabase
    .from("growth_mandalarts")
    .select("id, user_id")
    .in("id", [...achievedMandalartIds]);

  const userIds = new Set<string>();
  for (const m of mandalarts ?? []) {
    const row = m as { id: string; user_id: string };
    userIds.add(row.user_id);
  }

  void categoryId;
  return [...userIds];
}

export function buildCompletionMap(
  completions: ThemeCompletionFromMandalart[]
): Record<string, Set<string>> {
  const map: Record<string, Set<string>> = {};
  for (const { item_id, user_id } of completions) {
    if (!map[item_id]) map[item_id] = new Set();
    map[item_id].add(user_id);
  }
  return map;
}

export function isCreditThemeName(name: string | null | undefined): boolean {
  return !!name && name.includes("학점");
}

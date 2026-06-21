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

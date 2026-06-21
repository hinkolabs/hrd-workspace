import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";
import { queryThemeCompletionsFromMandalart } from "@/lib/theme-completions-query";

type Ctx = { params: Promise<{ categoryId: string }> };

// GET /api/growth/themes/[categoryId]/completions
// Returns ranking for this category (derived from live mandalart data)
export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  const { categoryId } = await ctx.params;

  const supabase = createServerClient();

  const { data: items } = await supabase
    .from("growth_theme_items")
    .select("id")
    .eq("category_id", categoryId);

  const itemIds = (items ?? []).map((i: Record<string, string>) => i.id);
  if (itemIds.length === 0) return NextResponse.json([]);

  const itemIdSet = new Set(itemIds);
  const liveCompletions = await queryThemeCompletionsFromMandalart(supabase);
  const categoryCompletions = liveCompletions.filter((c) => itemIdSet.has(c.item_id));

  const { data: members } = await supabase
    .from("users")
    .select("id, display_name");

  const memberLookup: Record<string, string> = {};
  for (const m of members ?? []) {
    const row = m as Record<string, string>;
    memberLookup[row.id] = row.display_name ?? "unknown";
  }

  const userMap: Record<string, { display_name: string; dept: string | null; item_ids: string[] }> = {};

  for (const { item_id, user_id } of categoryCompletions) {
    if (!userMap[user_id]) {
      userMap[user_id] = {
        display_name: memberLookup[user_id] ?? "unknown",
        dept: null,
        item_ids: [],
      };
    }
    if (!userMap[user_id].item_ids.includes(item_id)) {
      userMap[user_id].item_ids.push(item_id);
    }
  }

  const ranking = Object.entries(userMap)
    .map(([user_id, info]) => ({
      user_id,
      display_name: info.display_name,
      dept: info.dept,
      completion_count: info.item_ids.length,
      total_items: itemIds.length,
      completed_items: info.item_ids,
    }))
    .sort((a, b) => b.completion_count - a.completion_count);

  return NextResponse.json(ranking);
}

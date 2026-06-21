import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

type Ctx = { params: Promise<{ categoryId: string }> };

// POST /api/growth/themes/[categoryId]/completions
// Body: { item_id, cohort_id, action: "complete" | "uncomplete" }
export async function POST(req: Request, _ctx: Ctx) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = await req.json();
  const { item_id, action } = body as {
    item_id: string;
    action: "complete" | "uncomplete";
  };

  if (!item_id) return NextResponse.json({ error: "item_id 필요" }, { status: 400 });

  const supabase = createServerClient();

  if (action === "uncomplete") {
    const { error } = await supabase
      .from("growth_theme_completions")
      .delete()
      .eq("item_id", item_id)
      .eq("user_id", session.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, completed: false });
  }

  // upsert — ignore if already exists
  const { error } = await supabase
    .from("growth_theme_completions")
    .upsert(
      { item_id, user_id: session.userId },
      { onConflict: "item_id,user_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, completed: true });
}

// GET /api/growth/themes/[categoryId]/completions
// Returns ranking for this category
export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  const { categoryId } = await ctx.params;

  const supabase = createServerClient();

  // Get items for this category
  const { data: items } = await supabase
    .from("growth_theme_items")
    .select("id")
    .eq("category_id", categoryId);

  const itemIds = (items ?? []).map((i: Record<string, string>) => i.id);
  if (itemIds.length === 0) return NextResponse.json([]);

  // Get all completions for these items
  const { data: completions } = await supabase
    .from("growth_theme_completions")
    .select("item_id, user_id, completed_at")
    .in("item_id", itemIds);

  // Get all users with display names
  const { data: members } = await supabase
    .from("users")
    .select("id, display_name");

  // Build rank map — pre-populate from all users who have completions
  const userMap: Record<string, { display_name: string; dept: string | null; item_ids: string[]; latest: string }> = {};
  const memberLookup: Record<string, string> = {};
  for (const m of members ?? []) {
    const row = m as Record<string, string>;
    memberLookup[row.id] = row.display_name ?? "unknown";
  }

  for (const c of completions ?? []) {
    const row = c as Record<string, string>;
    if (!userMap[row.user_id]) {
      userMap[row.user_id] = {
        display_name: memberLookup[row.user_id] ?? "unknown",
        dept: null,
        item_ids: [],
        latest: "",
      };
    }
  }

  for (const c of completions ?? []) {
    const row = c as Record<string, string>;
    if (!userMap[row.user_id]) continue;
    userMap[row.user_id].item_ids.push(row.item_id);
    if (!userMap[row.user_id].latest || row.completed_at > userMap[row.user_id].latest) {
      userMap[row.user_id].latest = row.completed_at;
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
    .sort((a, b) => {
      if (b.completion_count !== a.completion_count) return b.completion_count - a.completion_count;
      // tie-break: earlier latest completion
      const la = userMap[a.user_id].latest;
      const lb = userMap[b.user_id].latest;
      return la < lb ? -1 : la > lb ? 1 : 0;
    });

  return NextResponse.json(ranking);
}

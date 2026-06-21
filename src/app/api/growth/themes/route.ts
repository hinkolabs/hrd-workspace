import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// GET /api/growth/themes
// Returns theme categories with items and per-item completion stats
export async function GET(_req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();

  const { data: categories, error: catError } = await supabase
    .from("growth_theme_categories")
    .select("*")
    .order("order_idx", { ascending: true });
  if (catError) return NextResponse.json({ error: catError.message }, { status: 500 });
  if (!categories || categories.length === 0) return NextResponse.json([]);

  const categoryIds = categories.map((c: Record<string, unknown>) => c.id as string);

  const { data: items, error: itemError } = await supabase
    .from("growth_theme_items")
    .select("*")
    .in("category_id", categoryIds)
    .order("order_idx", { ascending: true });
  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });

  const itemIds = (items ?? []).map((i: Record<string, unknown>) => i.id as string);

  // Fetch all completions for these items
  const { data: completions } = itemIds.length > 0
    ? await supabase
        .from("growth_theme_completions")
        .select("item_id, user_id")
        .in("item_id", itemIds)
    : { data: [] };

  // Total user count as denominator
  const { count: memberCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });
  const totalMembers = memberCount ?? 0;

  // Build completion map: item_id -> set of user_ids
  const completionMap: Record<string, Set<string>> = {};
  for (const c of completions ?? []) {
    const row = c as Record<string, string>;
    if (!completionMap[row.item_id]) completionMap[row.item_id] = new Set();
    completionMap[row.item_id].add(row.user_id);
  }

  // Assemble result
  const result = categories.map((cat: Record<string, unknown>) => {
    const catItems = (items ?? [])
      .filter((i: Record<string, unknown>) => i.category_id === cat.id)
      .map((item: Record<string, unknown>) => {
        const completedSet = completionMap[item.id as string] ?? new Set<string>();
        return {
          ...item,
          completed_count: completedSet.size,
          total_members: totalMembers,
          is_completed_by_me: completedSet.has(session.userId),
        };
      });

    const myCount = catItems.filter((i) => i.is_completed_by_me).length;
    return { ...cat, items: catItems, my_completion_count: myCount };
  });

  return NextResponse.json(result);
}

// POST /api/growth/themes — admin: create a new category
export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const { name, description, icon_emoji, order_idx } = body;
  if (!name) return NextResponse.json({ error: "이름 필요" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_theme_categories")
    .insert({ name, description: description ?? null, icon_emoji: icon_emoji ?? "🏆", order_idx: order_idx ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

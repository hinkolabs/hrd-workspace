import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

type Ctx = { params: Promise<{ categoryId: string }> };

// GET /api/growth/themes/[categoryId]/items
export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  const { categoryId } = await ctx.params;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_theme_items")
    .select("*")
    .eq("category_id", categoryId)
    .order("order_idx", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/growth/themes/[categoryId]/items — admin: add item
export async function POST(req: Request, ctx: Ctx) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const { categoryId } = await ctx.params;

  const body = await req.json();
  const { name, description, order_idx } = body;
  if (!name) return NextResponse.json({ error: "이름 필요" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_theme_items")
    .insert({ category_id: categoryId, name, description: description ?? null, order_idx: order_idx ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** 테마 셀에 남아 있는 담당자 등록 todo를 이름으로 정리 */
async function scrubThemeTodos(
  supabase: ReturnType<typeof createServerClient>,
  categoryName: string,
  itemNames: string[],
) {
  if (!categoryName || itemNames.length === 0) return;

  const { data: cells } = await supabase
    .from("growth_mandalart_cells")
    .select("id")
    .eq("text", categoryName);
  if (!cells?.length) return;

  const cellIds = cells.map((c) => c.id as string);
  await supabase
    .from("growth_mandalart_cell_todos")
    .delete()
    .in("cell_id", cellIds)
    .in("text", itemNames);
}

// DELETE /api/growth/themes/[categoryId]/items?item_id=... — admin: remove item
// DELETE /api/growth/themes/[categoryId]/items?category=true — admin: remove entire category
export async function DELETE(req: Request, ctx: Ctx) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const { categoryId } = await ctx.params;

  const { searchParams } = new URL(req.url);
  const isCategory = searchParams.get("category") === "true";

  const supabase = createServerClient();

  const { data: category } = await supabase
    .from("growth_theme_categories")
    .select("id, name")
    .eq("id", categoryId)
    .single();

  if (isCategory) {
    const { data: items } = await supabase
      .from("growth_theme_items")
      .select("name")
      .eq("category_id", categoryId);
    const itemNames = (items ?? []).map((i) => i.name as string);
    if (category?.name) await scrubThemeTodos(supabase, category.name, itemNames);

    const { error } = await supabase.from("growth_theme_categories").delete().eq("id", categoryId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const itemId = searchParams.get("item_id");
  if (!itemId) return NextResponse.json({ error: "item_id 필요" }, { status: 400 });

  const { data: item } = await supabase
    .from("growth_theme_items")
    .select("id, name")
    .eq("id", itemId)
    .eq("category_id", categoryId)
    .single();

  if (category?.name && item?.name) {
    await scrubThemeTodos(supabase, category.name, [item.name]);
  }

  const { error } = await supabase.from("growth_theme_items").delete().eq("id", itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH /api/growth/themes/[categoryId]/items — admin: update category or item
export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const { categoryId } = await ctx.params;

  const body = await req.json();
  const normalizeDesc = (v: unknown) =>
    typeof v === "string" ? (v.trim() || null) : v === null ? null : undefined;

  // Update category itself
  if (body.target === "category") {
    const supabase = createServerClient();
    const { name, icon_emoji, order_idx } = body;
    const updates: Record<string, unknown> = {};
    if (typeof name === "string") updates.name = name.trim();
    if ("description" in body) updates.description = normalizeDesc(body.description);
    if (typeof icon_emoji === "string") updates.icon_emoji = icon_emoji;
    if (order_idx !== undefined) updates.order_idx = order_idx;

    const { data, error } = await supabase
      .from("growth_theme_categories")
      .update(updates)
      .eq("id", categoryId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Update a specific item
  const { item_id, name, order_idx, is_required } = body;
  if (!item_id) return NextResponse.json({ error: "item_id 필요" }, { status: 400 });
  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};
  if (typeof name === "string") updates.name = name.trim();
  if ("description" in body) updates.description = normalizeDesc(body.description);
  if (order_idx !== undefined) updates.order_idx = order_idx;
  if (is_required !== undefined) updates.is_required = is_required;

  const { data, error } = await supabase
    .from("growth_theme_items")
    .update(updates)
    .eq("id", item_id)
    .eq("category_id", categoryId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

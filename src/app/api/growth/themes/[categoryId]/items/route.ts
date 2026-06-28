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

  if (isCategory) {
    const { error } = await supabase.from("growth_theme_categories").delete().eq("id", categoryId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const itemId = searchParams.get("item_id");
  if (!itemId) return NextResponse.json({ error: "item_id 필요" }, { status: 400 });

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
  // Update category itself
  if (body.target === "category") {
    const supabase = createServerClient();
    const { name, description, icon_emoji, order_idx } = body;
    const { data, error } = await supabase
      .from("growth_theme_categories")
      .update({ name, description, icon_emoji, order_idx })
      .eq("id", categoryId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Update a specific item
  const { item_id, name, description, order_idx, is_required } = body;
  if (!item_id) return NextResponse.json({ error: "item_id 필요" }, { status: 400 });
  const supabase = createServerClient();
  const updates: Record<string, unknown> = { name, description, order_idx };
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

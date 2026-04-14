import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("promo_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = createServerClient();
  const body = await req.json();
  const { title, slug, type, description, theme_color, cover_emoji } = body;

  if (!title || !slug || !type) {
    return NextResponse.json({ error: "title, slug, type 필수" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("promo_campaigns")
    .insert({
      title,
      slug,
      type,
      description: description ?? null,
      theme_color: theme_color ?? "#4F46E5",
      cover_emoji: cover_emoji ?? "✨",
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

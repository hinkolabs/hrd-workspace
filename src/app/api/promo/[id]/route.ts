import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const supabase = createServerClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("promo_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: Request, { params }: Params) {
  const supabase = createServerClient();
  const { id } = await params;
  const body = await req.json();

  const allowed = [
    "title", "slug", "type", "status", "description",
    "cta_text", "cta_url", "cta_description",
    "og_title", "og_description", "og_image_url",
    "theme_color", "cover_emoji", "cover_image_url",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from("promo_campaigns")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Params) {
  const supabase = createServerClient();
  const { id } = await params;

  const { error } = await supabase.from("promo_campaigns").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

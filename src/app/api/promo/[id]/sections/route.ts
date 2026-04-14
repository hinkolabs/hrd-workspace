import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const supabase = createServerClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("promo_info_sections")
    .select("*")
    .eq("campaign_id", id)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: Params) {
  const supabase = createServerClient();
  const { id } = await params;
  const body = await req.json();

  if (Array.isArray(body)) {
    await supabase.from("promo_info_sections").delete().eq("campaign_id", id);
    if (body.length === 0) return NextResponse.json([]);

    const rows = body.map((s, i) => ({
      campaign_id: id,
      sort_order: s.sort_order ?? i,
      title: s.title,
      content: s.content ?? null,
      image_url: s.image_url ?? null,
      icon: s.icon ?? null,
    }));

    const { data, error } = await supabase
      .from("promo_info_sections")
      .insert(rows)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { title, content, image_url, icon, sort_order } = body;
  const { data, error } = await supabase
    .from("promo_info_sections")
    .insert({ campaign_id: id, title, content, image_url, icon, sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

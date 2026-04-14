import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const supabase = createServerClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("promo_quiz_results")
    .select("*")
    .eq("campaign_id", id)
    .order("result_key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: Params) {
  const supabase = createServerClient();
  const { id } = await params;
  const body = await req.json();

  if (Array.isArray(body)) {
    await supabase.from("promo_quiz_results").delete().eq("campaign_id", id);
    if (body.length === 0) return NextResponse.json([]);

    const rows = body.map((r) => ({
      campaign_id: id,
      result_key: r.result_key,
      result_emoji: r.result_emoji ?? null,
      title: r.title,
      description: r.description ?? null,
      image_url: r.image_url ?? null,
    }));

    const { data, error } = await supabase
      .from("promo_quiz_results")
      .insert(rows)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { result_key, result_emoji, title, description, image_url } = body;
  const { data, error } = await supabase
    .from("promo_quiz_results")
    .insert({ campaign_id: id, result_key, result_emoji, title, description, image_url })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

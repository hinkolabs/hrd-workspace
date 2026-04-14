import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const supabase = createServerClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("promo_quiz_questions")
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

  // bulk upsert: [{question_text, question_emoji, sort_order, options}]
  if (Array.isArray(body)) {
    await supabase.from("promo_quiz_questions").delete().eq("campaign_id", id);
    if (body.length === 0) return NextResponse.json([]);

    const rows = body.map((q, i) => ({
      campaign_id: id,
      question_text: q.question_text,
      question_emoji: q.question_emoji ?? null,
      sort_order: q.sort_order ?? i,
      options: q.options ?? [],
    }));

    const { data, error } = await supabase
      .from("promo_quiz_questions")
      .insert(rows)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { question_text, question_emoji, sort_order, options } = body;
  const { data, error } = await supabase
    .from("promo_quiz_questions")
    .insert({ campaign_id: id, question_text, question_emoji, sort_order: sort_order ?? 0, options: options ?? [] })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

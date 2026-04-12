import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/tools/ice/[id] — 세션 상세 (질문 포함)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: session, error } = await supabase
    .from("ice_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !session)
    return NextResponse.json({ error: "세션을 찾을 수 없습니다" }, { status: 404 });

  const { data: questions } = await supabase
    .from("ice_survey_questions")
    .select("*")
    .eq("session_id", id)
    .order("sort_order");

  const { count: response_count } = await supabase
    .from("ice_responses")
    .select("*", { count: "exact", head: true })
    .eq("session_id", id);

  return NextResponse.json({ session, questions: questions ?? [], response_count: response_count ?? 0 });
}

// PUT /api/tools/ice/[id] — 세션 상태/정보 수정
export async function PUT(req: NextRequest, { params }: Params) {
  const authSession = await getSessionFromCookies();
  if (!authSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("ice_sessions")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

// DELETE /api/tools/ice/[id] — 세션 삭제
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authSession = await getSessionFromCookies();
  if (!authSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase.from("ice_sessions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

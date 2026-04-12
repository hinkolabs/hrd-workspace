import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/tools/ice/[id]/scores — 채점 목록
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: scores, error } = await supabase
    .from("ice_scores")
    .select("*")
    .eq("session_id", id)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scores: scores ?? [] });
}

// POST /api/tools/ice/[id]/scores — 채점 결과 일괄 저장 (기존 삭제 후 재삽입)
export async function POST(req: NextRequest, { params }: Params) {
  const authSession = await getSessionFromCookies();
  if (!authSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { scores } = body; // Array of { pain_point, source_response_id?, impact, confidence, ease, note }

  if (!Array.isArray(scores) || scores.length === 0)
    return NextResponse.json({ error: "채점 데이터가 없습니다" }, { status: 400 });

  const supabase = createServerClient();

  // 기존 채점 삭제 후 재삽입
  await supabase.from("ice_scores").delete().eq("session_id", id);

  const rows = scores.map((s: {
    pain_point: string;
    source_response_id?: string;
    impact: number;
    confidence: number;
    ease: number;
    note?: string;
  }) => ({
    session_id: id,
    pain_point: s.pain_point,
    source_response_id: s.source_response_id || null,
    impact: s.impact,
    confidence: s.confidence,
    ease: s.ease,
    note: s.note || null,
    scored_by: authSession.displayName,
  }));

  const { error: insertError } = await supabase.from("ice_scores").insert(rows);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // 세션 상태를 completed로
  await supabase
    .from("ice_sessions")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true }, { status: 201 });
}

// PUT /api/tools/ice/[id]/scores — 단일 채점 항목 수정
export async function PUT(req: NextRequest, { params }: Params) {
  const authSession = await getSessionFromCookies();
  if (!authSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { score_id, impact, confidence, ease, note } = body;

  if (!score_id) return NextResponse.json({ error: "score_id가 필요합니다" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ice_scores")
    .update({ impact, confidence, ease, note })
    .eq("id", score_id)
    .eq("session_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ score: data });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/tools/ice/[id]/responses — 응답 목록 (관리자)
export async function GET(_req: NextRequest, { params }: Params) {
  const authSession = await getSessionFromCookies();
  if (!authSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data: responses, error } = await supabase
    .from("ice_responses")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ responses: responses ?? [] });
}

// POST /api/tools/ice/[id]/responses — 설문 응답 제출 (공개, 인증 불필요)
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { respondent_name, respondent_dept, answers } = body;

  if (!respondent_name) return NextResponse.json({ error: "이름을 입력해주세요" }, { status: 400 });
  if (!answers || typeof answers !== "object")
    return NextResponse.json({ error: "응답 데이터가 올바르지 않습니다" }, { status: 400 });

  const supabase = createServerClient();

  // 세션 존재 확인
  const { data: session } = await supabase
    .from("ice_sessions")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!session) return NextResponse.json({ error: "설문을 찾을 수 없습니다" }, { status: 404 });
  if (session.status === "completed")
    return NextResponse.json({ error: "이미 마감된 설문입니다" }, { status: 400 });

  const { data: response, error } = await supabase
    .from("ice_responses")
    .insert({
      session_id: id,
      respondent_name,
      respondent_dept: respondent_dept || null,
      answers,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ response }, { status: 201 });
}

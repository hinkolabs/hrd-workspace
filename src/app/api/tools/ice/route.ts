import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// GET /api/tools/ice — 세션 목록
export async function GET() {
  const supabase = createServerClient();
  const { data: sessions, error } = await supabase
    .from("ice_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 각 세션에 응답 수 포함
  const withCounts = await Promise.all(
    (sessions ?? []).map(async (s) => {
      const { count } = await supabase
        .from("ice_responses")
        .select("*", { count: "exact", head: true })
        .eq("session_id", s.id);
      return { ...s, response_count: count ?? 0 };
    })
  );

  return NextResponse.json({ sessions: withCounts });
}

// POST /api/tools/ice — 새 세션 생성
export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, survey_intro, questions } = body;

  if (!title) return NextResponse.json({ error: "제목을 입력해주세요" }, { status: 400 });

  const supabase = createServerClient();

  const { data: newSession, error: sessionError } = await supabase
    .from("ice_sessions")
    .insert({
      title,
      description: description || null,
      survey_intro: survey_intro || null,
      status: "collecting",
      created_by: session.displayName,
    })
    .select()
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  if (questions && questions.length > 0) {
    const qRows = questions.map((q: { question_text: string; question_type: string; options?: string[]; required?: boolean }, i: number) => ({
      session_id: newSession.id,
      question_text: q.question_text,
      question_type: q.question_type || "textarea",
      options: q.options ? JSON.stringify(q.options) : null,
      sort_order: i,
      required: q.required !== false,
    }));
    const { error: qError } = await supabase.from("ice_survey_questions").insert(qRows);
    if (qError) return NextResponse.json({ error: qError.message }, { status: 500 });
  }

  return NextResponse.json({ session: newSession }, { status: 201 });
}

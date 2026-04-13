import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";
import { ALL_SCENARIOS_FOR_ICE } from "@/lib/training-scenarios";

export async function POST() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();

  const { data: newSession, error: sessionError } = await supabase
    .from("ice_sessions")
    .insert({
      title: "하나증권 ALLI.AI 도입 시나리오 ICE 평가",
      description:
        "올거나이즈 ALLI.AI 도입을 위한 부서별 업무 시나리오에 대해 Impact(영향력), Confidence(확신도), Ease(용이성) 기준으로 우선순위를 평가합니다.",
      survey_intro:
        "안녕하세요. 하나증권 AX(AI 전환) 프로젝트의 일환으로 ALLI.AI 도입 우선순위를 선정하기 위한 ICE 평가입니다.\n\n각 시나리오에 대해 Impact(영향력 1~10), Confidence(확신도 1~10), Ease(용이성 1~10) 점수를 매겨주세요.\n응답 시간은 약 5~10분입니다.",
      status: "collecting",
      created_by: session.displayName,
    })
    .select()
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  const questions = ALL_SCENARIOS_FOR_ICE.map((s, i) => ({
    session_id: newSession.id,
    question_text: `[${s.department}] ${s.title}\n앱 타입: ${s.alli_app_type}\n\n이 시나리오에 대한 의견과 우선순위를 자유롭게 적어주세요.`,
    question_type: "textarea" as const,
    options: null,
    sort_order: i,
    required: true,
  }));

  const { error: qError } = await supabase
    .from("ice_survey_questions")
    .insert(questions);

  if (qError) return NextResponse.json({ error: qError.message }, { status: 500 });

  const scores = ALL_SCENARIOS_FOR_ICE.map((s) => ({
    session_id: newSession.id,
    pain_point: s.title,
    impact: s.ice_impact,
    confidence: s.ice_confidence,
    ease: s.ice_ease,
    note: `부서: ${s.department} | 앱 타입: ${s.alli_app_type}`,
    scored_by: "HRD 기획팀",
  }));

  const { error: sError } = await supabase.from("ice_scores").insert(scores);
  if (sError) return NextResponse.json({ error: sError.message }, { status: 500 });

  return NextResponse.json({ session: newSession, scenarioCount: ALL_SCENARIOS_FOR_ICE.length }, { status: 201 });
}

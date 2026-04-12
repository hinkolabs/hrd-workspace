import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, title, period, report_type, stats, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

const REPORT_TYPE_PROMPTS: Record<string, { label: string; system: string }> = {
  weekly_work: {
    label: "주간 업무 보고서",
    system: `당신은 한국 공공기관 인재개발실의 업무 보고서 작성 도우미입니다.
아래 데이터를 바탕으로 주간 업무 보고서를 작성하세요.

형식:
1. 보고서 제목 (기간 포함)
2. 금주 주요 성과 (완료된 업무 요약)
3. 진행 현황 (진행중·대기 업무 상태)
4. 주요 공유사항 (메모 기반)
5. 차주 계획 및 건의사항

한국어 공문서 스타일로 간결하게. 마크다운 형식.`,
  },
  monthly_work: {
    label: "월간 업무 보고서",
    system: `당신은 한국 공공기관 인재개발실의 업무 보고서 작성 도우미입니다.
아래 데이터를 바탕으로 월간 업무 보고서를 작성하세요.

형식:
1. 보고서 제목 (기간 포함)
2. 월간 핵심 성과 요약
3. 업무별 추진 현황 및 결과
4. 미완료 업무 사유 및 차월 이월 계획
5. 주요 공유사항 및 이슈
6. 다음 달 주요 추진 계획

한국어 공문서 스타일로 체계적으로. 마크다운 형식.`,
  },
  performance: {
    label: "성과 분석 보고서",
    system: `당신은 한국 공공기관 인재개발실의 성과 분석 전문가입니다.
아래 데이터를 바탕으로 성과 분석 보고서를 작성하세요.

형식:
1. 분석 개요 (기간, 분석 대상)
2. 핵심 성과 지표 (KPI) — 완료율, 처리 건수 등 수치 중심
3. 업무 유형별 성과 분석
4. 강점 및 개선 필요 영역
5. 업무 효율화 제언
6. 종합 평가

데이터에 근거한 객관적 분석. 수치와 비율을 적극 활용. 마크다운 형식.`,
  },
  project_status: {
    label: "프로젝트 현황 보고서",
    system: `당신은 한국 공공기관 인재개발실의 프로젝트 관리 전문가입니다.
아래 데이터를 바탕으로 프로젝트 현황 보고서를 작성하세요.

형식:
1. 현황 보고 개요
2. 과제별 추진 현황 (완료/진행/대기 구분하여 상세 기술)
3. 이슈 및 리스크 현황
4. 주요 결정사항 및 공유사항 (메모 기반)
5. 향후 일정 및 조치 계획

업무 진행 상황을 명확히 파악할 수 있도록 구조화. 마크다운 형식.`,
  },
};

export async function POST(req: Request) {
  try {
    const { period, startDate, endDate, reportType = "weekly_work" } = await req.json();
    const supabase = createServerClient();

    const start = startDate || getDefaultStart(period);
    const end = endDate
      ? new Date(endDate + "T23:59:59").toISOString()
      : new Date().toISOString();

    const [{ data: todos }, { data: memos }] = await Promise.all([
      supabase.from("todos").select("*").gte("created_at", start).lte("created_at", end).order("created_at"),
      supabase.from("memos").select("*").gte("created_at", start).lte("created_at", end).order("created_at"),
    ]);

    const doneTodos = (todos || []).filter((t) => t.status === "done");
    const inProgressTodos = (todos || []).filter((t) => t.status === "in_progress");
    const pendingTodos = (todos || []).filter((t) => t.status === "pending");

    const startStr = start.split("T")[0];
    const endStr = end.split("T")[0];

    const dataContext = `
기간: ${startStr} ~ ${endStr}
완료율: ${(todos || []).length > 0 ? Math.round((doneTodos.length / (todos || []).length) * 100) : 0}%

[완료된 업무 (${doneTodos.length}건)]
${doneTodos.map((t) => `- [${t.priority || "medium"}] ${t.title}${t.description ? `: ${t.description}` : ""}`).join("\n") || "없음"}

[진행 중인 업무 (${inProgressTodos.length}건)]
${inProgressTodos.map((t) => `- [${t.priority || "medium"}] ${t.title}${t.description ? `: ${t.description}` : ""}${t.due_date ? ` (마감: ${t.due_date.split("T")[0]})` : ""}`).join("\n") || "없음"}

[대기 업무 (${pendingTodos.length}건)]
${pendingTodos.map((t) => `- [${t.priority || "medium"}] ${t.title}${t.description ? `: ${t.description}` : ""}${t.due_date ? ` (마감: ${t.due_date.split("T")[0]})` : ""}`).join("\n") || "없음"}

[공유 메모 (${(memos || []).length}건)]
${(memos || []).map((m) => `- ${m.title}${m.content ? `: ${m.content.slice(0, 150)}` : ""}`).join("\n") || "없음"}
`;

    const typeConfig = REPORT_TYPE_PROMPTS[reportType] || REPORT_TYPE_PROMPTS.weekly_work;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: typeConfig.system },
        { role: "user", content: dataContext },
      ],
      temperature: 0.4,
    });

    const reportContent = completion.choices[0].message.content || "";
    const stats = {
      totalTodos: (todos || []).length,
      done: doneTodos.length,
      inProgress: inProgressTodos.length,
      pending: pendingTodos.length,
      memos: (memos || []).length,
    };

    const dateLabel = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
    const title = `${typeConfig.label} (${dateLabel})`;

    // report_type 포함 저장 시도, 없으면 제외 재시도
    let saved = null;
    let saveErr = null;

    const r1 = await supabase
      .from("reports")
      .insert({ title, content: reportContent, period, report_type: reportType, stats })
      .select()
      .single();

    if (r1.error?.message?.includes("report_type")) {
      const r2 = await supabase
        .from("reports")
        .insert({ title, content: reportContent, period, stats })
        .select()
        .single();
      saved = r2.data;
      saveErr = r2.error;
    } else {
      saved = r1.data;
      saveErr = r1.error;
    }

    if (saveErr) console.error("보고서 저장 실패:", saveErr.message);

    return NextResponse.json({
      id: saved?.id,
      title,
      report: reportContent,
      report_type: reportType,
      stats,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "보고서 생성 실패" },
      { status: 500 }
    );
  }
}

function getDefaultStart(period: string): string {
  const d = new Date();
  const days: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30, quarterly: 90 };
  d.setDate(d.getDate() - (days[period] ?? 7));
  return d.toISOString();
}

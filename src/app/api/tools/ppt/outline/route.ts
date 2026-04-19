import { NextRequest, NextResponse } from "next/server";
import { chat, stripJsonFences } from "@/lib/llm-adapter";

export interface OutlineSlide {
  title: string;
  /** Key point bullets (3~6 items, 25-60 chars each) */
  keyPoints: string[];
  /** Optional short sub-heading to prevent info loss in outline→body expansion */
  subtitle?: string;
  /** Narrative context/intent for this slide (1-2 sentences) — feeds into body gen */
  narrative?: string;
  /** Suggested concrete data points (numbers, dates, names) if available */
  datapoints?: string[];
  layout:
    | "title" | "content" | "two_column" | "table" | "section" | "closing"
    | "agenda" | "grid" | "process" | "timeline" | "comparison"
    | "stats" | "quote" | "pyramid" | "swot" | "highlight"
    | "chart_bar" | "chart_pie" | "chart_line";
}

export interface OutlineResult {
  presentationTitle: string;
  slides: OutlineSlide[];
}

const PPT_TYPE_LABELS: Record<string, string> = {
  education: "교육/강의 자료",
  report: "보고서/분석 발표",
  proposal: "제안서/기획서",
  general: "범용 프레젠테이션",
};

export async function POST(req: NextRequest) {
  try {
    const { topic, pptType, slideCount, provider, model } = await req.json();
    const llmProvider = (provider === "openai" || provider === "claude")
      ? provider as "openai" | "claude" : "auto";
    const llmModel = typeof model === "string" ? model : undefined;

    if (!topic || !pptType) {
      return NextResponse.json({ error: "주제와 PPT 타입은 필수입니다." }, { status: 400 });
    }

    const targetCount = Math.min(Math.max(Number(slideCount) || 10, 5), 20);
    const typeLabel = PPT_TYPE_LABELS[pptType] ?? "범용 프레젠테이션";

    const systemPrompt = `당신은 맥킨지/BCG 수준의 프레젠테이션 기획 전문가입니다.
사용자 주제로 ${typeLabel} 형식의 **풍부하고 구체적인** PPT 아웃라인을 작성합니다.
반드시 JSON 형식으로만 응답하고, 마크다운 코드 블록 없이 순수 JSON만 반환하세요.`;

    const userPrompt = `주제: ${topic}
PPT 유형: ${typeLabel}
요청 슬라이드 수: ${targetCount}장

다음 JSON 스키마로 아웃라인을 생성해주세요:
{
  "presentationTitle": "프레젠테이션 전체 제목",
  "slides": [
    {
      "title": "슬라이드 제목 (8-20자)",
      "subtitle": "부제 (선택, 10-30자)",
      "narrative": "이 슬라이드가 전달할 핵심 메시지와 논점 (1-2문장)",
      "keyPoints": ["구체적 핵심 포인트 1 (25-60자)", "...", "..."],
      "datapoints": ["구체적 수치/날짜/고유명사 (선택)"],
      "layout": "아래 19종 중 하나"
    }
  ]
}

## 품질 규칙 (필수)
- keyPoints는 각 슬라이드 **3~6개**, 각 25~60자로 구체적으로 작성 (2개 이하 금지)
- 추상 표현 지양: "성장 전략" X → "비은행 포트폴리오 비중 30%→45% 확대" O
- narrative는 "왜 이 슬라이드가 필요한가"를 명확히 서술
- datapoints는 가능한 경우 구체적 숫자/비율/날짜/고유명사로 채우기
- content layout 사용 비율 25% 이하 — 다양한 레이아웃 적극 활용

## 레이아웃 19종 선택 기준
- "title"      : 첫 번째 표지 슬라이드에만
- "closing"    : 마지막 마무리 슬라이드에만
- "section"    : 챕터 전환·섹션 구분
- "agenda"     : 목차/아젠다 (번호+항목 나열, 로마숫자 권장)
- "content"    : 일반 내용 (3~6개 bullets) - 전체의 25% 이하
- "two_column" : 두 가지 나열 비교
- "comparison" : AS-IS/TO-BE 또는 A안/B안 강조 비교
- "table"      : 행/열 데이터 표
- "process"    : 단계·절차 흐름 (3~5단계)
- "timeline"   : 연도·시점 로드맵 (3~5 시점)
- "stats"      : 단일 KPI 카드 (3~4개 수치)
- "chart_bar"  : 3개 이상 수치 비교 (실제 막대 차트)
- "chart_pie"  : 비율·구성 (실제 파이 차트)
- "chart_line" : 시계열·추이 (실제 라인 차트)
- "grid"       : 3~6개 특징·기능 카드 나열
- "quote"      : 인용구·비전·슬로건
- "pyramid"    : 계층·우선순위 구조
- "swot"       : 강점/약점/기회/위협 분석
- "highlight"  : 핵심 메시지 하나를 임팩트 있게

반드시 첫 슬라이드="title", 마지막="closing".
숫자·비율이 3개 이상이면 chart_bar/chart_pie/chart_line 우선.`;

    const response = await chat({
      provider: llmProvider,
      model: llmModel,
      messages: [
        { role: "system", content: systemPrompt + "\n\n응답은 반드시 `{ \"presentationTitle\": ..., \"slides\": [...] }` JSON 객체 하나여야 합니다. 마크다운 코드펜스 금지." },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      maxTokens: 8192,
    });

    const content = response.text;
    if (!content) {
      return NextResponse.json({ error: "AI 응답이 비어있습니다." }, { status: 500 });
    }

    console.log(`[ppt/outline] ${response.provider}/${response.model} in=${response.usage?.inputTokens} out=${response.usage?.outputTokens}`);
    const outline: OutlineResult = JSON.parse(stripJsonFences(content));
    return NextResponse.json(outline);
  } catch (err) {
    console.error("[ppt/outline]", err);
    return NextResponse.json({ error: "아웃라인 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

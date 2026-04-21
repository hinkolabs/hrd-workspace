import { NextRequest, NextResponse } from "next/server";
import { chat, stripJsonFences } from "@/lib/llm-adapter";
import type { DeckOutline } from "@/lib/deck/types";

const SYSTEM_PROMPT = `당신은 문서를 분석해 프레젠테이션 아웃라인으로 변환하는 전문가입니다.
입력된 내용을 읽고 아래 JSON 형식의 DeckOutline을 반환하세요.

## 핵심 원칙
- slides나 레이아웃 이름을 절대 언급하지 마세요. 오직 "내용과 구조"만 분석합니다.
- **내용을 절대 생략하지 마세요.** 원문의 모든 핵심 내용이 points에 담겨야 합니다.
- points가 너무 짧으면 슬라이드가 비어 보입니다. 항상 충분한 설명을 포함하세요.

## kind별 rules

### "agenda" (목차)
- points: 각 항목을 "항목명: 간략 설명" 형식으로 (예: "현황 분석: 국내외 트렌드 및 내부 역량 진단")

### "concept" (개념/설명) — 가장 많이 쓰이는 kind
- points: **반드시 "핵심 포인트: 구체적 설명 또는 근거"** 형식으로 작성
- 각 point 30~80자, 설명 부분이 충분해야 함
- 예시: "디지털 전환 가속화: 핵심 시스템 클라우드 전환으로 운영 효율 40% 향상 목표"

### "process" (단계/절차)
- points: **반드시 "단계명: 상세 설명"** 형식으로 (예: "1단계 기초 리터러시: 전 직원 AI 개념 이해 및 주요 도구 실습")
- 설명 부분은 30자 이상 구체적으로

### "data" (수치/KPI)
- numbers 배열 필수: value에 실제 수치, label에 지표명, delta에 증감
- points: 수치의 의미와 맥락 설명 (수치만 나열하면 안 됨)

### "comparison" (비교)
- sides 객체 필수: left/right에 명확한 레이블
- points: 절반은 left 기준, 나머지는 right 기준으로 구체적 차이점 서술

### "quote" (인용/핵심 메시지)
- emphasis: 인용구 전문 (40자 이상)
- points[0]: 출처 또는 맥락

### "process", "section": 챕터 구분용
### "cta": 행동 촉구/결론
### "close": 마무리 인사

## 절대 금지
- points에 5글자 이하 단어 하나만 쓰기 ("전략" "계획" "현황" 단독 사용 금지)
- 추상적 표현 ("성공적 추진", "효과적 운영" → 구체적 수치/방법으로)
- 빈 emphasis 또는 한 줄짜리 points (정보 밀도 확보 필수)

## 출력 형식 (순수 JSON, 마크다운 코드블록 금지)
{
  "title": "프레젠테이션 제목",
  "subtitle": "부제 또는 기관명 (선택)",
  "sections": [
    {
      "kind": "agenda",
      "heading": "목차",
      "points": ["현황 분석: 국내외 AI 트렌드 및 내부 역량 현황", "핵심 전략: 3대 교육 축 및 단계별 로드맵", "실행 계획: 분기별 추진 일정 및 성과 지표"]
    },
    {
      "kind": "process",
      "heading": "3단계 실행 로드맵",
      "points": [
        "1단계 기초 리터러시: 전 직원 AI 개념 이해 및 ChatGPT·Copilot 기초 실습 (2024 Q1~Q2)",
        "2단계 직무 적용: 직무별 AI 도구 실습 워크숍 및 현업 자동화 과제 수행 (2024 Q3~Q4)",
        "3단계 심화·전파: AI 챔피언 양성 및 팀 내 학습 리더 활동 확산 (2025)"
      ],
      "emphasis": "각 단계 완료 후 역량 진단으로 다음 단계 진입 자격 부여"
    },
    {
      "kind": "data",
      "heading": "핵심 성과 지표",
      "points": ["목표 달성률이 전년 대비 20%p 향상되어 처음으로 120% 돌파", "연간 매출 4.2조원으로 YoY 18% 성장"],
      "numbers": [
        { "value": "120%", "label": "목표 달성률", "delta": "+20%p YoY" },
        { "value": "₩4.2B", "label": "연간 매출", "delta": "YoY +18%" }
      ]
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { topic, documentText, slideCount = 8, isPptx = false } = await req.json();

    if (!topic && !documentText) {
      return NextResponse.json({ error: "topic 또는 documentText가 필요합니다." }, { status: 400 });
    }

    const targetSections = Math.max(4, Math.min(Number(slideCount) - 2, 16));

    let userPrompt: string;
    if (documentText && isPptx) {
      // PPT enhancement mode: preserve structure, rewrite into richer sections
      userPrompt = `다음은 기존 PPT에서 추출한 슬라이드별 텍스트입니다.
이 내용을 분석해 ${targetSections}개 섹션의 DeckOutline을 생성하세요.

## PPT 강화 규칙
- 원본 내용·구조·핵심 메시지를 최대한 보존하세요
- 텍스트가 단편적이면 맥락을 추론해 더 풍부한 points로 재작성하세요
- 수치나 통계가 있으면 반드시 "data" kind + numbers 배열로 표현하세요
- 단계·절차가 보이면 "process" kind로, 비교가 있으면 "comparison" kind로
- 빈 슬라이드나 이미지만 있는 슬라이드는 인접 슬라이드와 통합하세요

원본 슬라이드 텍스트:
---
${documentText.slice(0, 12000)}
---`;
    } else if (documentText) {
      userPrompt = `다음 문서를 분석해 ${targetSections}개 섹션의 DeckOutline을 생성하세요.

문서:
---
${documentText.slice(0, 10000)}
---`;
    } else {
      userPrompt = `주제: "${topic}"

이 주제로 ${targetSections}개 섹션의 DeckOutline을 생성하세요.
내용을 직접 창작해야 하며, 구체적인 수치·사례·포인트를 포함하세요.
가능한 섹션 종류를 다양하게 사용하세요 (data, comparison, process, quote 등 혼합).`;
    }

    const response = await chat({
      provider: "auto",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      maxTokens: 8192,
    });

    console.log(`[deck/analyze] ${response.provider}/${response.model} in=${response.usage?.inputTokens} out=${response.usage?.outputTokens}`);

    const outline: DeckOutline = JSON.parse(stripJsonFences(response.text));
    return NextResponse.json(outline);
  } catch (err) {
    console.error("[deck/analyze]", err);
    return NextResponse.json({ error: "아웃라인 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}

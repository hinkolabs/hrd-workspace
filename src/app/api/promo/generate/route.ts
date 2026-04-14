import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  const body = await req.json();
  const { type, topic, product, tone, keywords } = body;

  if (type === "quiz") {
    return generateQuiz({ topic, product, tone });
  } else if (type === "info_card") {
    return generateInfoCard({ product, keywords });
  }

  return NextResponse.json({ error: "type must be quiz or info_card" }, { status: 400 });
}

async function generateQuiz({
  topic,
  product,
  tone,
}: {
  topic: string;
  product: string;
  tone: string;
}) {
  const toneDesc: Record<string, string> = {
    funny:     "MZ 감성 유머, 자조적이고 현실 공감, 밈 느낌",
    cute:      "귀엽고 몽글몽글, 포근한 공감대",
    emotional: "감성적이고 잔잔한, 읽다가 '맞아...' 싶은",
    serious:   "신뢰감 있고 분석적인, 실제로 맞는 것 같은",
  };

  const toneText = toneDesc[tone] ?? toneDesc["funny"];

  const prompt = `당신은 한국 SNS 바이럴 심리테스트 전문 콘텐츠 기획자입니다. 쓰레드/인스타에서 수만 회 공유된 테스트를 만든 경험이 있습니다.

[퀴즈 주제]
"${topic}"

[연결할 상품/서비스]
"${product}"

[톤앤매너]
${toneText}

━━━━━━━━━━━━━━━━━━━━━
[핵심 제작 원칙]

1. **주제는 상품과 간접적으로 연결** - "${product}"의 타깃 사용자 라이프스타일/성향에서 자연스럽게 파생된 주제여야 함. 퀴즈 자체에서 상품 홍보 느낌 절대 금지.

2. **요즘 유행 포맷 적극 활용** - 아래 중 주제에 맞는 것을 골라 섞어서 적용:
   - 테토에겐남/테토에겐녀 (테스토스테론/에스트로겐 스타일)
   - MBTI 성향 (I/E, J/P 등 특성 활용)
   - 사주/오행 (목화토금수 에너지)
   - 전생 직업/동물 유형
   - 빙의글 스타일 상황 제시 ("당신은 지금 카페인데..." 식)
   - 연애/관계 유형 (애착 유형, 밀당 스타일)
   - TMI 성향 (디테일 집착형, 대충형 등)

3. **질문은 반드시 6개 이상 (6~8개)** - 적을수록 결과 신뢰도가 낮아져서 공유 안 됨

4. **선택지 퀄리티** - 실제 그 상황에서 할 법한 구체적 행동/생각. "그렇다/아니다" 식 단순 선택지 절대 금지. 읽으면서 "ㅋㅋㅋㅋ 나 이거잖아" 나올 것.

5. **결과 유형은 4개** - 각 유형의 제목은 SNS에서 자랑하고 싶게 매력적으로. 설명은 3~5문장으로 뼈맞는 분석 + 긍정적 마무리. 마지막 한 문장에서만 "${product}"를 자연스럽게 언급 (강요 X, 흥미롭게).

6. **og_title** - "이거 나 100%야", "내 친구한테 보내줘야 함" 싶게 클릭 욕구 자극
━━━━━━━━━━━━━━━━━━━━━

JSON 형식으로만 응답 (설명, 마크다운 없이 순수 JSON):
{
  "cover_emoji": "테스트 대표 이모지 1개",
  "og_title": "카카오톡/SNS 공유 제목 (클릭 욕구 유발, 20자 이내)",
  "og_description": "공유 설명 한 줄 (궁금증 유발)",
  "theme_color": "#헥스코드 (주제 분위기에 맞는 색상)",
  "questions": [
    {
      "question_text": "구체적 상황을 제시하는 질문",
      "question_emoji": "이모지 1개",
      "options": [
        { "text": "구체적이고 공감되는 선택지", "emoji": "이모지", "scores": { "A": 2, "B": 1, "C": 0, "D": 0 } },
        { "text": "구체적이고 공감되는 선택지", "emoji": "이모지", "scores": { "A": 0, "B": 2, "C": 1, "D": 0 } },
        { "text": "구체적이고 공감되는 선택지", "emoji": "이모지", "scores": { "A": 0, "B": 0, "C": 2, "D": 1 } },
        { "text": "구체적이고 공감되는 선택지", "emoji": "이모지", "scores": { "A": 1, "B": 0, "C": 0, "D": 2 } }
      ]
    }
  ],
  "results": [
    {
      "result_key": "A",
      "result_emoji": "이모지",
      "title": "SNS에 자랑하고 싶은 유형명",
      "description": "뼈때리는 분석 + 공감 + 긍정 마무리 (3~5문장). 마지막에만 자연스럽게 ${product} 언급."
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 1.0,
  });

  const content = completion.choices[0].message.content;
  if (!content) return NextResponse.json({ error: "AI 응답 없음" }, { status: 500 });

  try {
    const result = JSON.parse(content);

    // 질문 최소 6개 보장
    if (!result.questions || result.questions.length < 6) {
      return NextResponse.json(
        { error: "질문이 6개 미만으로 생성됐습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
  }
}

async function generateInfoCard({
  product,
  keywords,
}: {
  product: string;
  keywords: string;
}) {
  const prompt = `당신은 금융/보험/렌터카 등 B2B/B2C 상품 마케팅 전문가입니다.

상품/서비스: "${product}"
주요 특징/키워드: "${keywords}"

모바일 랜딩페이지용 정보카드를 만들어주세요:
- 히어로 섹션: 강렬하고 신뢰감 있는 타이틀
- 혜택 섹션: 4~5개, 각각 구체적인 수치나 혜택 포함
- 전체적으로 간결하고 임팩트 있게

JSON 형식으로만 응답:
{
  "cover_emoji": "상품 대표 이모지 1개",
  "og_title": "카카오톡 공유시 보이는 제목",
  "og_description": "카카오톡 공유시 보이는 설명 (한 줄)",
  "theme_color": "#헥스코드 (신뢰감/전문성 있는 색상)",
  "hero_title": "히어로 섹션 메인 타이틀",
  "hero_subtitle": "히어로 섹션 서브타이틀",
  "cta_text": "행동 유도 버튼 텍스트",
  "sections": [
    {
      "icon": "이모지",
      "title": "혜택 제목",
      "content": "혜택 상세 설명 (1~2문장, 구체적 수치 포함)"
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content;
  if (!content) return NextResponse.json({ error: "AI 응답 없음" }, { status: 500 });

  try {
    const result = JSON.parse(content);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
  }
}

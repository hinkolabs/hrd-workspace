import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  const body = await req.json();
  const { product } = body;

  const productContext = product
    ? `연결할 상품/서비스: "${product}"\n\n이 상품의 타깃 사용자 라이프스타일/성향에서 자연스럽게 파생되는 주제여야 합니다. 퀴즈에서 상품 홍보 느낌 없이, 결과 페이지에서만 자연스럽게 연결될 수 있는 주제.`
    : "";

  const prompt = `당신은 한국 SNS 바이럴 심리테스트 전문 콘텐츠 기획자입니다. 쓰레드/인스타에서 수만 회 공유된 테스트를 기획한 경험이 있습니다.

${productContext}

━━━━━━━━━━━━━━━━━━━━━
요즘 한국 SNS(쓰레드, 인스타그램)에서 바이럴될 만한 심리테스트/유형 테스트 주제 8개를 추천해주세요.

[반드시 지켜야 할 조건]
- 직장인/20~40대가 "이거 나잖아ㅋㅋㅋ" 하고 공유하는 주제
- 아래 유행 포맷 중 다양하게 섞어서 사용:
  · 테토에겐남/에겐녀 (테스토스테론/에스트로겐 유형)
  · MBTI 16가지 특성 활용 (하지만 직접적 MBTI 언급은 피하기)
  · 사주/오행 (목화토금수 에너지 유형)
  · 전생/동물/음식/캐릭터 유형 빙의
  · 연애/관계 애착 유형
  · 직장/회사생활 성향
  · 돈쓰는 방식/소비 성향
  · 위기 대처 방식
- 결과를 받고 친구에게 보내고 싶어지는 주제
- 너무 뻔하거나 유치하면 안 됨

JSON 형식으로만 응답:
{
  "topics": [
    { "title": "테스트 제목 (짧고 임팩트 있게)", "description": "어떤 테스트인지 한 줄 (궁금증 유발)", "emoji": "이모지", "format": "활용한 포맷 (예: 테토에겐남/사주/전생 등)" }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 1.1,
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

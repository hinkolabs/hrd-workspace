import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body as { items: { name: string; content: string }[] };

    if (!items?.length || items.length < 2) {
      return NextResponse.json({ error: "최소 2개의 견적서가 필요합니다." }, { status: 400 });
    }

    const prompt = `당신은 견적 비교 전문가입니다. 아래 ${items.length}개 업체의 견적 내용을 분석하여 비교표를 만들어주세요.

각 견적서 내용:
${items.map((it, i) => `\n--- 업체 ${i + 1}: ${it.name} ---\n${it.content}`).join("\n")}

다음 JSON 형식으로 응답하세요 (마크다운이나 코드블록 없이 순수 JSON만):
{
  "summary": "전체 요약 (한 문단)",
  "recommendation": "추천 업체와 이유",
  "categories": ["항목1", "항목2", ...],
  "vendors": [
    {
      "name": "업체명",
      "values": { "항목1": "값", "항목2": "값" },
      "total": "총 금액",
      "pros": ["장점1"],
      "cons": ["단점1"]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "견적 분석 실패" },
      { status: 500 }
    );
  }
}

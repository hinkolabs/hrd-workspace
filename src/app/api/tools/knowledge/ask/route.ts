import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";

const SYSTEM_PROMPT = `당신은 인재개발실의 AI 지식 도우미입니다. 아래 문서들을 참고하여 질문에 답변해주세요.
- 문서에 관련 내용이 있으면 인용하며 답변
- 문서에 없는 내용은 "문서에서 관련 정보를 찾지 못했습니다"라고 명시
- 답변 마지막에 참고한 문서 제목 표시
- 한국어로 친절하게`;

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    if (!question?.trim()) return NextResponse.json({ error: "질문을 입력하세요." }, { status: 400 });

    const supabase = createServerClient();
    const { data: docs } = await supabase
      .from("documents")
      .select("title, content")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!docs?.length) {
      return NextResponse.json({
        answer: "등록된 문서가 없습니다. 먼저 지식 베이스에 문서를 등록해주세요.",
        sources: [],
      });
    }

    const keywords = question.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1);
    const scored = docs.map((doc) => {
      const text = `${doc.title} ${doc.content || ""}`.toLowerCase();
      const score = keywords.reduce((acc: number, kw: string) => acc + (text.includes(kw) ? 1 : 0), 0);
      return { ...doc, score };
    }).sort((a, b) => b.score - a.score);

    const relevant = scored.slice(0, 5);
    const context = relevant
      .map((d, i) => `[문서 ${i + 1}: ${d.title}]\n${(d.content || "").slice(0, 2000)}`)
      .join("\n\n---\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `참고 문서:\n${context}\n\n질문: ${question}` },
      ],
      temperature: 0.3,
    });

    const answer = completion.choices[0].message.content ?? "";
    const sources = relevant.filter((d) => d.score > 0).map((d) => d.title);

    await supabase.from("knowledge_qa_history").insert({ question, answer, sources });

    return NextResponse.json({ answer, sources });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "질의 실패" },
      { status: 500 }
    );
  }
}

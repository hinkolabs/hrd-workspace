import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { openai } from "@/lib/openai";

const GUIDES_DIR = path.join(process.cwd(), "public", "guides", "alli-works");

const GUIDE_FILES = [
  { slug: "index", title: "Alli Works 소개 및 목차" },
  { slug: "getting-started", title: "시작하기 (관리자 가이드)" },
  { slug: "app-management", title: "앱 관리 개요" },
  { slug: "conversation-app-nodes", title: "대화형 앱 노드 가이드" },
  { slug: "agent-app", title: "에이전트형 앱 가이드" },
  { slug: "answer-app", title: "답변형 앱 가이드" },
  { slug: "knowledge-base", title: "지식베이스 가이드" },
  { slug: "settings", title: "설정 가이드" },
  { slug: "curriculum-3h", title: "3시간 교육 강의안" },
];

const SYSTEM_PROMPT = `당신은 Alli Works(Allganize의 기업용 AI 플랫폼) 전문 도우미입니다.
아래 제공된 Alli Works 가이드 문서를 기반으로 질문에 답변합니다.

답변 규칙:
- 가이드 문서에 있는 내용은 구체적이고 정확하게 설명
- 노드 설정, 메뉴 경로, 단계별 절차는 번호 목록으로 명확하게
- 문서에 없는 내용은 "가이드에서 관련 정보를 찾지 못했습니다. Alli Works 공식 문서(docs.allganize.ai)를 참고해 주세요."
- 참고한 가이드 섹션을 답변 마지막에 표시
- 친절하고 실무적인 톤으로 한국어 답변`;

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const { messages } = await req.json() as { messages: Message[] };

    if (!messages?.length) {
      return NextResponse.json({ error: "메시지를 입력하세요." }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      return NextResponse.json({ error: "사용자 메시지가 없습니다." }, { status: 400 });
    }

    // Load all guide files
    const allDocs = await Promise.all(
      GUIDE_FILES.map(async (g) => {
        try {
          const content = await fs.readFile(
            path.join(GUIDES_DIR, `${g.slug}.md`),
            "utf-8"
          );
          return { ...g, content };
        } catch {
          return { ...g, content: "" };
        }
      })
    );

    // Keyword-based relevance scoring
    const query = lastUserMessage.content.toLowerCase();
    const keywords = query.split(/\s+/).filter((w) => w.length > 1);

    const scored = allDocs
      .filter((d) => d.content)
      .map((doc) => {
        const text = `${doc.title} ${doc.content}`.toLowerCase();
        const score = keywords.reduce(
          (acc, kw) => acc + (text.includes(kw) ? 1 : 0),
          0
        );
        return { ...doc, score };
      })
      .sort((a, b) => b.score - a.score);

    // Take top 4 most relevant docs, always include index
    const topDocs = scored.slice(0, 4);
    const hasIndex = topDocs.some((d) => d.slug === "index");
    if (!hasIndex) {
      const indexDoc = scored.find((d) => d.slug === "index");
      if (indexDoc) topDocs.push(indexDoc);
    }

    const context = topDocs
      .map((d) => `## [${d.title}]\n${d.content.slice(0, 3000)}`)
      .join("\n\n---\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\n--- Alli Works 가이드 문서 ---\n\n${context}` },
        ...messages.slice(-6), // last 6 turns for context window
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const answer = completion.choices[0].message.content ?? "";

    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "응답 생성 실패" },
      { status: 500 }
    );
  }
}

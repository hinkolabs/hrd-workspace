import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const GUIDES_DIR = path.join(process.cwd(), "public", "guides", "alli-works");

type GuideItem = {
  slug: string;
  title: string;
  category: string;
};

const GUIDE_CATALOG: GuideItem[] = [
  { slug: "index", title: "Alli Works 소개 및 목차", category: "시작하기" },
  { slug: "getting-started", title: "시작하기 (관리자 가이드)", category: "시작하기" },
  { slug: "app-management", title: "앱 관리 개요", category: "앱 관리" },
  { slug: "conversation-app-nodes", title: "대화형 앱 노드 가이드", category: "앱 관리" },
  { slug: "agent-app", title: "에이전트형 앱 가이드", category: "앱 관리" },
  { slug: "answer-app", title: "답변형 앱 가이드", category: "앱 관리" },
  { slug: "knowledge-base", title: "지식베이스 가이드", category: "지식베이스" },
  { slug: "settings", title: "설정 가이드", category: "설정" },
];

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");

  if (slug) {
    const filePath = path.join(GUIDES_DIR, `${slug}.md`);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const item = GUIDE_CATALOG.find((g) => g.slug === slug);
      return NextResponse.json({
        slug,
        title: item?.title ?? slug,
        category: item?.category ?? "",
        content,
      });
    } catch {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ guides: GUIDE_CATALOG });
}

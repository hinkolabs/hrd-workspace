import { NextRequest, NextResponse } from "next/server";
import { buildPptx } from "@/lib/ppt-builder";
import type { PptPresentation } from "@/lib/ppt-builder";

export async function POST(req: NextRequest) {
  try {
    const presentation: PptPresentation = await req.json();

    if (!presentation?.slides || !Array.isArray(presentation.slides) || presentation.slides.length === 0) {
      return NextResponse.json({ error: "슬라이드 데이터가 없습니다." }, { status: 400 });
    }

    const buffer = await buildPptx(presentation);

    const safeTitle = (presentation.title ?? "presentation")
      .replace(/[^\w\s가-힣]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 50);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeTitle)}.pptx`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[ppt/build]", err);
    return NextResponse.json({ error: "PPTX 파일 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

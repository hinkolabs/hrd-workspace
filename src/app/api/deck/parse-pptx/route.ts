import { NextRequest, NextResponse } from "next/server";
import { parsePptx, slidesToPromptText } from "@/lib/pptx-parser";

export const runtime = "nodejs";

/**
 * POST /api/deck/parse-pptx
 * Body: multipart/form-data with field "file" (.pptx)
 * Returns: { slideCount, promptText, slides[] }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const arrayBuffer = await (file as Blob).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const slides = await parsePptx(buffer);
    if (slides.length === 0) {
      return NextResponse.json({ error: "슬라이드를 읽을 수 없습니다. 올바른 .pptx 파일인지 확인하세요." }, { status: 400 });
    }

    const promptText = slidesToPromptText(slides);

    return NextResponse.json({
      slideCount: slides.length,
      promptText,
      slides: slides.map((s) => ({
        index: s.index,
        imageCount: s.imageCount,
        text: s.fullText.slice(0, 500),
      })),
    });
  } catch (err) {
    console.error("[deck/parse-pptx]", err);
    return NextResponse.json({ error: "PPT 파일 파싱 중 오류가 발생했습니다." }, { status: 500 });
  }
}

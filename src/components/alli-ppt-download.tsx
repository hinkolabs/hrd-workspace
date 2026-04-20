"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { ALLI_SLIDES } from "@/components/alli-pdfs";

// ── Brand colours (hex without #) ─────────────────────────────────────────────
const VIOLET       = "7C3AED";
const VIOLET_LIGHT = "EDE9FE";
const DARK         = "111827";
const MID          = "374151";
const GRAY         = "6B7280";
const GRAY_LIGHT   = "F9FAFB";
const WHITE        = "FFFFFF";
const RED          = "DC2626";

// ── Slide dimensions (LAYOUT_WIDE = 13.33" × 7.5") ────────────────────────────
const W = 13.33;
const H = 7.5;

async function buildPPTX() {
  // Dynamic import to avoid SSR issues
  const pptxgen = (await import("pptxgenjs")).default;
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "하나증권 인재개발";
  pres.company = "하나증권";
  pres.title = "Alli Works 첫 사용 가이드 교육";

  // Helper: add header bar
  function addHeaderBar(slide: ReturnType<typeof pres.addSlide>, sectionLabel: string, slideId: string) {
    // Purple top bar
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: W, h: 0.55,
      fill: { color: VIOLET },
      line: { width: 0, color: VIOLET },
    });
    // Section label (left)
    slide.addText(sectionLabel, {
      x: 0.25, y: 0.1, w: 6, h: 0.35,
      fontSize: 10, color: WHITE, fontFace: "맑은 고딕",
      bold: false, valign: "middle",
    });
    // Slide ID (right)
    slide.addText(slideId, {
      x: W - 2, y: 0.1, w: 1.8, h: 0.35,
      fontSize: 10, color: WHITE, fontFace: "맑은 고딕",
      align: "right", valign: "middle",
    });
  }

  // Helper: add footer bar
  function addFooterBar(slide: ReturnType<typeof pres.addSlide>, slideNum: number, total: number) {
    // Light footer bg
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: H - 0.4, w: W, h: 0.4,
      fill: { color: GRAY_LIGHT },
      line: { width: 1, color: "E5E7EB" },
    });
    slide.addText(
      `하나증권 인재개발  ·  Alli Works 첫 사용 가이드 교육`,
      { x: 0.25, y: H - 0.35, w: 9, h: 0.3, fontSize: 9, color: GRAY, fontFace: "맑은 고딕", valign: "middle" }
    );
    slide.addText(
      `${slideNum} / ${total}`,
      { x: W - 1.5, y: H - 0.35, w: 1.3, h: 0.3, fontSize: 9, color: GRAY, fontFace: "맑은 고딕", align: "right", valign: "middle" }
    );
  }

  const total = ALLI_SLIDES.length;

  // ── Cover slide (S-00) ────────────────────────────────────────────────────
  {
    const slide = pres.addSlide();
    // Full purple background
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: W, h: H,
      fill: { color: VIOLET },
      line: { width: 0, color: VIOLET },
    });
    // Org label
    slide.addText("하나증권 인재개발 | Alli Works 신규 도입 교육 | 2026", {
      x: 1, y: 1.8, w: W - 2, h: 0.5,
      fontSize: 14, color: WHITE, fontFace: "맑은 고딕",
      transparency: 20, valign: "middle",
    });
    // Main title
    slide.addText("Alli Works\n첫 사용 가이드 교육", {
      x: 1, y: 2.4, w: W - 2, h: 1.8,
      fontSize: 40, bold: true, color: WHITE, fontFace: "맑은 고딕",
      lineSpacingMultiple: 1.2, valign: "top",
    });
    // Sub
    slide.addText("Qwen-2.5-72B 사내 폐쇄망 · 자격증 Q&A 챗봇 실습 · 초보자 대상", {
      x: 1, y: 4.4, w: W - 2, h: 0.5,
      fontSize: 14, color: WHITE, fontFace: "맑은 고딕",
      transparency: 15,
    });
    // Badges
    const badges = ["7세션 과정", "10~20명", "Qwen-2.5-72B"];
    badges.forEach((b, i) => {
      slide.addShape(pres.ShapeType.roundRect, {
        x: 1 + i * 2.1, y: 5.1, w: 1.9, h: 0.38,
        fill: { color: "FFFFFF", transparency: 80 },
        line: { width: 0, color: WHITE },
      });
      slide.addText(b, {
        x: 1 + i * 2.1, y: 5.1, w: 1.9, h: 0.38,
        fontSize: 11, color: WHITE, fontFace: "맑은 고딕",
        align: "center", valign: "middle",
      });
    });
    slide.addNotes("표지 슬라이드. Alli Works 로고와 하나증권 CI 삽입. 'AI 시대 첫 걸음' 분위기로 디자인.");
  }

  // ── Content slides ────────────────────────────────────────────────────────
  ALLI_SLIDES.forEach((sl, idx) => {
    const slide = pres.addSlide();
    const slideNum = idx + 1;

    addHeaderBar(slide, sl.section, sl.id);

    // Title
    slide.addText(sl.title, {
      x: 0.4, y: 0.65, w: W - 0.8, h: 0.9,
      fontSize: 26, bold: true, color: DARK, fontFace: "맑은 고딕",
      valign: "middle",
    });

    // Divider line under title
    slide.addShape(pres.ShapeType.line, {
      x: 0.4, y: 1.6, w: W - 0.8, h: 0,
      line: { color: "E5E7EB", width: 1.5 },
    });

    // Left accent bar
    slide.addShape(pres.ShapeType.rect, {
      x: 0.3, y: 1.75, w: 0.06, h: sl.bullets.length * 0.52,
      fill: { color: VIOLET },
      line: { width: 0, color: VIOLET },
    });

    // Bullet text block
    const bulletLines = sl.bullets.map((b) => ({
      text: b + "\n",
      options: {
        fontSize: 15,
        color: MID,
        fontFace: "맑은 고딕",
        bullet: { type: "bullet" as const, characterCode: "2022", indent: 20 },
        paraSpaceBefore: 4,
        paraSpaceAfter: 2,
      },
    }));

    slide.addText(bulletLines, {
      x: 0.5, y: 1.75, w: W - 0.9, h: 4.6,
      fontFace: "맑은 고딕", valign: "top",
      lineSpacingMultiple: 1.4,
    });

    // Design tip (if any) — shown at bottom
    if (sl.tip) {
      const tipY = H - 1.15;
      slide.addShape(pres.ShapeType.rect, {
        x: 0.4, y: tipY, w: W - 0.8, h: 0.7,
        fill: { color: VIOLET_LIGHT },
        line: { color: "DDD6FE", width: 1 },
      });
      slide.addText(`💡 디자인 힌트: ${sl.tip}`, {
        x: 0.55, y: tipY + 0.05, w: W - 1.1, h: 0.6,
        fontSize: 10, color: "5B21B6", fontFace: "맑은 고딕",
        valign: "middle", italic: true,
      });
    }

    addFooterBar(slide, slideNum, total);

    if (sl.tip) slide.addNotes(sl.tip);
  });

  return pres;
}

export function AlliPPTDownloadBtn() {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const pres = await buildPPTX();
      await pres.writeFile({ fileName: "Alli_Works_첫사용가이드_강의PPT.pptx" });
    } catch (e) {
      console.error("PPTX generation failed:", e);
      alert("PPT 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
    >
      {loading ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          PPT 생성 중...
        </>
      ) : (
        <>
          <Download size={14} />
          강의 PPT (.pptx) 다운로드
        </>
      )}
    </button>
  );
}

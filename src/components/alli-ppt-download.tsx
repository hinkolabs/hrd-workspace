"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { ALLI_SLIDES } from "@/components/alli-pdfs";

// ── 하나증권 CI 그린 팔레트 (pptxgenjs는 # 없는 6자 hex 문자열 요구) ─────────
const HANA_GREEN   = "059669"; // primary — emerald-600 (하나 CI)
const HANA_DARK    = "065F46"; // emerald-800
const HANA_LIGHT   = "ECFDF5"; // emerald-50
const HANA_TINT    = "D1FAE5"; // emerald-100
const HANA_LINE    = "A7F3D0"; // emerald-200
const HANA_ACCENT  = "10B981"; // emerald-500

const INK          = "0F172A"; // slate-900
const GRAY_900     = "111827";
const GRAY_700     = "374151";
const GRAY_500     = "6B7280";
const GRAY_300     = "D1D5DB";
const GRAY_100     = "F3F4F6";
const GRAY_50      = "F9FAFB";
const WHITE        = "FFFFFF";
const RED          = "DC2626";

// ── 슬라이드 규격 (LAYOUT_WIDE = 13.33" × 7.5") ────────────────────────────────
const W = 13.33;
const H = 7.5;

const FONT_HEAD = "맑은 고딕";
const FONT_BODY = "맑은 고딕";

function sanitizeText(s: string): string {
  // 이모지/특수 기호는 PPT에서 □로 깨지는 경우가 있어 정리
  return s
    .replace(/1️⃣/g, "1.")
    .replace(/2️⃣/g, "2.")
    .replace(/3️⃣/g, "3.")
    .replace(/4️⃣/g, "4.")
    .replace(/5️⃣/g, "5.")
    .replace(/①/g, "1.")
    .replace(/②/g, "2.")
    .replace(/③/g, "3.")
    .replace(/④/g, "4.")
    .replace(/⑤/g, "5.")
    .replace(/★/g, "▶")
    .replace(/💡/g, "▶")
    .replace(/☑/g, "✓")
    .replace(/☐/g, "□");
}

async function buildPPTX() {
  const pptxgen = (await import("pptxgenjs")).default;
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "하나증권 인재개발";
  pres.company = "하나증권";
  pres.title = "Alli Works 첫 사용 가이드 교육";
  pres.subject = "Qwen-2.5-72B 기반 사내 자격증 Q&A 챗봇 실습";

  const total = ALLI_SLIDES.length;

  // ─────────────────────────────────────────────────────────────────────────────
  // Master slide: 공통 장식 요소
  // ─────────────────────────────────────────────────────────────────────────────
  pres.defineSlideMaster({
    title: "CONTENT_MASTER",
    background: { color: WHITE },
    objects: [
      // 좌측 Hana 그린 세로 바 (브랜드 악센트)
      { rect: { x: 0, y: 0, w: 0.22, h: H, fill: { color: HANA_GREEN } } },
      // 좌측 얇은 어두운 그린 바
      { rect: { x: 0.22, y: 0, w: 0.04, h: H, fill: { color: HANA_DARK } } },
      // 하단 구분선
      { line: { x: 0.5, y: H - 0.55, w: W - 1, h: 0, line: { color: HANA_LINE, width: 1 } } },
      // 좌하단 Hana 로고 자리 (텍스트)
      {
        text: {
          text: "하나증권 인재개발  |  Alli Works",
          options: {
            x: 0.5, y: H - 0.48, w: 7, h: 0.38,
            fontSize: 10, color: HANA_DARK, fontFace: FONT_BODY,
            valign: "middle", bold: true,
          },
        },
      },
    ],
    slideNumber: {
      x: W - 1.4, y: H - 0.48, w: 0.9, h: 0.38,
      fontSize: 10, color: GRAY_500, fontFace: FONT_BODY,
      align: "right",
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // S-00: 표지
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const slide = pres.addSlide();

    // 우측 50% 그라데이션 느낌 (어두운 그린 영역)
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: W, h: H,
      fill: { color: HANA_DARK },
      line: { width: 0, color: HANA_DARK },
    });
    // 좌측 상단 옅은 그린 삼각형 (장식)
    slide.addShape(pres.ShapeType.rtTriangle, {
      x: 0, y: 0, w: 6.5, h: 3.5,
      fill: { color: HANA_GREEN, transparency: 25 },
      line: { width: 0, color: HANA_GREEN },
      rotate: 180,
    });
    // 우측 하단 옅은 녹색 사각형 장식
    slide.addShape(pres.ShapeType.rect, {
      x: W - 5.5, y: H - 2.8, w: 5.5, h: 2.8,
      fill: { color: HANA_ACCENT, transparency: 60 },
      line: { width: 0, color: HANA_ACCENT },
    });

    // 상단 미니 배지
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.9, y: 0.9, w: 3.2, h: 0.42,
      fill: { color: WHITE, transparency: 85 },
      line: { width: 0, color: WHITE },
      rectRadius: 0.08,
    });
    slide.addText("하나증권 인재개발 · 2026", {
      x: 0.9, y: 0.9, w: 3.2, h: 0.42,
      fontSize: 12, color: WHITE, fontFace: FONT_HEAD,
      bold: true, align: "center", valign: "middle",
    });

    // 메인 타이틀
    slide.addText("Alli Works", {
      x: 0.9, y: 1.7, w: W - 1.8, h: 1.4,
      fontSize: 72, bold: true, color: WHITE, fontFace: FONT_HEAD,
      valign: "top",
    });
    slide.addText("첫 사용 가이드 교육", {
      x: 0.9, y: 3.2, w: W - 1.8, h: 1.0,
      fontSize: 44, bold: true, color: WHITE, fontFace: FONT_HEAD,
      valign: "top", charSpacing: -2,
    });

    // 구분선
    slide.addShape(pres.ShapeType.line, {
      x: 0.9, y: 4.5, w: 2.8, h: 0,
      line: { color: WHITE, width: 3 },
    });

    // 부제
    slide.addText("Qwen-2.5-72B · 사내 폐쇄망 · 자격증 Q&A 챗봇 실습", {
      x: 0.9, y: 4.7, w: W - 1.8, h: 0.5,
      fontSize: 18, color: WHITE, fontFace: FONT_BODY,
      valign: "middle",
    });
    slide.addText("초보자 눈높이 · 코딩 지식 불필요 · 직접 만들고 가는 핸즈온", {
      x: 0.9, y: 5.25, w: W - 1.8, h: 0.5,
      fontSize: 14, color: WHITE, fontFace: FONT_BODY,
      valign: "middle", italic: true,
    });

    // 하단 메타 박스
    const metaY = 6.1;
    const metas = [
      { label: "과정 구성",   value: "7세션" },
      { label: "대상 인원",   value: "10~20명" },
      { label: "핵심 모델",   value: "Qwen-2.5-72B" },
      { label: "완성 목표",   value: "자격증 Q&A 챗봇" },
    ];
    metas.forEach((m, i) => {
      const x = 0.9 + i * 3;
      slide.addShape(pres.ShapeType.roundRect, {
        x, y: metaY, w: 2.8, h: 0.9,
        fill: { color: WHITE, transparency: 80 },
        line: { color: WHITE, width: 1 },
        rectRadius: 0.06,
      });
      slide.addText(m.label, {
        x: x + 0.15, y: metaY + 0.08, w: 2.5, h: 0.3,
        fontSize: 10, color: WHITE, fontFace: FONT_BODY,
      });
      slide.addText(m.value, {
        x: x + 0.15, y: metaY + 0.38, w: 2.5, h: 0.45,
        fontSize: 16, color: WHITE, bold: true, fontFace: FONT_HEAD,
      });
    });

    slide.addNotes(
      "표지 슬라이드. 하나증권 인재개발 Alli Works 첫 사용 가이드 교육. " +
      "Qwen-2.5-72B 사내 폐쇄망 기반 자격증 Q&A 챗봇 실습. 7세션 구성, 10~20명 대상."
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 섹션 색상 매핑 (좌측 바 + 뱃지 톤)
  // ─────────────────────────────────────────────────────────────────────────────
  const sectionTone: Record<string, { bar: string; chipBg: string; chipFg: string; badge: string }> = {
    "표지":        { bar: HANA_DARK,   chipBg: HANA_DARK,   chipFg: WHITE, badge: "00" },
    "오늘의 여정": { bar: HANA_GREEN,  chipBg: HANA_GREEN,  chipFg: WHITE, badge: "01" },
    "세션 1":      { bar: HANA_GREEN,  chipBg: HANA_GREEN,  chipFg: WHITE, badge: "S1" },
    "세션 2":      { bar: HANA_ACCENT, chipBg: HANA_ACCENT, chipFg: WHITE, badge: "S2" },
    "세션 3":      { bar: HANA_ACCENT, chipBg: HANA_ACCENT, chipFg: WHITE, badge: "S3" },
    "세션 4":      { bar: HANA_GREEN,  chipBg: HANA_GREEN,  chipFg: WHITE, badge: "S4" },
    "세션 5":      { bar: HANA_GREEN,  chipBg: HANA_GREEN,  chipFg: WHITE, badge: "S5" },
    "세션 6":      { bar: HANA_ACCENT, chipBg: HANA_ACCENT, chipFg: WHITE, badge: "S6" },
    "세션 7":      { bar: HANA_DARK,   chipBg: HANA_DARK,   chipFg: WHITE, badge: "S7" },
    "마무리":      { bar: HANA_DARK,   chipBg: HANA_DARK,   chipFg: WHITE, badge: "END" },
    "참고":        { bar: INK,         chipBg: INK,         chipFg: WHITE, badge: "附" },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 본문 슬라이드
  // ─────────────────────────────────────────────────────────────────────────────
  ALLI_SLIDES.forEach((sl, idx) => {
    const slide = pres.addSlide({ masterName: "CONTENT_MASTER" });
    const slideNum = idx + 1;
    const tone = sectionTone[sl.section] ?? { bar: HANA_GREEN, chipBg: HANA_GREEN, chipFg: WHITE, badge: sl.id };

    // 상단 섹션 칩 + ID
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.55, y: 0.5, w: 1.3, h: 0.42,
      fill: { color: tone.chipBg },
      line: { width: 0, color: tone.chipBg },
      rectRadius: 0.06,
    });
    slide.addText(sl.section, {
      x: 0.55, y: 0.5, w: 1.3, h: 0.42,
      fontSize: 11, color: tone.chipFg, bold: true, fontFace: FONT_HEAD,
      align: "center", valign: "middle",
    });
    slide.addText(sl.id, {
      x: 2.0, y: 0.5, w: 1.4, h: 0.42,
      fontSize: 10, color: GRAY_500, fontFace: FONT_BODY,
      valign: "middle",
    });
    // 우측 상단 워터마크성 페이지 인덱스
    slide.addText(`${slideNum.toString().padStart(2, "0")} / ${total.toString().padStart(2, "0")}`, {
      x: W - 2.0, y: 0.5, w: 1.5, h: 0.42,
      fontSize: 10, color: GRAY_500, fontFace: FONT_BODY,
      align: "right", valign: "middle",
    });

    // 메인 타이틀
    slide.addText(sanitizeText(sl.title), {
      x: 0.55, y: 1.05, w: W - 1.1, h: 0.9,
      fontSize: 30, bold: true, color: INK, fontFace: FONT_HEAD,
      valign: "middle", charSpacing: -1,
    });

    // 언더라인 (브랜드 색)
    slide.addShape(pres.ShapeType.rect, {
      x: 0.55, y: 1.95, w: 1.2, h: 0.07,
      fill: { color: HANA_GREEN },
      line: { width: 0, color: HANA_GREEN },
    });
    slide.addShape(pres.ShapeType.line, {
      x: 1.78, y: 1.99, w: W - 2.35, h: 0,
      line: { color: HANA_LINE, width: 1 },
    });

    // ── 본문 영역 (배경 라이트 그린 패널) ─────────────────────────────────────
    const panelY = 2.25;
    const panelH = H - panelY - 0.75; // footer margin
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.55, y: panelY, w: W - 1.1, h: panelH,
      fill: { color: HANA_LIGHT },
      line: { color: HANA_LINE, width: 1 },
      rectRadius: 0.08,
    });
    // 좌측 악센트 바 (본문 영역 내부)
    slide.addShape(pres.ShapeType.rect, {
      x: 0.55, y: panelY, w: 0.12, h: panelH,
      fill: { color: tone.bar },
      line: { width: 0, color: tone.bar },
    });

    // 불릿 영역 (tip 유무에 따라 가변)
    const hasTip = !!sl.tip;
    const bulletAreaH = hasTip ? panelH - 1.15 : panelH - 0.3;

    const bulletLines = sl.bullets.map((b) => ({
      text: sanitizeText(b),
      options: {
        fontSize: sl.bullets.length <= 4 ? 18 : 16,
        color: GRAY_900,
        fontFace: FONT_BODY,
        bullet: { characterCode: "25A0", indent: 18 }, // ■ 작은 사각 블릿
        paraSpaceBefore: 6,
        paraSpaceAfter: 4,
        indentLevel: 0,
      },
    }));

    slide.addText(bulletLines, {
      x: 1.0, y: panelY + 0.35, w: W - 1.8, h: bulletAreaH,
      fontFace: FONT_BODY,
      valign: "top",
      lineSpacingMultiple: 1.35,
      color: GRAY_900,
    });

    // ── 디자인 힌트 박스 (하단, 강사용) ──────────────────────────────────────
    if (sl.tip) {
      const tipY = panelY + panelH - 0.95;
      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.85, y: tipY, w: W - 1.7, h: 0.75,
        fill: { color: WHITE },
        line: { color: HANA_GREEN, width: 1.25 },
        rectRadius: 0.06,
      });
      // 좌측 라벨 뱃지
      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.95, y: tipY + 0.12, w: 1.3, h: 0.5,
        fill: { color: HANA_GREEN },
        line: { width: 0, color: HANA_GREEN },
        rectRadius: 0.05,
      });
      slide.addText("디자인 힌트", {
        x: 0.95, y: tipY + 0.12, w: 1.3, h: 0.5,
        fontSize: 10, color: WHITE, bold: true, fontFace: FONT_HEAD,
        align: "center", valign: "middle",
      });
      slide.addText(sanitizeText(sl.tip), {
        x: 2.35, y: tipY + 0.08, w: W - 3.3, h: 0.62,
        fontSize: 11, color: GRAY_700, fontFace: FONT_BODY,
        valign: "middle", italic: true,
      });
    }

    // 발표자 노트
    const notesLines = [
      `[${sl.id}] ${sl.title}`,
      `섹션: ${sl.section}`,
      "",
      ...sl.bullets.map((b, i) => `${i + 1}. ${b}`),
    ];
    if (sl.tip) {
      notesLines.push("", `디자인 힌트: ${sl.tip}`);
    }
    slide.addNotes(notesLines.join("\n"));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 마지막 감사 슬라이드
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const slide = pres.addSlide();
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: W, h: H,
      fill: { color: HANA_DARK },
      line: { width: 0, color: HANA_DARK },
    });
    slide.addShape(pres.ShapeType.rtTriangle, {
      x: 0, y: 0, w: 7, h: 4,
      fill: { color: HANA_GREEN, transparency: 40 },
      line: { width: 0, color: HANA_GREEN },
      rotate: 180,
    });
    slide.addText("Thank You", {
      x: 0.9, y: 2.6, w: W - 1.8, h: 1.6,
      fontSize: 88, bold: true, color: WHITE, fontFace: FONT_HEAD,
      charSpacing: -2,
    });
    slide.addShape(pres.ShapeType.line, {
      x: 0.9, y: 4.4, w: 2.5, h: 0,
      line: { color: WHITE, width: 3 },
    });
    slide.addText("오늘도 수고하셨습니다.", {
      x: 0.9, y: 4.6, w: W - 1.8, h: 0.5,
      fontSize: 20, color: WHITE, fontFace: FONT_BODY,
    });
    slide.addText("Q&A · 추가 문의: 하나증권 인재개발실", {
      x: 0.9, y: 5.2, w: W - 1.8, h: 0.4,
      fontSize: 14, color: WHITE, fontFace: FONT_BODY, italic: true,
    });
    slide.addNotes("Q&A 및 마무리 인사. 3가지 기억을 다시 강조: 출처 링크 클릭 / 원본 대조 / 담당자 연결.");
  }

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
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
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

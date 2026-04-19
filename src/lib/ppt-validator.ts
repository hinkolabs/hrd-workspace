/**
 * Post-generation quality gate for preset-mode PPT payloads.
 *
 * Fixes:
 * 1. Content layout over-use — converts repeated content slides to richer layouts where feasible
 * 2. Sparse slides — injects default bullets/items when arrays are too short
 * 3. Layout anti-repetition — prevents 3+ consecutive identical layouts
 * 4. Auto-picks content variant when missing (based on bullet count)
 */

import type {
  PptPresentation,
  AnySlide,
  ContentSlide,
  GridSlide,
  StatsSlide,
  AgendaSlide,
  ProcessSlide,
  TimelineSlide,
  ComparisonSlide,
  TwoColumnSlide,
  HighlightSlide,
} from "./ppt-builder";

type SlideDefinition = AnySlide;

const MIN_BULLETS = 3;

interface FixReport {
  layoutReassignments: number;
  bulletPads: number;
  variantInjections: number;
  totalSlides: number;
}

function ensureMin<T>(arr: T[] | undefined, min: number, filler: (i: number) => T): T[] {
  const src = Array.isArray(arr) ? arr.slice() : [];
  while (src.length < min) {
    src.push(filler(src.length));
  }
  return src;
}

function padBullets(s: SlideDefinition, report: FixReport): void {
  if (s.layout === "content") {
    const cs = s as ContentSlide;
    const original = cs.bullets?.length ?? 0;
    cs.bullets = ensureMin(cs.bullets, MIN_BULLETS, (i) => `추가 포인트 ${i + 1}`);
    if (cs.bullets.length > original) report.bulletPads++;
    // Auto-pick variant if missing
    if (!cs.variant) {
      cs.variant =
        cs.bullets.length <= 4 ? "cards" :
        cs.bullets.length <= 9 ? "numbered" :
        "compact";
      report.variantInjections++;
    }
  } else if (s.layout === "grid") {
    const gs = s as GridSlide;
    gs.items = ensureMin(gs.items, MIN_BULLETS, (i) => ({
      heading: `항목 ${i + 1}`,
      description: "세부 내용",
    }));
  } else if (s.layout === "stats") {
    const st = s as StatsSlide;
    st.stats = ensureMin(st.stats, 3, (i) => ({
      value: "—",
      label: `지표 ${i + 1}`,
    }));
  } else if (s.layout === "agenda") {
    const ag = s as AgendaSlide;
    const romans = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];
    ag.items = ensureMin(ag.items, 3, (i) => ({
      number: romans[i] ?? String(i + 1),
      heading: `섹션 ${i + 1}`,
    }));
  } else if (s.layout === "process") {
    const ps = s as ProcessSlide;
    ps.steps = ensureMin(ps.steps, 3, (i) => ({
      label: `단계 ${i + 1}`,
    }));
  } else if (s.layout === "timeline") {
    const ts = s as TimelineSlide;
    ts.events = ensureMin(ts.events, 3, (i) => ({
      period: `T${i + 1}`,
      label: `이벤트 ${i + 1}`,
    }));
  } else if (s.layout === "comparison") {
    const cs = s as ComparisonSlide;
    cs.left.bullets = ensureMin(cs.left.bullets, 2, (i) => `항목 ${i + 1}`);
    cs.right.bullets = ensureMin(cs.right.bullets, 2, (i) => `항목 ${i + 1}`);
  } else if (s.layout === "two_column") {
    const tc = s as TwoColumnSlide;
    tc.left.bullets = ensureMin(tc.left.bullets, 2, (i) => `항목 ${i + 1}`);
    tc.right.bullets = ensureMin(tc.right.bullets, 2, (i) => `항목 ${i + 1}`);
  } else if (s.layout === "highlight") {
    const hs = s as HighlightSlide;
    if (!hs.features || hs.features.length < 3) {
      hs.features = ensureMin(hs.features, 3, (i) => ({
        heading: `특징 ${i + 1}`,
        description: "세부 설명",
      }));
    }
  }
}

function breakConsecutiveLayouts(slides: SlideDefinition[], report: FixReport): void {
  // Prevent 3+ consecutive "content" layouts — convert middle one to grid
  for (let i = 2; i < slides.length; i++) {
    const a = slides[i - 2]!.layout;
    const b = slides[i - 1]!.layout;
    const c = slides[i]!.layout;
    if (a === "content" && b === "content" && c === "content") {
      const victim = slides[i - 1] as ContentSlide;
      const items = (victim.bullets ?? []).map((t, idx) => ({
        heading: `항목 ${idx + 1}`,
        description: t,
      }));
      slides[i - 1] = {
        layout: "grid",
        title: victim.title,
        items: items.length >= 3 ? items : [
          ...items,
          ...Array.from({ length: 3 - items.length }, (_, k) => ({
            heading: `항목 ${items.length + k + 1}`,
            description: "추가 내용",
          })),
        ],
      } as GridSlide;
      report.layoutReassignments++;
    }
  }
}

function enforceContentRatio(slides: SlideDefinition[], report: FixReport): void {
  const total = slides.length;
  const contentIdxs = slides
    .map((s, i) => (s.layout === "content" ? i : -1))
    .filter((i) => i >= 0);
  const maxContent = Math.max(2, Math.floor(total * 0.3));
  if (contentIdxs.length <= maxContent) return;

  // Convert the excess content slides (starting from the middle) to grid
  const excess = contentIdxs.length - maxContent;
  const toConvert = contentIdxs.slice(0, excess);
  for (const idx of toConvert) {
    const cs = slides[idx] as ContentSlide;
    const items = (cs.bullets ?? []).slice(0, 6).map((t, i) => ({
      heading: `포인트 ${i + 1}`,
      description: t,
    }));
    slides[idx] = {
      layout: "grid",
      title: cs.title,
      items: items.length >= 3 ? items : [
        ...items,
        ...Array.from({ length: 3 - items.length }, (_, k) => ({
          heading: `항목 ${items.length + k + 1}`,
          description: "추가 내용",
        })),
      ],
    } as GridSlide;
    report.layoutReassignments++;
  }
}

export function validateAndFixPresentation(pres: PptPresentation): {
  fixed: PptPresentation;
  report: FixReport;
} {
  const report: FixReport = {
    layoutReassignments: 0,
    bulletPads: 0,
    variantInjections: 0,
    totalSlides: pres.slides.length,
  };

  const slides = pres.slides.slice();

  for (const s of slides) {
    padBullets(s, report);
  }

  enforceContentRatio(slides, report);
  breakConsecutiveLayouts(slides, report);

  return {
    fixed: { ...pres, slides },
    report,
  };
}

/** Extract leading section heading (e.g., "■ 인사", "1. 항목") for grid heading */
function extractHeading(text: string, fallback: string): { heading: string; description: string } {
  const trimmed = text.trim();
  // Pattern: "■ 제목 — 내용"  or "1. 제목: 내용"
  const m1 = trimmed.match(/^[■◆●▶▪•\-]\s*([^:：—\-]{2,20})(?:\s*[:：—\-]\s*(.+))?$/);
  if (m1) return { heading: m1[1]!.trim(), description: (m1[2] ?? trimmed).trim() };
  const m2 = trimmed.match(/^\s*\d+\.\s*([^:：—\-]{2,20})(?:\s*[:：—\-]\s*(.+))?$/);
  if (m2) return { heading: m2[1]!.trim(), description: (m2[2] ?? trimmed).trim() };
  // Pattern: "키워드: 내용"
  const m3 = trimmed.match(/^([^:：]{2,15})[:：]\s*(.+)$/);
  if (m3) return { heading: m3[1]!.trim(), description: m3[2]!.trim() };
  // Fallback: use first 12 chars as heading
  const head = trimmed.length > 12 ? trimmed.slice(0, 12) + "…" : trimmed;
  return { heading: fallback, description: trimmed || head };
}

/** Normalize title for duplicate detection — strip whitespace/punctuation */
function normalizeTitle(title: string | undefined): string {
  if (!title) return "";
  return title.replace(/[\s\-_·・.,，。]+/g, "").toLowerCase();
}

/**
 * Lightweight validator for REDESIGN mode.
 *
 * Preserves original bullet counts and text (no padding, no content invention),
 * but applies aggressive structural fixes:
 *  - bullets ≥ 10 : content → grid (text-preserving conversion)
 *  - bullets ≥ 7  : variant forced to "numbered" or "compact" (overrides LLM)
 *  - bullets ≥ 5  : variant forced to "numbered" (overrides LLM)
 *  - Duplicate titles (footer repeated as title): clear on slides 2+
 *  - 3+ consecutive content : rotate variant or convert to grid
 */
export function validateAndFixRedesign(pres: PptPresentation): {
  fixed: PptPresentation;
  report: FixReport;
} {
  const report: FixReport = {
    layoutReassignments: 0,
    bulletPads: 0,
    variantInjections: 0,
    totalSlides: pres.slides.length,
  };

  let slides = pres.slides.slice();

  // 1) Detect duplicate titles across slides (footer text extracted as title by parser).
  //    Count occurrences; any title appearing on ≥ 3 non-title/closing slides is treated as footer pollution.
  const titleCounts = new Map<string, number>();
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i] as { title?: string; layout: string };
    if (s.layout === "title" || s.layout === "closing" || s.layout === "section") continue;
    const key = normalizeTitle(s.title);
    if (!key) continue;
    titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
  }
  const footerTitles = new Set<string>();
  for (const [key, count] of titleCounts) {
    if (count >= 3) footerTitles.add(key);
  }
  if (footerTitles.size > 0) {
    let cleared = 0;
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i] as { title?: string; layout: string };
      if (s.layout === "title" || s.layout === "closing" || s.layout === "section") continue;
      if (footerTitles.has(normalizeTitle(s.title))) {
        (s as { title?: string }).title = `슬라이드 ${i + 1}`;
        cleared++;
      }
    }
    report.layoutReassignments += cleared;
    console.log(`[ppt-validator] cleared ${cleared} duplicate footer titles:`, Array.from(footerTitles));
  }

  // 2) content → grid conversion for dense bullets (≥ 10)
  //    Preserves every bullet as a grid item (heading extracted from leading keyword if present)
  slides = slides.map((s) => {
    if (s.layout !== "content") return s;
    const cs = s as ContentSlide;
    const bullets = cs.bullets ?? [];
    if (bullets.length < 10) return s;

    const items = bullets.map((b, i) => extractHeading(b, `항목 ${i + 1}`))
      .map((h) => ({ heading: h.heading, description: h.description }));
    report.layoutReassignments++;
    const grid: GridSlide = {
      layout: "grid",
      title: cs.title,
      items,
    };
    return grid;
  });

  // 3) Variant override for content slides
  //    Forces a sensible variant based on bullet count regardless of LLM choice
  for (const s of slides) {
    if (s.layout !== "content") continue;
    const cs = s as ContentSlide;
    const n = cs.bullets?.length ?? 0;
    const desired =
      n <= 4 ? "cards" :
      n <= 7 ? "numbered" :
      "compact";
    if (cs.variant !== desired) {
      cs.variant = desired;
      report.variantInjections++;
    }
    // With image slots + many bullets, tracks overlap — strip images beyond 1 to free space
    if (cs.imageSlots && cs.imageSlots.length > 0 && n >= 7) {
      cs.imageSlots = cs.imageSlots.slice(0, 1);
    }
  }

  // 4) Break 3+ consecutive content slides by converting the middle one to grid (if possible)
  for (let i = 2; i < slides.length; i++) {
    if (
      slides[i - 2]!.layout === "content" &&
      slides[i - 1]!.layout === "content" &&
      slides[i]!.layout === "content"
    ) {
      const mid = slides[i - 1] as ContentSlide;
      const bullets = mid.bullets ?? [];
      if (bullets.length >= 3) {
        const items = bullets.slice(0, 6).map((b, idx) => {
          const h = extractHeading(b, `항목 ${idx + 1}`);
          return { heading: h.heading, description: h.description };
        });
        slides[i - 1] = {
          layout: "grid",
          title: mid.title,
          items,
        } as GridSlide;
        report.layoutReassignments++;
      }
    }
  }

  return {
    fixed: { ...pres, slides },
    report,
  };
}

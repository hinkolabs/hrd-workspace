import pptxgen from "pptxgenjs";
import { type ThemeId } from "./ppt-themes";
import { type SlideStyle } from "@/lib/ppt-presets/types";
import { getPreset, resolveStyle } from "@/lib/ppt-presets";
import { renderSceneSlide } from "./scene-renderer";

// ─── Slide data types ─────────────────────────────────────────────────────────

export type SlideLayout =
  | "title"
  | "content"
  | "two_column"
  | "table"
  | "section"
  | "closing"
  | "agenda"
  | "grid"
  | "process"
  | "timeline"
  | "comparison"
  | "stats"
  | "quote"
  | "pyramid"
  | "swot"
  | "highlight"
  | "scene"
  | "hana_kpi"
  | "hana_timeline"
  | "hana_divider"
  | "hana_matrix"
  | "hana_org"
  | "chart_bar"
  | "chart_pie"
  | "chart_line";

// ─── Freeform scene primitives ────────────────────────────────────────────────
//
// Two tiers of primitives:
//   Tier 1 (always supported, minimal): rect, ellipse, line, text, icon, image
//   Tier 2 (advanced, for rich decks): shape, table, chart, richText
//
// Tier 2 primitives expose much of pptxgenjs native power (any prstGeom,
// data-driven charts, styled tables, multi-run rich text). Used by Claude to
// produce consulting-grade decks.

export type GradientFill =
  | { type: "solid"; color: string; opacity?: number }
  | { type: "gradient"; colors: string[]; angle?: number };

export interface ShapeStyle {
  fill?: string | GradientFill;
  opacity?: number;
  border?: { color: string; pt: number; dash?: "solid" | "dash" | "dot" };
  shadow?: boolean;
}

export interface TextRun {
  text: string;
  color?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFace?: string;
}

export interface TableCellSpec {
  text: string;
  fill?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFace?: string;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  colspan?: number;
  rowspan?: number;
}

export interface ChartSeries {
  name: string;
  labels: string[];
  values: number[];
}

/** pptxgenjs preset shape identifiers commonly used. Unknown values fall back to rect. */
export type PresetShape =
  | "rect" | "roundRect" | "round1Rect" | "round2SameRect"
  | "ellipse" | "diamond" | "triangle" | "rtTriangle"
  | "pentagon" | "hexagon" | "heptagon" | "octagon" | "decagon"
  | "star4" | "star5" | "star6" | "star7" | "star8"
  | "rightArrow" | "leftArrow" | "upArrow" | "downArrow"
  | "chevron" | "pentagon" | "callout1" | "callout2" | "callout3"
  | "wedgeRectCallout" | "wedgeRoundRectCallout" | "wedgeEllipseCallout"
  | "parallelogram" | "trapezoid" | "plaque" | "plus" | "notchedRightArrow"
  | "stripedRightArrow" | "leftRightArrow" | "can" | "cube" | "cloud"
  | "heart" | "sun" | "moon" | "lightningBolt" | "noSmoking"
  | "flowChartProcess" | "flowChartDecision" | "flowChartTerminator"
  | "flowChartAlternateProcess" | "flowChartPredefinedProcess"
  | "flowChartInputOutput" | "flowChartDocument" | "flowChartMultidocument"
  | "bentArrow" | "uturnArrow" | "circularArrow" | "curvedRightArrow";

export type Primitive =
  // Tier 1: basic primitives
  | { type: "rect"; x: number; y: number; w: number; h: number;
      fill?: string | GradientFill; opacity?: number;
      radius?: number; border?: { color: string; pt: number };
      shadow?: boolean }
  | { type: "ellipse"; x: number; y: number; w: number; h: number;
      fill?: string | GradientFill; opacity?: number;
      border?: { color: string; pt: number }; shadow?: boolean }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number;
      color?: string; thickness?: number;
      dashStyle?: "solid" | "dash" | "dot" | "dashDot";
      arrowHead?: "none" | "triangle" | "arrow"; arrowTail?: "none" | "triangle" | "arrow" }
  | { type: "text"; x: number; y: number; w: number; h: number;
      text: string; fontSize?: number; color?: string; bold?: boolean;
      align?: "left" | "center" | "right"; valign?: "top" | "middle" | "bottom";
      italic?: boolean; fontFace?: string; underline?: boolean;
      fill?: string; lineSpacingMultiple?: number }
  | { type: "icon"; name: string; x: number; y: number; w: number; h: number;
      color?: string }
  | { type: "image"; base64: string; mime: string;
      x: number; y: number; w: number; h: number;
      border?: { color: string; pt: number } }
  // Tier 2: advanced primitives
  | { type: "shape"; shape: PresetShape | string;
      x: number; y: number; w: number; h: number;
      style?: ShapeStyle; rotate?: number;
      text?: string; fontSize?: number; color?: string; bold?: boolean;
      align?: "left" | "center" | "right"; valign?: "top" | "middle" | "bottom";
      fontFace?: string }
  | { type: "table"; x: number; y: number; w: number; h: number;
      cells: TableCellSpec[][]; colW?: number[]; rowH?: number[];
      border?: { color: string; pt: number };
      defaultFontFace?: string; defaultFontSize?: number }
  | { type: "chart"; chartType: "bar" | "pie" | "line" | "doughnut" | "area" | "bar3d";
      x: number; y: number; w: number; h: number;
      series: ChartSeries[];
      title?: string; showLegend?: boolean; showValue?: boolean;
      colors?: string[]; barDir?: "bar" | "col" }
  | { type: "richText"; x: number; y: number; w: number; h: number;
      runs: TextRun[]; align?: "left" | "center" | "right";
      valign?: "top" | "middle" | "bottom"; fontFace?: string;
      lineSpacingMultiple?: number; fill?: string };

export interface SceneSlide {
  layout: "scene";
  title?: string;
  background?: string;
  elements: Primitive[];
  notes?: string;
}

export interface TitleSlide {
  layout: "title";
  title: string;
  subtitle?: string;
  date?: string;
  tag?: string;
}

export interface ImageSlot {
  data: string;   // raw base64 (no data URI prefix)
  mime?: string;  // e.g. "image/png"
}

export interface ContentSlide {
  layout: "content";
  title: string;
  bullets: string[];
  notes?: string;
  imageSlots?: ImageSlot[];
  /**
   * Visual variant for the content slide. Default auto-picks based on bullet count.
   * - "cards": 좌측 accent bar + 카드 행 (기본, ≤4 bullets)
   * - "numbered": 번호 원형 마커 (5-9 bullets)
   * - "compact": 컴팩트 리스트 (10+ bullets)
   * - "dashboard": 좌측 메인 불릿 + 우측 보조 블록 (복합 레이아웃)
   * - "icon_rows": 아이콘 카드 행 (grid와 비슷하지만 단일 컬럼)
   */
  variant?: "cards" | "numbered" | "compact" | "dashboard" | "icon_rows";
  /** Optional callout/side-panel for dashboard variant */
  callout?: { heading?: string; value?: string; description?: string };
}

export interface TwoColumnSlide {
  layout: "two_column";
  title: string;
  left: { heading: string; bullets: string[] };
  right: { heading: string; bullets: string[] };
  notes?: string;
}

export interface TableSlide {
  layout: "table";
  title: string;
  headers: string[];
  rows: string[][];
  notes?: string;
}

export interface SectionSlide {
  layout: "section";
  title: string;
  subtitle?: string;
}

export interface ClosingSlide {
  layout: "closing";
  title: string;
  subtitle?: string;
  contact?: string;
}

// ─── New layout interfaces ─────────────────────────────────────────────────────

export interface AgendaSlide {
  layout: "agenda";
  title: string;
  items: Array<{ number?: string; heading: string; description?: string }>;
}

export interface GridSlide {
  layout: "grid";
  title: string;
  items: Array<{ heading: string; description?: string; symbol?: string }>;
}

export interface ProcessSlide {
  layout: "process";
  title: string;
  steps: Array<{ label: string; description?: string }>;
}

export interface TimelineSlide {
  layout: "timeline";
  title: string;
  events: Array<{ period: string; label: string; description?: string }>;
}

export interface ComparisonSlide {
  layout: "comparison";
  title: string;
  left: { heading: string; bullets: string[] };
  right: { heading: string; bullets: string[] };
  vsLabel?: string;
}

export interface StatsSlide {
  layout: "stats";
  title: string;
  subtitle?: string;
  tag?: string;
  stats: Array<{ value: string; label: string; caption?: string; badge?: string; symbol?: string }>;
}

export interface QuoteSlide {
  layout: "quote";
  title?: string;
  quote: string;
  author?: string;
}

export interface PyramidSlide {
  layout: "pyramid";
  title: string;
  /** Index 0 = TOP (narrowest/most important), last index = BOTTOM (widest/foundational) */
  levels: Array<{ label: string; description?: string }>;
}

export interface SwotSlide {
  layout: "swot";
  title: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface HighlightSlide {
  layout: "highlight";
  title?: string;
  message: string;
  subtext?: string;
  features?: Array<{ heading: string; description?: string }>;
  imageData?: string;
  imageMime?: string;
}

// ─── Hana Securities custom layouts ───────────────────────────────────────────

export interface HanaKpiSlide {
  layout: "hana_kpi";
  title: string;
  kpis: Array<{ value: string; label: string; change?: string; positive?: boolean }>;
}

export interface HanaTimelineSlide {
  layout: "hana_timeline";
  title: string;
  periods: Array<{ period: string; value: string; label?: string; growth?: string }>;
}

export interface HanaDividerSlide {
  layout: "hana_divider";
  title: string;
  number: string;
  subtitle?: string;
}

export interface HanaMatrixSlide {
  layout: "hana_matrix";
  title: string;
  topLeft: { label: string; items: string[] };
  topRight: { label: string; items: string[] };
  bottomLeft: { label: string; items: string[] };
  bottomRight: { label: string; items: string[] };
  xAxis?: string;
  yAxis?: string;
}

export interface HanaOrgSlide {
  layout: "hana_org";
  title: string;
  root: { label: string; role?: string };
  children: Array<{ label: string; role?: string }>;
}

// ─── Chart layouts ────────────────────────────────────────────────────────────

/** Shared series format for all chart types */
export interface ChartSeries {
  name: string;
  values: number[];
}

export interface ChartBarSlide {
  layout: "chart_bar";
  title: string;
  subtitle?: string;
  /** X-axis labels (categories) */
  labels: string[];
  /** One or more data series */
  series: ChartSeries[];
  /** "horizontal" for bar, "vertical" (default) for column */
  orientation?: "horizontal" | "vertical";
  /** Optional source note shown below chart */
  source?: string;
}

export interface ChartPieSlide {
  layout: "chart_pie";
  title: string;
  subtitle?: string;
  labels: string[];
  values: number[];
  source?: string;
}

export interface ChartLineSlide {
  layout: "chart_line";
  title: string;
  subtitle?: string;
  labels: string[];
  series: ChartSeries[];
  source?: string;
}

export type AnySlide =
  | TitleSlide
  | ContentSlide
  | TwoColumnSlide
  | TableSlide
  | SectionSlide
  | ClosingSlide
  | AgendaSlide
  | GridSlide
  | ProcessSlide
  | TimelineSlide
  | ComparisonSlide
  | StatsSlide
  | QuoteSlide
  | PyramidSlide
  | SwotSlide
  | HighlightSlide
  | SceneSlide
  | HanaKpiSlide
  | HanaTimelineSlide
  | HanaDividerSlide
  | HanaMatrixSlide
  | HanaOrgSlide
  | ChartBarSlide
  | ChartPieSlide
  | ChartLineSlide;

// ─── Slide template (corporate header/footer) ─────────────────────────────────

export interface TemplateStrip {
  left?: string;
  center?: string;
  right?: string;
  logoBase64?: string;
  logoSide?: "left" | "right";
  logoWidth?: number;
  bgColor?: string;
  textColor?: string;
  height?: number;
}

export interface SlideTemplate {
  topStrip?: TemplateStrip;
  bottomStrip?: TemplateStrip & {
    showPageNumber?: boolean;
    borderTopColor?: string;
  };
  skipLayouts?: SlideLayout[];
}

export interface PptPresentation {
  title: string;
  theme: ThemeId;
  /** Design preset to use (defaults to DEFAULT_PRESET_ID = "hana-report-clean") */
  presetId?: string;
  slides: AnySlide[];
  template?: SlideTemplate;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const SLIDE_W = 10;
const SLIDE_H = 5.625;
const TITLE_BAR_H = 0.85;

// Native shadow applied to all floating card shapes
const CARD_SHADOW = {
  type: "outer" as const,
  blur: 5,
  offset: 2,
  opacity: 0.18,
  color: "000000",
  angle: 45,
};

function hex(h: string) {
  return h.replace("#", "");
}

// ─── Design token helpers (Gamma-quality) ─────────────────────────────────────

/**
 * Apply gradient background + decorative elements to a full-bleed slide (title/section/closing).
 * @param variant "section" uses sectionBg as primary fill; default uses primary
 */
function applyBackground(
  pres: pptxgen,
  slide: pptxgen.Slide,
  style: SlideStyle,
  variant: "default" | "section" = "default"
) {
  const c = style.colors;
  const primary   = variant === "section" ? c.sectionBg : c.primary;
  const secondary = c.secondary;

  slide.background = { color: hex(primary) };

  // 3-step bottom-to-top darkening gradient simulation
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: SLIDE_H * 0.72, w: SLIDE_W, h: SLIDE_H * 0.28,
    fill: { color: "000000", transparency: 62 },
    line: { color: "000000", transparency: 100 },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: SLIDE_H * 0.5, w: SLIDE_W, h: SLIDE_H * 0.25,
    fill: { color: "000000", transparency: 82 },
    line: { color: "000000", transparency: 100 },
  });

  // Decorative circles from preset chrome (fall back to built-in pattern)
  const decorations = style.chrome.decorations.filter(
    (d) => d.type === "circle" && (d as { r: number }).r > 1
  );

  if (decorations.length > 0) {
    for (const d of decorations as Array<{ type: "circle"; x: number; y: number; r: number; color: string; opacity: number }>) {
      const transparency = Math.round(100 - d.opacity);
      slide.addShape(pres.ShapeType.ellipse, {
        x: d.x - d.r, y: d.y - d.r, w: d.r * 2, h: d.r * 2,
        fill: { color: hex(d.color), transparency },
        line: { color: hex(d.color), transparency: 100 },
      });
    }
  } else {
    // Built-in fallback decorative circles
    slide.addShape(pres.ShapeType.ellipse, {
      x: SLIDE_W - 3.0, y: -2.4, w: 5.8, h: 5.8,
      fill: { color: "FFFFFF", transparency: 78 },
      line: { color: "FFFFFF", transparency: 100 },
    });
    slide.addShape(pres.ShapeType.ellipse, {
      x: -2.0, y: SLIDE_H - 2.0, w: 4.4, h: 4.4,
      fill: { color: "FFFFFF", transparency: 80 },
      line: { color: "FFFFFF", transparency: 100 },
    });
    slide.addShape(pres.ShapeType.ellipse, {
      x: SLIDE_W * 0.55, y: SLIDE_H * 0.2, w: 2.4, h: 2.4,
      fill: { color: hex(secondary), transparency: 55 },
      line: { color: hex(secondary), transparency: 100 },
    });
  }
}

function addCardBlock(
  pres: pptxgen,
  slide: pptxgen.Slide,
  opts: { x: number; y: number; w: number; h: number; accent: string; bg?: string }
) {
  slide.addShape(pres.ShapeType.roundRect, {
    x: opts.x, y: opts.y, w: opts.w, h: opts.h,
    fill: { color: hex(opts.bg ?? "FFFFFF") },
    line: { color: hex(opts.accent), width: 0.4, transparency: 70 },
    rectRadius: 0.1,
    shadow: CARD_SHADOW,
  });
  // Top accent bar (rounded at top only — use narrow rect at top edge)
  slide.addShape(pres.ShapeType.rect, {
    x: opts.x + 0.1, y: opts.y, w: opts.w - 0.2, h: 0.06,
    fill: { color: hex(opts.accent) },
    line: { color: hex(opts.accent) },
  });
}

function addBigNumber(
  slide: pptxgen.Slide,
  text: string,
  opts: { x: number; y: number; w: number; h: number; color: string; fontSize?: number; fontFace?: string }
) {
  slide.addText(text, {
    x: opts.x, y: opts.y, w: opts.w, h: opts.h,
    fontSize: opts.fontSize ?? 52,
    fontFace: opts.fontFace ?? "맑은 고딕",
    color: hex(opts.color),
    bold: true,
    align: "center",
    valign: "middle",
  });
}

function addIconChip(
  pres: pptxgen,
  slide: pptxgen.Slide,
  opts: { x: number; y: number; size: number; color: string; bgColor: string; symbol?: string }
) {
  slide.addShape(pres.ShapeType.ellipse, {
    x: opts.x, y: opts.y, w: opts.size, h: opts.size,
    fill: { color: hex(opts.bgColor), transparency: 15 },
    line: { color: hex(opts.bgColor), transparency: 100 },
  });
  if (opts.symbol) {
    slide.addText(opts.symbol, {
      x: opts.x, y: opts.y, w: opts.size, h: opts.size,
      fontSize: opts.size * 20,
      color: hex(opts.color),
      align: "center", valign: "middle",
    });
  }
}

function addBadge(
  _pres: pptxgen,
  slide: pptxgen.Slide,
  text: string,
  opts: { x: number; y: number; color: string; bgColor?: string; w?: number; h?: number }
) {
  const w = opts.w ?? Math.max(0.85, text.length * 0.1 + 0.45);
  const h = opts.h ?? 0.28;
  slide.addShape("rect" as pptxgen.SHAPE_NAME, {
    x: opts.x, y: opts.y, w, h,
    fill: { color: hex(opts.bgColor ?? opts.color), transparency: opts.bgColor ? 0 : 85 },
    line: { color: hex(opts.color), transparency: 100 },
    rectRadius: 0.14,
  });
  slide.addText(text, {
    x: opts.x, y: opts.y, w, h,
    fontSize: 9,
    fontFace: "맑은 고딕",
    color: hex(opts.color),
    bold: true,
    align: "center",
    valign: "middle",
  });
}

// ─── Template strips ──────────────────────────────────────────────────────────

function applyTopStrip(
  pres: pptxgen,
  slide: pptxgen.Slide,
  strip: TemplateStrip,
  style: SlideStyle
) {
  const h = strip.height ?? 0.38;
  const bg = strip.bgColor ?? style.colors.secondary;
  const tc = strip.textColor ?? "FFFFFF";
  const ff = style.fonts.body;
  const logoW = strip.logoWidth ?? 1.2;
  const logoLeft = (strip.logoSide ?? "left") === "left";

  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h,
    fill: { color: hex(bg) }, line: { color: hex(bg) },
  });

  if (strip.logoBase64) {
    const lx = logoLeft ? 0.12 : SLIDE_W - logoW - 0.12;
    slide.addImage({ data: strip.logoBase64, x: lx, y: 0.04, w: logoW, h: h - 0.08 });
  }

  const sw = 3.0;
  const lo = strip.logoBase64 ? logoW + 0.25 : 0;
  if (strip.left) {
    slide.addText(strip.left, {
      x: logoLeft && strip.logoBase64 ? lo + 0.12 : 0.18, y: 0, w: sw, h,
      fontSize: 9, fontFace: ff, color: hex(tc), align: "left", valign: "middle",
    });
  }
  if (strip.center) {
    slide.addText(strip.center, {
      x: sw, y: 0, w: SLIDE_W - sw * 2, h,
      fontSize: 9, fontFace: ff, color: hex(tc), align: "center", valign: "middle",
    });
  }
  if (strip.right) {
    slide.addText(strip.right, {
      x: SLIDE_W - sw - 0.18, y: 0, w: sw, h,
      fontSize: 9, fontFace: ff, color: hex(tc), align: "right", valign: "middle",
    });
  }
}

function applyBottomStrip(
  pres: pptxgen,
  slide: pptxgen.Slide,
  strip: SlideTemplate["bottomStrip"] & object,
  style: SlideStyle,
  slideNumber: number
) {
  const h = strip.height ?? 0.38;
  const y = SLIDE_H - h;
  const bg = strip.bgColor ?? "F3F4F6";
  const tc = strip.textColor ?? "9CA3AF";
  const ff = style.fonts.body;
  const logoW = strip.logoWidth ?? 1.2;
  const logoLeft = (strip.logoSide ?? "left") === "left";

  if (strip.borderTopColor) {
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y, w: SLIDE_W, h: 0.012,
      fill: { color: hex(strip.borderTopColor) }, line: { color: hex(strip.borderTopColor) },
    });
  }
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y, w: SLIDE_W, h,
    fill: { color: hex(bg) }, line: { color: hex(bg) },
  });
  if (strip.logoBase64) {
    const lx = logoLeft ? 0.12 : SLIDE_W - logoW - 0.12;
    slide.addImage({ data: strip.logoBase64, x: lx, y: y + 0.05, w: logoW, h: h - 0.1 });
  }
  const sw = 3.0;
  if (strip.left) {
    slide.addText(strip.left, {
      x: 0.18, y, w: sw, h,
      fontSize: 8, fontFace: ff, color: hex(tc), align: "left", valign: "middle",
    });
  }
  if (strip.center) {
    slide.addText(strip.center, {
      x: sw, y, w: SLIDE_W - sw * 2, h,
      fontSize: 8, fontFace: ff, color: hex(tc), align: "center", valign: "middle",
    });
  }
  const rightText = strip.showPageNumber ? String(slideNumber) : (strip.right ?? "");
  if (rightText) {
    slide.addText(rightText, {
      x: SLIDE_W - sw - 0.18, y, w: sw, h,
      fontSize: 8, fontFace: ff, color: hex(tc), align: "right", valign: "middle",
    });
  }
}

// ─── Shared: slide title bar ──────────────────────────────────────────────────

// Module-level slide index used by addTitleBar for chrome variation.
// Set by buildPptx before each slide render.
let __currentSlideIdx = 0;

function addTitleBar(
  pres: pptxgen,
  slide: pptxgen.Slide,
  title: string,
  style: SlideStyle,
  topOffset: number = 0,
  footerH: number = 0
) {
  const c = style.colors;
  const f = style.fonts;
  const tbStyle = style.chrome.titleBar.style;
  const tbH     = style.chrome.titleBar.heightInches ?? TITLE_BAR_H;
  const tbBg    = style.chrome.titleBar.bgColor ?? c.primary;
  const y = topOffset;
  const idx = __currentSlideIdx;

  if (tbStyle === "minimal-underline") {
    // Thin bottom-border only
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y, w: SLIDE_W, h: tbH,
      fill: { color: hex(c.background) }, line: { color: hex(c.background) },
    });
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: y + tbH - 0.04, w: SLIDE_W, h: 0.04,
      fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
    });
    slide.addText(title, {
      x: 0.25, y, w: SLIDE_W - 0.5, h: tbH - 0.04,
      fontSize: f.size.slideTitle, fontFace: f.title,
      color: hex(c.titleText), bold: true, align: "left", valign: "middle",
    });
  } else if (tbStyle === "left-accent") {
    // No full-bleed bg — just left accent + text
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y, w: 0.28, h: tbH,
      fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
    });
    slide.addText(title, {
      x: 0.40, y, w: SLIDE_W - 0.55, h: tbH,
      fontSize: f.size.slideTitle, fontFace: f.title,
      color: hex(c.titleText), bold: true, align: "left", valign: "middle",
    });
  } else {
    // "full-bleed" (default — matches hana-securities style)
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y, w: SLIDE_W, h: tbH,
      fill: { color: hex(tbBg) }, line: { color: hex(tbBg) },
    });
    // Left accent stripe
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y, w: 0.14, h: tbH,
      fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
    });
    // Bottom accent line
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: y + tbH - 0.06, w: SLIDE_W, h: 0.06,
      fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
    });
    // Decorative title-bar circle (right side)
    const smallCircles = style.chrome.decorations.filter(
      (d) => d.type === "circle" && (d as { r: number }).r < 1.5
    ) as Array<{ type: "circle"; x: number; y: number; r: number; color: string; opacity: number }>;
    if (smallCircles.length > 0) {
      const dc = smallCircles[0]!;
      const transparency = Math.round(100 - dc.opacity);
      slide.addShape(pres.ShapeType.ellipse, {
        x: dc.x - dc.r, y: (dc.y - dc.r) + topOffset, w: dc.r * 2, h: dc.r * 2,
        fill: { color: hex(dc.color), transparency },
        line: { color: hex(dc.color), transparency: 100 },
      });
    } else {
      slide.addShape(pres.ShapeType.ellipse, {
        x: SLIDE_W - 1.1, y: y - 0.55, w: 1.8, h: 1.8,
        fill: { color: "FFFFFF", transparency: 75 },
        line: { color: "FFFFFF", transparency: 100 },
      });
    }
    // Title text
    slide.addText(title, {
      x: 0.25, y, w: SLIDE_W - 1.4, h: tbH - 0.04,
      fontSize: f.size.slideTitle, fontFace: f.title,
      color: "FFFFFF", bold: true, align: "left", valign: "middle",
    });
  }

  // Slide body background
  const bodyY = y + tbH;
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: bodyY, w: SLIDE_W, h: SLIDE_H - bodyY - footerH,
    fill: { color: hex(c.background) }, line: { color: hex(c.background) },
  });
  // Body watermark circle — varies by slide index to avoid "stamp" look
  // Rotates through: bottom-right primary / bottom-left secondary / top-right accent
  const wmVariants = [
    { x: SLIDE_W - 2.2, y: SLIDE_H - footerH - 2.2, r: 1.7, color: c.primary,    t: 94 },
    { x: -1.4,          y: SLIDE_H - footerH - 1.8, r: 1.6, color: c.secondary,  t: 92 },
    { x: SLIDE_W - 1.8, y: bodyY + 0.15,            r: 1.3, color: c.tertiary ?? c.accentCool ?? c.primary, t: 95 },
    { x: SLIDE_W * 0.35,y: SLIDE_H - footerH - 1.6, r: 1.4, color: c.accentWarm ?? c.secondary, t: 94 },
  ];
  const wmChoice = wmVariants[idx % wmVariants.length]!;
  slide.addShape(pres.ShapeType.ellipse, {
    x: wmChoice.x, y: wmChoice.y, w: wmChoice.r * 2, h: wmChoice.r * 2,
    fill: { color: hex(wmChoice.color), transparency: wmChoice.t },
    line: { color: hex(wmChoice.color), transparency: wmChoice.t },
  });

  // Additional micro-decoration: subtle corner triangle/dot varying by idx
  if (idx % 3 === 1) {
    slide.addShape(pres.ShapeType.ellipse, {
      x: 0.25, y: SLIDE_H - footerH - 0.55, w: 0.18, h: 0.18,
      fill: { color: hex(c.accentWarm ?? c.secondary) },
      line: { color: hex(c.accentWarm ?? c.secondary) },
    });
  }
}

// ─── TITLE slide (Gamma deep gradient style) ─────────────────────────────────

function buildTitleSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: TitleSlide,
  style: SlideStyle
) {
  const c = style.colors;
  const f = style.fonts;

  // Deep gradient background
  applyBackground(pres, slide, style);

  // Left accent bar (secondary, partial height — 0.18 wide for impact)
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: SLIDE_H * 0.08, w: 0.18, h: SLIDE_H * 0.84,
    fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
  });

  // Tag badge (optional)
  let titleY = SLIDE_H * 0.08;
  if (data.tag) {
    addBadge(pres, slide, data.tag, {
      x: 0.45, y: titleY, color: c.secondary, bgColor: c.secondary,
    });
    titleY += 0.42;
  }

  // Main title — 3-tier typography
  slide.addText(data.title, {
    x: 0.45, y: titleY, w: SLIDE_W - 1.8, h: SLIDE_H * 0.52,
    fontSize: f.size.mainTitle + 8, fontFace: f.title,
    color: "FFFFFF", bold: true,
    align: "left", valign: "middle", wrap: true,
    lineSpacingMultiple: 1.15,
  });

  // Horizontal accent divider
  const dividerY = data.tag ? SLIDE_H * 0.66 : SLIDE_H * 0.68;
  slide.addShape(pres.ShapeType.rect, {
    x: 0.45, y: dividerY, w: SLIDE_W * 0.45, h: 0.045,
    fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
  });

  // Subtitle
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.45, y: dividerY + 0.08, w: SLIDE_W - 1.8, h: 0.55,
      fontSize: f.size.body + 2, fontFace: f.body,
      color: "DDDDDD", align: "left", valign: "middle",
    });
  }

  // Date
  const dateStr = data.date ?? new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });
  slide.addText(dateStr, {
    x: 0.45, y: SLIDE_H - 0.55, w: SLIDE_W - 0.9, h: 0.38,
    fontSize: f.size.caption + 1, fontFace: f.body,
    color: hex(c.secondary), align: "left",
  });
}

// ─── SECTION slide ────────────────────────────────────────────────────────────

function buildSectionSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: SectionSlide,
  style: SlideStyle,
  topOffset: number = 0,
  footerH: number = 0
) {
  const c = style.colors;
  const f = style.fonts;
  const usable = SLIDE_H - topOffset - footerH;
  const midY = topOffset + usable / 2;
  const sectionStyle = style.sectionSlide.style;

  if (sectionStyle === "numbered") {
    // ── "numbered" variant: white bg + left big roman/arabic number + red underline ──
    slide.background = { color: "FFFFFF" };

    // Large section number on the left (vertically centred)
    const bigNumX = 0.5;
    const bigNumW = 2.2;
    slide.addText(data.subtitle ?? "", {
      x: bigNumX, y: midY - 1.8, w: bigNumW, h: 3.6,
      fontSize: 140, fontFace: f.title, bold: true,
      color: hex(c.secondary),
      align: "left", valign: "middle",
    });

    // Bold red horizontal separator line at ~40% from top
    const lineY = topOffset + usable * 0.42;
    slide.addShape(pres.ShapeType.rect, {
      x: bigNumX + bigNumW + 0.1, y: lineY - 0.055, w: SLIDE_W - bigNumX - bigNumW - 0.7, h: 0.11,
      fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
    });

    // Section title — right of the number, above the line
    slide.addText(data.title, {
      x: bigNumX + bigNumW + 0.2, y: topOffset + usable * 0.12, w: SLIDE_W - bigNumX - bigNumW - 0.7, h: usable * 0.26,
      fontSize: f.size.sectionTitle, fontFace: f.title,
      color: hex(c.primary), bold: true, align: "left", valign: "bottom",
      lineSpacingMultiple: 1.15,
    });

    // Optional description text below the line
    if (data.subtitle && data.subtitle.length < 5) {
      // subtitle was used as the number — no extra text needed
    } else if (data.subtitle && data.subtitle.length >= 5) {
      slide.addText(data.subtitle, {
        x: bigNumX + bigNumW + 0.2, y: lineY + 0.18, w: SLIDE_W - bigNumX - bigNumW - 0.7, h: usable * 0.28,
        fontSize: f.size.body + 2, fontFace: f.body,
        color: hex(c.bodyText), align: "left", valign: "top",
      });
    }

    // Watermark circle (bottom-right, very subtle)
    slide.addShape(pres.ShapeType.ellipse, {
      x: SLIDE_W - 3.2, y: SLIDE_H - 3.2, w: 5.5, h: 5.5,
      fill: { color: hex(c.primary), transparency: 95 },
      line: { color: hex(c.primary), transparency: 100 },
    });
  } else {
    // ── Default: deep gradient + left vertical bar + title ──
    applyBackground(pres, slide, style, "section");

    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: 0.55, h: SLIDE_H,
      fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
    });
    slide.addShape(pres.ShapeType.rect, {
      x: 0.85, y: midY - 0.05, w: 1.4, h: 0.1,
      fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
    });
    slide.addText(data.title, {
      x: 1.2, y: midY - 0.85, w: SLIDE_W - 1.8, h: 1.7,
      fontSize: f.size.sectionTitle, fontFace: f.title,
      color: "FFFFFF", bold: true, align: "left", valign: "middle",
      lineSpacingMultiple: 1.2,
    });
    if (data.subtitle) {
      slide.addText(data.subtitle, {
        x: 1.2, y: midY + 0.88, w: SLIDE_W - 2.0, h: 0.65,
        fontSize: f.size.body, fontFace: f.body,
        color: hex(c.secondary), align: "left",
      });
    }
  }
}

// ─── CONTENT slide ────────────────────────────────────────────────────────────
//
//  ≤ 4 bullets  → Card row layout (each bullet = colored card with left accent)
//  5–9 bullets  → Numbered circle bullets
// ≥ 10 bullets  → Compact plain list, auto-scaled font

function buildContentSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: ContentSlide,
  style: SlideStyle,
  topOffset: number = 0,
  footerH: number = 0
) {
  const c = style.colors;
  const f = style.fonts;

  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const bullets = (data.bullets ?? []).filter(Boolean);
  const bodyY = topOffset + TITLE_BAR_H;
  const bodyH = SLIDE_H - bodyY - footerH;
  const PAD_X = 0.35;

  // Image support: choose side-by-side vs bottom-placed based on bullet count
  //  - ≤ 5 bullets → image(s) on right panel (38% width)
  //  - ≥ 6 bullets → image at bottom (full width, 25% height) so bullets have full width
  const images = (data.imageSlots ?? []).filter((s) => s.data);
  const hasImages = images.length > 0;
  const useRightPanel = hasImages && bullets.length <= 5;
  const useBottomStrip = hasImages && bullets.length >= 6;

  const IMAGE_AREA_W = useRightPanel ? SLIDE_W * 0.38 : 0;
  const IMAGE_AREA_X = useRightPanel ? SLIDE_W - IMAGE_AREA_W - 0.15 : 0;
  const BOTTOM_STRIP_H = useBottomStrip ? Math.min(1.5, bodyH * 0.28) : 0;
  const CONTENT_W = useRightPanel
    ? IMAGE_AREA_X - PAD_X - 0.12
    : SLIDE_W - PAD_X * 2;
  const effBodyH = bodyH - BOTTOM_STRIP_H;

  // Right-panel images (≤5 bullets case)
  if (useRightPanel) {
    const imgCount = Math.min(images.length, 2);
    const singleH = imgCount === 1
      ? bodyH - 0.3
      : (bodyH - 0.35) / 2;
    images.slice(0, 2).forEach((img, idx) => {
      slide.addImage({
        data: `data:${img.mime ?? "image/png"};base64,${img.data}`,
        x: IMAGE_AREA_X,
        y: bodyY + 0.15 + idx * (singleH + 0.12),
        w: IMAGE_AREA_W,
        h: singleH,
      });
    });
  }

  // Bottom-strip images (≥6 bullets case) — horizontal thumbnail strip
  if (useBottomStrip) {
    const stripY = bodyY + effBodyH;
    const n = Math.min(images.length, 3);
    const gap = 0.18;
    const totalGap = gap * (n - 1);
    const imgW = (SLIDE_W - PAD_X * 2 - totalGap) / n;
    const imgH = BOTTOM_STRIP_H - 0.15;
    images.slice(0, n).forEach((img, idx) => {
      slide.addImage({
        data: `data:${img.mime ?? "image/png"};base64,${img.data}`,
        x: PAD_X + idx * (imgW + gap),
        y: stripY + 0.05,
        w: imgW,
        h: imgH,
      });
    });
  }

  if (bullets.length === 0) {
    if (data.notes) slide.addNotes(data.notes);
    return;
  }

  // Extended semantic palette for visual differentiation of cards/bullets
  const CARD_PALETTE = [
    c.primary,
    c.accentWarm ?? c.secondary,
    c.tertiary ?? c.accentCool ?? c.bullet,
    c.accentHR ?? c.primary,
    c.secondary,
    c.accentCool ?? c.bullet,
  ];

  // Determine variant — default auto-pick based on bullet count
  const autoVariant =
    bullets.length <= 4 ? "cards" :
    bullets.length <= 9 ? "numbered" :
    "compact";
  const variant = data.variant ?? autoVariant;

  // Dashboard variant: split content | callout (right side)
  let dashContentW = CONTENT_W;
  if (variant === "dashboard" && data.callout && !useRightPanel) {
    const calloutW = SLIDE_W * 0.32;
    dashContentW = CONTENT_W - calloutW - 0.2;
    const cx = PAD_X + dashContentW + 0.2;
    const cy = bodyY + 0.15;
    const ch = effBodyH - 0.3;
    // Callout panel
    slide.addShape(pres.ShapeType.roundRect, {
      x: cx, y: cy, w: calloutW, h: ch,
      fill: { color: hex(c.primary) }, line: { color: hex(c.primary) },
      rectRadius: 0.12,
      shadow: CARD_SHADOW,
    });
    // Accent corner
    slide.addShape(pres.ShapeType.rect, {
      x: cx, y: cy, w: 0.12, h: ch,
      fill: { color: hex(c.accentWarm ?? c.secondary) },
      line: { color: hex(c.accentWarm ?? c.secondary) },
    });
    if (data.callout.heading) {
      slide.addText(data.callout.heading, {
        x: cx + 0.25, y: cy + 0.25, w: calloutW - 0.4, h: 0.45,
        fontSize: f.size.h3, fontFace: f.title,
        color: "FFFFFF", bold: true, valign: "top",
      });
    }
    if (data.callout.value) {
      slide.addText(data.callout.value, {
        x: cx + 0.25, y: cy + 0.75, w: calloutW - 0.4, h: ch * 0.4,
        fontSize: f.size.displayLarge, fontFace: f.title,
        color: "FFFFFF", bold: true, valign: "middle",
      });
    }
    if (data.callout.description) {
      slide.addText(data.callout.description, {
        x: cx + 0.25, y: cy + ch * 0.65, w: calloutW - 0.4, h: ch * 0.3,
        fontSize: f.size.bodySmall, fontFace: f.body,
        color: "FFFFFF", valign: "top", wrap: true,
      });
    }
  }

  // Pick effective variant — dashboard uses cards layout for bullets
  const effVariant = variant === "dashboard" ? "cards" : variant;

  if (effVariant === "cards") {
    // ── Card row layout ──────────────────────────────────────────────────────
    const cardPad = 0.12;
    const totalGap = cardPad * (bullets.length - 1);
    const cardH = (effBodyH - 0.25 - totalGap) / bullets.length;
    const accentW = 0.22;
    const textPad = 0.16;
    const rowW = dashContentW;

    bullets.forEach((bullet, i) => {
      const cy = bodyY + 0.15 + i * (cardH + cardPad);

      const accentColor = CARD_PALETTE[i % CARD_PALETTE.length];
      slide.addShape(pres.ShapeType.roundRect, {
        x: PAD_X, y: cy, w: rowW, h: cardH,
        fill: { color: hex(c.surface) }, line: { color: hex(c.surface) },
        rectRadius: 0.08,
        shadow: CARD_SHADOW,
      });
      slide.addShape(pres.ShapeType.rect, {
        x: PAD_X, y: cy, w: accentW, h: cardH,
        fill: { color: hex(accentColor) }, line: { color: hex(accentColor) },
      });
      slide.addText(String(i + 1), {
        x: PAD_X, y: cy, w: accentW, h: cardH,
        fontSize: Math.min(16, f.size.body),
        fontFace: f.title, color: "FFFFFF",
        bold: true, align: "center", valign: "middle",
      });
      const fontSize = cardH > 0.55 ? f.size.body : Math.max(12, f.size.body - 2);
      slide.addText(bullet, {
        x: PAD_X + accentW + textPad,
        y: cy,
        w: rowW - accentW - textPad - 0.1,
        h: cardH,
        fontSize, fontFace: f.body,
        color: hex(c.bodyText),
        valign: "middle", wrap: true,
      });
    });

  } else if (variant === "icon_rows") {
    // ── Icon-style card rows (colored left marker, no number) ──────────────
    const cardPad = 0.1;
    const rowH = (effBodyH - 0.25 - cardPad * (bullets.length - 1)) / bullets.length;
    const markerW = 0.4;
    bullets.forEach((bullet, i) => {
      const cy = bodyY + 0.15 + i * (rowH + cardPad);
      const col = CARD_PALETTE[i % CARD_PALETTE.length];
      slide.addShape(pres.ShapeType.roundRect, {
        x: PAD_X, y: cy, w: dashContentW, h: rowH,
        fill: { color: hex(c.surface) }, line: { color: hex(c.surface) },
        rectRadius: 0.08, shadow: CARD_SHADOW,
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: PAD_X + 0.1, y: cy + (rowH - markerW) / 2, w: markerW, h: markerW,
        fill: { color: hex(col) }, line: { color: hex(col) },
      });
      slide.addText(String(i + 1), {
        x: PAD_X + 0.1, y: cy + (rowH - markerW) / 2, w: markerW, h: markerW,
        fontSize: Math.max(10, markerW * 22), fontFace: f.title,
        color: "FFFFFF", bold: true, align: "center", valign: "middle",
      });
      slide.addText(bullet, {
        x: PAD_X + 0.15 + markerW + 0.12, y: cy,
        w: dashContentW - markerW - 0.4, h: rowH,
        fontSize: f.size.bodyLarge, fontFace: f.body,
        color: hex(c.bodyText), valign: "middle", wrap: true,
      });
    });

  } else if (variant === "numbered") {
    // ── Numbered circle bullets ───────────────────────────────────────────────
    const fontSize = bullets.length <= 6 ? f.size.bullet : Math.max(11, f.size.bullet - 2);
    const lineH = (effBodyH - 0.3) / bullets.length;
    const circleSize = Math.min(0.3, lineH * 0.7);

    bullets.forEach((bullet, i) => {
      const by = bodyY + 0.15 + i * lineH;

      // Circle marker with rotating palette color
      const circleColor = CARD_PALETTE[i % CARD_PALETTE.length];
      slide.addShape(pres.ShapeType.ellipse, {
        x: PAD_X, y: by + (lineH - circleSize) / 2,
        w: circleSize, h: circleSize,
        fill: { color: hex(circleColor) },
        line: { color: hex(circleColor) },
      });
      // Number inside circle
      slide.addText(String(i + 1), {
        x: PAD_X, y: by + (lineH - circleSize) / 2,
        w: circleSize, h: circleSize,
        fontSize: Math.max(7, circleSize * 18),
        fontFace: f.title, color: "FFFFFF",
        bold: true, align: "center", valign: "middle",
      });
      // Thin separator line (except last)
      if (i < bullets.length - 1) {
        slide.addShape(pres.ShapeType.rect, {
          x: PAD_X, y: by + lineH - 0.01,
          w: CONTENT_W, h: 0.01,
          fill: { color: hex(c.surface) }, line: { color: hex(c.surface) },
        });
      }
      // Bullet text
      slide.addText(bullet, {
        x: PAD_X + circleSize + 0.18,
        y: by,
        w: CONTENT_W - circleSize - 0.22,
        h: lineH,
        fontSize, fontFace: f.body,
        color: hex(c.bodyText),
        valign: "middle", wrap: true,
      });
    });

  } else {
    // ── Compact list (10+ bullets) ────────────────────────────────────────────
    const fontSize = Math.max(9, Math.min(f.size.bullet - 1, Math.floor((effBodyH - 0.3) / bullets.length * 14)));
    const items = bullets.map((b) => ({
      text: b,
      options: {
        bullet: { code: "25A0" }, // ▪ square bullet
        color: hex(c.bodyText),
        fontSize,
        paraSpaceAfter: 3,
      },
    }));
    slide.addText(items, {
      x: PAD_X, y: bodyY + 0.15,
      w: CONTENT_W, h: effBodyH - 0.25,
      fontFace: f.body, valign: "top",
    });
  }

  if (data.notes) slide.addNotes(data.notes);
}

// ─── TWO-COLUMN slide ─────────────────────────────────────────────────────────

function buildTwoColumnSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: TwoColumnSlide,
  style: SlideStyle,
  topOffset: number = 0,
  footerH: number = 0
) {
  const c = style.colors;
  const f = style.fonts;

  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const bodyY = topOffset + TITLE_BAR_H + 0.1;
  const bodyH = SLIDE_H - bodyY - footerH - 0.1;
  const GAP = 0.18;
  const colW = (SLIDE_W - 0.5 - GAP) / 2;
  const HEAD_H = 0.42;
  const leftX = 0.25;
  const rightX = leftX + colW + GAP;

  // ─ Left column — roundRect card with shadow ─
  slide.addShape(pres.ShapeType.roundRect, {
    x: leftX, y: bodyY, w: colW, h: bodyH,
    fill: { color: hex(c.surface) }, line: { color: hex(c.secondary), width: 0.5, transparency: 60 },
    rectRadius: 0.1,
    shadow: CARD_SHADOW,
  });
  slide.addShape(pres.ShapeType.rect, {
    x: leftX, y: bodyY, w: colW, h: HEAD_H,
    fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: leftX, y: bodyY + HEAD_H, w: 0.08, h: bodyH - HEAD_H,
    fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
  });
  slide.addText(data.left.heading, {
    x: leftX, y: bodyY, w: colW, h: HEAD_H,
    fontSize: f.size.body, fontFace: f.title,
    color: "FFFFFF", bold: true, align: "center", valign: "middle",
  });

  // ─ Right column — roundRect card with shadow ─
  slide.addShape(pres.ShapeType.roundRect, {
    x: rightX, y: bodyY, w: colW, h: bodyH,
    fill: { color: hex(c.surface) }, line: { color: hex(c.primary), width: 0.5, transparency: 60 },
    rectRadius: 0.1,
    shadow: CARD_SHADOW,
  });
  slide.addShape(pres.ShapeType.rect, {
    x: rightX, y: bodyY, w: colW, h: HEAD_H,
    fill: { color: hex(c.primary) }, line: { color: hex(c.primary) },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: rightX, y: bodyY + HEAD_H, w: 0.08, h: bodyH - HEAD_H,
    fill: { color: hex(c.primary) }, line: { color: hex(c.primary) },
  });
  slide.addText(data.right.heading, {
    x: rightX, y: bodyY, w: colW, h: HEAD_H,
    fontSize: f.size.body, fontFace: f.title,
    color: "FFFFFF", bold: true, align: "center", valign: "middle",
  });

  // Left bullets
  const leftItems = (data.left.bullets ?? []).map((b) => ({
    text: b,
    options: {
      bullet: { code: "2022" },
      color: hex(c.bodyText),
      fontSize: f.size.bullet - 1,
      paraSpaceAfter: 5,
    },
  }));
  slide.addText(leftItems, {
    x: leftX + 0.18, y: bodyY + HEAD_H + 0.1,
    w: colW - 0.22, h: bodyH - HEAD_H - 0.15,
    fontFace: f.body, valign: "top",
  });

  // Right bullets
  const rightItems = (data.right.bullets ?? []).map((b) => ({
    text: b,
    options: {
      bullet: { code: "2022" },
      color: hex(c.bodyText),
      fontSize: f.size.bullet - 1,
      paraSpaceAfter: 5,
    },
  }));
  slide.addText(rightItems, {
    x: rightX + 0.18, y: bodyY + HEAD_H + 0.1,
    w: colW - 0.22, h: bodyH - HEAD_H - 0.15,
    fontFace: f.body, valign: "top",
  });

  if (data.notes) slide.addNotes(data.notes);
}

// ─── TABLE slide ──────────────────────────────────────────────────────────────

function buildTableSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: TableSlide,
  style: SlideStyle,
  topOffset: number = 0,
  footerH: number = 0
) {
  const c = style.colors;
  const f = style.fonts;

  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const tableY = topOffset + TITLE_BAR_H + 0.18;
  const tableH = SLIDE_H - tableY - footerH - 0.15;
  const rowCount = (data.rows ?? []).length + 1;
  const rowH = Math.min(0.44, (tableH) / rowCount);

  const tableData: pptxgen.TableRow[] = [
    (data.headers ?? []).map((h) => ({
      text: h,
      options: {
        bold: true, color: "FFFFFF",
        fill: { color: hex(c.tableHeader) },
        fontSize: f.size.body - 1, fontFace: f.title,
        align: "center" as pptxgen.HAlign, valign: "middle" as pptxgen.VAlign,
      },
    })),
    ...(data.rows ?? []).map((row, ri) =>
      (row ?? []).map((cell) => ({
        text: cell,
        options: {
          color: hex(c.bodyText),
          fill: { color: ri % 2 === 0 ? hex(c.tableRow1) : hex(c.tableRow2) },
          fontSize: f.size.body - 2, fontFace: f.body,
          align: "center" as pptxgen.HAlign, valign: "middle" as pptxgen.VAlign,
        },
      }))
    ),
  ];

  slide.addTable(tableData, {
    x: 0.3, y: tableY, w: SLIDE_W - 0.6, rowH,
    border: { type: "solid", color: hex(c.surface), pt: 1 },
    fontSize: f.size.body - 1, fontFace: f.body,
  });

  if (data.notes) slide.addNotes(data.notes);
}

// ─── CLOSING slide ────────────────────────────────────────────────────────────

function buildClosingSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: ClosingSlide,
  style: SlideStyle
) {
  const c = style.colors;
  const f = style.fonts;
  const cx = SLIDE_W / 2;
  const cy = SLIDE_H / 2;

  // Deep gradient background
  applyBackground(pres, slide, style);

  // Horizontal accent lines above and below main text
  slide.addShape(pres.ShapeType.rect, {
    x: cx - 1.8, y: cy - 0.92, w: 3.6, h: 0.04,
    fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: cx - 1.8, y: cy + 0.88, w: 3.6, h: 0.04,
    fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
  });

  // Main title (large, centered, white)
  slide.addText(data.title, {
    x: 0.5, y: cy - 0.88, w: SLIDE_W - 1.0, h: 1.76,
    fontSize: f.size.sectionTitle + 4, fontFace: f.title,
    color: "FFFFFF", bold: true, align: "center", valign: "middle",
  });
  // Subtitle
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.5, y: cy + 0.95, w: SLIDE_W - 1.0, h: 0.62,
      fontSize: f.size.body + 1, fontFace: f.body,
      color: hex(c.secondary), align: "center",
    });
  }
  // Contact
  if (data.contact) {
    slide.addText(data.contact, {
      x: 0.5, y: SLIDE_H - 0.68, w: SLIDE_W - 1.0, h: 0.4,
      fontSize: f.size.caption, fontFace: f.body,
      color: "BBBBBB", align: "center",
    });
  }
}

// ─── AGENDA slide ─────────────────────────────────────────────────────────────
// Numbered list with large index badges and text rows

function buildAgendaSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: AgendaSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;

  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const items = (data.items ?? []).slice(0, 6);
  const bodyY = topOffset + TITLE_BAR_H + 0.15;
  const bodyH = SLIDE_H - bodyY - footerH - 0.1;
  const itemH = bodyH / Math.max(items.length, 1);

  // Roman numerals for up to 6 items
  const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];
  const NUM_W = 0.85;
  const PAD_LEFT = 0.35;
  const GAP = 0.18;

  items.forEach((item, i) => {
    const iy = bodyY + i * itemH;
    const numStr = item.number ?? ROMAN[i] ?? String(i + 1);
    const isEven = i % 2 === 0;

    // Subtle alternating row tint
    if (!isEven) {
      slide.addShape(pres.ShapeType.rect, {
        x: 0, y: iy, w: SLIDE_W, h: itemH,
        fill: { color: hex(c.surface), transparency: 40 },
        line: { color: hex(c.surface), transparency: 100 },
      });
    }

    // Large roman numeral — primary color, no background
    const numFS = Math.min(22, Math.max(13, itemH * 28));
    slide.addText(numStr, {
      x: PAD_LEFT, y: iy, w: NUM_W, h: itemH,
      fontSize: numFS, fontFace: f.title, bold: true,
      color: hex(c.primary), align: "center", valign: "middle",
    });

    // Thin vertical separator
    slide.addShape(pres.ShapeType.rect, {
      x: PAD_LEFT + NUM_W + 0.05, y: iy + itemH * 0.18, w: 0.025, h: itemH * 0.64,
      fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
    });

    // Heading + description
    const textX = PAD_LEFT + NUM_W + GAP + 0.06;
    const textW = SLIDE_W - textX - 0.25;
    const headingSize = Math.min(16, Math.max(10, itemH * 20));
    const descSize = Math.max(8, headingSize - 3);

    if (item.description) {
      slide.addText(item.heading, {
        x: textX, y: iy + itemH * 0.07, w: textW, h: itemH * 0.46,
        fontSize: headingSize, fontFace: f.title,
        color: hex(c.bodyText), bold: true, valign: "bottom",
      });
      slide.addText(item.description, {
        x: textX, y: iy + itemH * 0.54, w: textW, h: itemH * 0.38,
        fontSize: descSize, fontFace: f.body,
        color: hex(c.mutedText), valign: "top",
      });
    } else {
      slide.addText(item.heading, {
        x: textX, y: iy, w: textW, h: itemH,
        fontSize: headingSize, fontFace: f.title,
        color: hex(c.bodyText), bold: true, valign: "middle",
      });
    }

    // Row divider (not last) — thin secondary color line
    if (i < items.length - 1) {
      slide.addShape(pres.ShapeType.rect, {
        x: PAD_LEFT, y: iy + itemH - 0.018, w: SLIDE_W - PAD_LEFT - 0.25, h: 0.018,
        fill: { color: "E5E7EB" }, line: { color: "E5E7EB" },
      });
    }
  });
}

// ─── GRID slide ───────────────────────────────────────────────────────────────
// Card grid auto-layout: 2→2×1, 3→3×1, 4→2×2, 5-6→3×2

function buildGridSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: GridSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;

  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const items = (data.items ?? []).slice(0, 6);
  const bodyY = topOffset + TITLE_BAR_H + 0.1;
  const bodyH = SLIDE_H - bodyY - footerH - 0.1;

  const n = items.length || 1;
  const cols = n <= 3 ? n : n === 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);

  const GAP = 0.15;
  const cardW = (SLIDE_W - 0.5 - GAP * (cols - 1)) / cols;
  const cardH = (bodyH - GAP * (rows - 1)) / rows;
  const HEADER_H = Math.min(0.4, cardH * 0.28);
  const startX = 0.25;

  // Extended semantic palette — prefer accent colors for visual differentiation
  const accentColors = [
    c.primary,
    c.accentWarm ?? c.secondary,
    c.tertiary ?? c.accentCool ?? c.bullet,
    c.accentHR ?? c.primary,
    c.secondary,
    c.accentCool ?? c.bullet,
  ];

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * (cardW + GAP);
    const cy = bodyY + row * (cardH + GAP);
    const accentColor = accentColors[i];

    // Card body — roundRect + shadow
    slide.addShape(pres.ShapeType.roundRect, {
      x: cx, y: cy, w: cardW, h: cardH,
      fill: { color: hex(c.surface) }, line: { color: hex(c.surface) },
      rectRadius: 0.1,
      shadow: CARD_SHADOW,
    });
    // Color header
    slide.addShape(pres.ShapeType.rect, {
      x: cx, y: cy, w: cardW, h: HEADER_H,
      fill: { color: hex(accentColor) }, line: { color: hex(accentColor) },
    });

    // Symbol in header (if provided)
    if (item.symbol) {
      slide.addText(item.symbol, {
        x: cx, y: cy, w: cardW, h: HEADER_H,
        fontSize: Math.min(20, HEADER_H * 22),
        color: "FFFFFF", align: "center", valign: "middle",
      });
    }

    const headingSize = Math.min(13, Math.max(8, cardH * 9));
    const descSize = Math.max(7, headingSize - 3);

    if (item.description) {
      slide.addText(item.heading, {
        x: cx + 0.12, y: cy + HEADER_H + 0.04,
        w: cardW - 0.24, h: (cardH - HEADER_H) * 0.45,
        fontSize: headingSize, fontFace: f.title,
        color: hex(c.bodyText), bold: true, valign: "bottom", wrap: true,
      });
      slide.addText(item.description, {
        x: cx + 0.12, y: cy + HEADER_H + (cardH - HEADER_H) * 0.48,
        w: cardW - 0.24, h: (cardH - HEADER_H) * 0.48,
        fontSize: descSize, fontFace: f.body,
        color: hex(c.mutedText), valign: "top", wrap: true,
      });
    } else {
      slide.addText(item.heading, {
        x: cx + 0.12, y: cy + HEADER_H,
        w: cardW - 0.24, h: cardH - HEADER_H,
        fontSize: headingSize, fontFace: f.title,
        color: hex(c.bodyText), bold: true, valign: "middle", wrap: true,
      });
    }
  });
}

// ─── PROCESS slide ────────────────────────────────────────────────────────────
// Horizontal chevron flow: 3-5 steps with number + label + description

function buildProcessSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: ProcessSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;

  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const steps = (data.steps ?? []).slice(0, 5);
  const n = steps.length || 1;
  const bodyY = topOffset + TITLE_BAR_H + 0.12;
  const bodyH = SLIDE_H - bodyY - footerH - 0.1;

  // Palette: alternate step colors using extended semantic palette
  const STEP_COLORS = [
    c.primary,
    c.accentWarm ?? c.secondary,
    c.tertiary ?? c.accentCool ?? c.tableHeader ?? "899CB9",
    c.accentHR ?? c.primary,
    c.secondary,
  ];
  const stepW = (SLIDE_W - 0.5) / n;
  const startX = 0.25;

  // Pill label height at top
  const PILL_H = 0.38;
  const ARROW_H = 0.45;
  const arrowY = bodyY + PILL_H + 0.08;
  const descY = arrowY + ARROW_H + 0.08;
  const descH = bodyH - PILL_H - ARROW_H - 0.22;

  steps.forEach((step, i) => {
    const cx = startX + i * stepW;
    const bgColor = STEP_COLORS[i] ?? c.primary;

    // ── Pill label at top ──
    slide.addShape(pres.ShapeType.roundRect, {
      x: cx + 0.06, y: bodyY, w: stepW - 0.12, h: PILL_H,
      fill: { color: hex(bgColor) }, line: { color: hex(bgColor) },
      rectRadius: PILL_H / 2,
    });
    slide.addText(step.label, {
      x: cx + 0.1, y: bodyY, w: stepW - 0.2, h: PILL_H,
      fontSize: Math.min(13, Math.max(8, stepW * 9)),
      fontFace: f.title, color: "FFFFFF", bold: true,
      align: "center", valign: "middle", wrap: true,
    });

    // ── Chevron/pentagon arrow ──
    const isLast = i === n - 1;
    const shapeType = isLast ? pres.ShapeType.pentagon : pres.ShapeType.chevron;
    slide.addShape(shapeType, {
      x: cx, y: arrowY, w: stepW, h: ARROW_H,
      fill: { color: hex(bgColor), transparency: 20 },
      line: { color: hex(bgColor), transparency: 100 },
    });
    // Step number inside chevron
    slide.addText(String(i + 1), {
      x: cx, y: arrowY, w: stepW, h: ARROW_H,
      fontSize: Math.min(20, ARROW_H * 28),
      fontFace: f.title, color: hex(bgColor),
      bold: true, align: "center", valign: "middle",
    });

    // ── Description card below ──
    if (step.description && descH > 0.15) {
      slide.addShape(pres.ShapeType.roundRect, {
        x: cx + 0.06, y: descY, w: stepW - 0.12, h: descH,
        fill: { color: hex(c.surface) },
        line: { color: hex(bgColor), width: 0.4, transparency: 55 },
        rectRadius: 0.1,
        shadow: CARD_SHADOW,
      });
      // Left accent line
      slide.addShape(pres.ShapeType.rect, {
        x: cx + 0.06, y: descY + 0.06, w: 0.07, h: descH - 0.12,
        fill: { color: hex(bgColor) }, line: { color: hex(bgColor) },
      });
      slide.addText(step.description, {
        x: cx + 0.16, y: descY + 0.05, w: stepW - 0.3, h: descH - 0.1,
        fontSize: Math.max(7, Math.min(11, descH * 10)),
        fontFace: f.body, color: hex(c.bodyText),
        valign: "top", wrap: true,
      });
    }
  });
}

// ─── TIMELINE slide ───────────────────────────────────────────────────────────
// Horizontal timeline with milestones alternating above/below

function buildTimelineSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: TimelineSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;

  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const events = (data.events ?? []).slice(0, 6);
  const n = events.length || 1;
  const bodyY = topOffset + TITLE_BAR_H;
  const bodyH = SLIDE_H - bodyY - footerH;
  const lineY = bodyY + bodyH * 0.5;
  const LINE_THICKNESS = 0.05;
  const startX = 0.5;
  const endX = SLIDE_W - 0.5;
  const lineW = endX - startX;

  // Main timeline line
  slide.addShape(pres.ShapeType.rect, {
    x: startX, y: lineY - LINE_THICKNESS / 2,
    w: lineW, h: LINE_THICKNESS,
    fill: { color: hex(c.primary) }, line: { color: hex(c.primary) },
  });

  const nodeXs = events.map((_, i) =>
    n === 1 ? SLIDE_W / 2 : startX + lineW * (i / (n - 1))
  );
  const CIRCLE_R = 0.28;
  const CONN_H = bodyH * 0.25;
  const textW = Math.min(1.8, lineW / n * 0.88);

  events.forEach((ev, i) => {
    const nx = nodeXs[i];
    const above = i % 2 === 0;
    const nodeColor = i % 2 === 0 ? c.primary : c.secondary;

    // Node circle
    slide.addShape(pres.ShapeType.ellipse, {
      x: nx - CIRCLE_R, y: lineY - CIRCLE_R,
      w: CIRCLE_R * 2, h: CIRCLE_R * 2,
      fill: { color: hex(nodeColor) }, line: { color: "FFFFFF", pt: 2 },
    });

    // Connector line (thicker)
    const connY = above ? lineY - CIRCLE_R - CONN_H : lineY + CIRCLE_R;
    slide.addShape(pres.ShapeType.rect, {
      x: nx - 0.018, y: connY, w: 0.036, h: CONN_H,
      fill: { color: hex(c.mutedText) }, line: { color: hex(c.mutedText) },
    });

    const tx = nx - textW / 2;
    const periodSize = Math.min(13, 11 + 3 / n);
    const labelSize = Math.max(7, periodSize - 2);

    if (above) {
      // Period label just above connector top
      slide.addText(ev.period, {
        x: tx, y: connY - 0.32, w: textW, h: 0.3,
        fontSize: periodSize, fontFace: f.title,
        color: hex(c.bodyText), bold: true, align: "center", valign: "bottom",
      });
      // Description above period
      slide.addText(ev.label, {
        x: tx, y: bodyY + 0.05, w: textW, h: connY - 0.35 - bodyY,
        fontSize: labelSize, fontFace: f.body,
        color: hex(c.mutedText), align: "center", valign: "bottom", wrap: true,
      });
    } else {
      // Period below connector
      slide.addText(ev.period, {
        x: tx, y: connY + CONN_H + 0.02, w: textW, h: 0.3,
        fontSize: periodSize, fontFace: f.title,
        color: hex(c.bodyText), bold: true, align: "center", valign: "top",
      });
      // Description below period
      slide.addText(ev.label, {
        x: tx, y: connY + CONN_H + 0.32, w: textW,
        h: SLIDE_H - footerH - (connY + CONN_H + 0.35),
        fontSize: labelSize, fontFace: f.body,
        color: hex(c.mutedText), align: "center", valign: "top", wrap: true,
      });
    }
  });
}

// ─── COMPARISON slide ─────────────────────────────────────────────────────────
// Two panels side-by-side with VS badge divider

function buildComparisonSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: ComparisonSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;

  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const bodyY = topOffset + TITLE_BAR_H + 0.1;
  const bodyH = SLIDE_H - bodyY - footerH - 0.08;
  const VS_W = 0.68;
  const panelW = (SLIDE_W - VS_W - 0.44) / 2;
  const leftX = 0.22;
  const rightX = leftX + panelW + VS_W;
  const vsX = leftX + panelW;

  // Pill-shaped header height (round2SameRect style via roundRect)
  const HEADER_H = 0.42;
  const PILL_RADIUS = 0.21;

  // Left header color: tableHeader (blueish-gray, reflects original sample)
  const leftHeaderColor = c.tableHeader;
  // Right header color: primary
  const rightHeaderColor = c.primary;

  const renderPanel = (
    px: number,
    heading: string,
    bullets: string[],
    headerColor: string,
    accentColor: string
  ) => {
    // Card background
    slide.addShape(pres.ShapeType.roundRect, {
      x: px, y: bodyY, w: panelW, h: bodyH,
      fill: { color: hex(c.surface) },
      line: { color: hex(accentColor), width: 0.4, transparency: 55 },
      rectRadius: PILL_RADIUS,
      shadow: CARD_SHADOW,
    });

    // Pill header (top-rounded only — simulate with roundRect extending down 0.4 + flat rect covering bottom portion)
    slide.addShape(pres.ShapeType.roundRect, {
      x: px, y: bodyY, w: panelW, h: HEADER_H + 0.25,
      fill: { color: hex(headerColor) }, line: { color: hex(headerColor) },
      rectRadius: PILL_RADIUS,
    });
    // Flat rect to square the bottom of the pill
    slide.addShape(pres.ShapeType.rect, {
      x: px, y: bodyY + HEADER_H - 0.02, w: panelW, h: 0.27,
      fill: { color: hex(headerColor) }, line: { color: hex(headerColor) },
    });

    slide.addText(heading, {
      x: px + 0.1, y: bodyY, w: panelW - 0.2, h: HEADER_H,
      fontSize: 14, fontFace: f.title, color: "FFFFFF",
      bold: true, align: "center", valign: "middle",
    });

    // Bullet items with numbered circles
    const items = (bullets ?? []);
    const itemH = Math.min(0.6, (bodyH - HEADER_H - 0.18) / Math.max(items.length, 1));
    const listY = bodyY + HEADER_H + 0.08;
    const BADGE_SIZE = Math.min(0.28, itemH * 0.52);
    const BADGE_X = px + 0.1;
    const TEXT_X = BADGE_X + BADGE_SIZE + 0.1;
    const TEXT_W = panelW - (TEXT_X - px) - 0.1;
    const bulletFS = Math.max(8, Math.min(f.size.bullet - 1, (bodyH - HEADER_H - 0.22) / items.length * 11));

    items.forEach((b, idx) => {
      const iy = listY + idx * itemH;
      // Numbered circle badge
      slide.addShape(pres.ShapeType.ellipse, {
        x: BADGE_X, y: iy + (itemH - BADGE_SIZE) / 2,
        w: BADGE_SIZE, h: BADGE_SIZE,
        fill: { color: hex(accentColor), transparency: 18 },
        line: { color: hex(accentColor), transparency: 100 },
      });
      slide.addText(String(idx + 1), {
        x: BADGE_X, y: iy + (itemH - BADGE_SIZE) / 2,
        w: BADGE_SIZE, h: BADGE_SIZE,
        fontSize: Math.max(6, BADGE_SIZE * 17),
        fontFace: f.title, color: "FFFFFF",
        bold: true, align: "center", valign: "middle",
      });
      // Bullet text
      slide.addText(b, {
        x: TEXT_X, y: iy, w: TEXT_W, h: itemH,
        fontSize: bulletFS, fontFace: f.body,
        color: hex(c.bodyText), valign: "middle", wrap: true,
      });
    });
  };

  renderPanel(leftX, data.left.heading, data.left.bullets, leftHeaderColor, c.secondary);

  // ─ VS divider ─
  slide.addShape(pres.ShapeType.rect, {
    x: vsX + VS_W / 2 - 0.01, y: bodyY + 0.15, w: 0.02, h: bodyH - 0.3,
    fill: { color: "D1D5DB" }, line: { color: "D1D5DB" },
  });
  const vsLabel = data.vsLabel ?? "VS";
  slide.addShape(pres.ShapeType.ellipse, {
    x: vsX + (VS_W - 0.56) / 2, y: bodyY + bodyH / 2 - 0.28,
    w: 0.56, h: 0.56,
    fill: { color: hex(c.primary) }, line: { color: hex(c.primary) },
  });
  slide.addText(vsLabel, {
    x: vsX, y: bodyY + bodyH / 2 - 0.28, w: VS_W, h: 0.56,
    fontSize: 12, fontFace: f.title, color: "FFFFFF",
    bold: true, align: "center", valign: "middle",
  });

  renderPanel(rightX, data.right.heading, data.right.bullets, rightHeaderColor, c.primary);
}

// ─── STATS slide (Gamma Series A style) ───────────────────────────────────────
// Header with tag + title + subtitle, then 2-4 KPI cards with icon chip +
// big number + label + badge — Gamma "Series A Funding Round" look

function buildStatsSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: StatsSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;

  // Slide background
  slide.background = { color: hex(c.background) };

  // Decorative accent circle (more visible — 82% transparent)
  slide.addShape(pres.ShapeType.ellipse, {
    x: SLIDE_W - 2.8, y: SLIDE_H - footerH - 2.8, w: 4.5, h: 4.5,
    fill: { color: hex(c.primary), transparency: 82 },
    line: { color: hex(c.primary), transparency: 100 },
  });

  const headerY = topOffset + 0.25;
  let contentY = headerY;

  // Tag badge (optional)
  if (data.tag) {
    addBadge(pres, slide, data.tag, { x: 0.4, y: contentY, color: c.primary });
    contentY += 0.38;
  }

  // Title
  slide.addText(data.title, {
    x: 0.4, y: contentY, w: SLIDE_W - 0.8, h: 0.55,
    fontSize: f.size.slideTitle + 2, fontFace: f.title,
    color: hex(c.titleText), bold: true, align: "left", valign: "middle",
  });
  contentY += 0.6;

  // Subtitle
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.4, y: contentY, w: SLIDE_W - 0.8, h: 0.35,
      fontSize: f.size.body - 1, fontFace: f.body,
      color: hex(c.mutedText), align: "left", valign: "middle",
    });
    contentY += 0.4;
  }

  // Accent divider line
  slide.addShape(pres.ShapeType.rect, {
    x: 0.4, y: contentY + 0.05, w: SLIDE_W - 0.8, h: 0.025,
    fill: { color: hex(c.surface) }, line: { color: hex(c.surface) },
  });
  contentY += 0.18;

  // KPI cards
  const stats = (data.stats ?? []).slice(0, 4);
  const n = stats.length || 1;
  const GAP = 0.2;
  const cardW = (SLIDE_W - 0.8 - GAP * (n - 1)) / n;
  const cardH = SLIDE_H - contentY - footerH - 0.2;
  const accentColors = [c.primary, c.secondary, c.bullet, c.primary];
  const defaultSymbols = ["📊", "💰", "📈", "🎯"];

  stats.forEach((stat, i) => {
    const cx = 0.4 + i * (cardW + GAP);
    const accent = accentColors[i % accentColors.length];

    addCardBlock(pres, slide, { x: cx, y: contentY, w: cardW, h: cardH, accent });

    let innerY = contentY + 0.15;

    // Icon chip
    const chipSize = 0.5;
    const chipX = cx + (cardW - chipSize) / 2;
    addIconChip(pres, slide, {
      x: chipX, y: innerY, size: chipSize,
      color: accent, bgColor: accent,
      symbol: stat.symbol ?? defaultSymbols[i % defaultSymbols.length],
    });
    innerY += chipSize + 0.12;

    // Label above number
    slide.addText(stat.label, {
      x: cx + 0.08, y: innerY, w: cardW - 0.16, h: 0.3,
      fontSize: 11, fontFace: f.title,
      color: hex(c.mutedText), bold: true, align: "center", valign: "middle",
    });
    innerY += 0.32;

    // Big value
    const valueSize = Math.min(44, Math.max(28, cardW * 16));
    addBigNumber(slide, stat.value, {
      x: cx + 0.08, y: innerY, w: cardW - 0.16, h: cardH * 0.32,
      color: accent, fontSize: valueSize, fontFace: f.title,
    });
    innerY += cardH * 0.32 + 0.06;

    // Badge
    if (stat.badge) {
      const badgeW = Math.max(0.7, stat.badge.length * 0.08 + 0.3);
      addBadge(pres, slide, stat.badge, {
        x: cx + (cardW - badgeW) / 2, y: innerY,
        color: accent, w: badgeW,
      });
      innerY += 0.34;
    }

    // Caption
    if (stat.caption) {
      slide.addText(stat.caption, {
        x: cx + 0.08, y: innerY, w: cardW - 0.16, h: 0.28,
        fontSize: 9, fontFace: f.body,
        color: hex(c.mutedText), align: "center", valign: "middle",
      });
    }
  });
}

// ─── QUOTE slide ──────────────────────────────────────────────────────────────
// Large quotation mark + centered text on primary background

function buildQuoteSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: QuoteSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;

  // Full primary background
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
    fill: { color: hex(c.primary) }, line: { color: hex(c.primary) },
  });
  // Left accent bar
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: SLIDE_H,
    fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
  });

  // Giant opening quotation mark
  slide.addText("\u201C", {
    x: 0.3, y: -0.1, w: 2.0, h: 1.8,
    fontSize: 100, fontFace: f.title, color: hex(c.secondary),
    bold: true, align: "left", valign: "bottom",
  });

  // Horizontal accent line
  slide.addShape(pres.ShapeType.rect, {
    x: 0.5, y: SLIDE_H * 0.38, w: SLIDE_W - 1.0, h: 0.045,
    fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
  });

  // Quote text
  const qLen = (data.quote ?? "").length;
  const quoteFontSize = Math.min(26, Math.max(14, 320 / Math.max(qLen, 1) + 8));
  slide.addText(data.quote, {
    x: 0.5, y: SLIDE_H * 0.42, w: SLIDE_W - 1.0, h: SLIDE_H * 0.38,
    fontSize: quoteFontSize, fontFace: f.body,
    color: "FFFFFF", align: "left", valign: "middle", wrap: true,
    lineSpacingMultiple: 1.4,
  });

  // Author
  if (data.author) {
    slide.addText(`— ${data.author}`, {
      x: 0.5, y: SLIDE_H - footerH - 0.55, w: SLIDE_W - 1.0, h: 0.4,
      fontSize: 12, fontFace: f.body,
      color: hex(c.secondary), align: "right",
    });
  }

  // Closing quote mark (small, right)
  slide.addText("\u201D", {
    x: SLIDE_W - 1.8, y: SLIDE_H * 0.72, w: 1.5, h: 0.9,
    fontSize: 60, fontFace: f.title, color: hex(c.secondary),
    bold: true, align: "right", valign: "top",
  });
}

// ─── HIGHLIGHT slide (Gamma Premium Coffee style) ────────────────────────────
// Left 2/3: tag + title + message + feature cards with accent lines
// Right 1/3: circular masked photo (or accent decoration)

function buildHighlightSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: HighlightSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;
  const hasImage = !!data.imageData;
  const hasFeatures = (data.features ?? []).length > 0;

  // Background
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
    fill: { color: hex(c.background) }, line: { color: hex(c.background) },
  });

  // Left accent bars (primary + secondary)
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.35, h: SLIDE_H,
    fill: { color: hex(c.primary) }, line: { color: hex(c.primary) },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0.35, y: 0, w: 0.06, h: SLIDE_H,
    fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
  });

  const rightW = hasImage ? SLIDE_W * 0.32 : 0;
  const contentX = 0.6;
  const contentW = SLIDE_W - contentX - (hasImage ? rightW + 0.1 : 0.3);
  let contentY = topOffset + 0.35;

  // Right side: circular photo or decorative circle
  if (hasImage) {
    const circleSize = 3.2;
    const imgX = SLIDE_W - rightW - 0.1 + (rightW - circleSize) / 2;
    const imgY = (SLIDE_H - circleSize) / 2;
    slide.addImage({
      data: `data:${data.imageMime ?? "image/jpeg"};base64,${data.imageData}`,
      x: imgX, y: imgY, w: circleSize, h: circleSize,
      rounding: true,
    });
  } else {
    slide.addShape(pres.ShapeType.ellipse, {
      x: SLIDE_W - 2.4, y: SLIDE_H * 0.15, w: 3.2, h: 3.2,
      fill: { color: hex(c.primary), transparency: 90 },
      line: { color: hex(c.primary), transparency: 100 },
    });
    slide.addShape(pres.ShapeType.ellipse, {
      x: SLIDE_W - 1.2, y: SLIDE_H * 0.55, w: 2.0, h: 2.0,
      fill: { color: hex(c.secondary), transparency: 75 },
      line: { color: hex(c.secondary), transparency: 100 },
    });
  }

  // Tag badge (small title label)
  if (data.title) {
    addBadge(pres, slide, data.title, { x: contentX, y: contentY, color: c.primary });
    contentY += 0.4;
  }

  // Huge message
  const msgLen = (data.message ?? "").length;
  const msgSize = Math.min(38, Math.max(22, 350 / Math.max(msgLen, 1) + 12));
  const msgH = hasFeatures ? 1.5 : 2.4;
  slide.addText(data.message, {
    x: contentX, y: contentY, w: contentW, h: msgH,
    fontSize: msgSize, fontFace: f.title,
    color: hex(c.titleText), bold: true,
    align: "left", valign: "middle", wrap: true,
    lineSpacingMultiple: 1.15,
  });
  contentY += msgH + 0.08;

  // Subtext
  if (data.subtext) {
    slide.addText(data.subtext, {
      x: contentX, y: contentY, w: contentW, h: 0.5,
      fontSize: 14, fontFace: f.body,
      color: hex(c.bodyText), align: "left", valign: "top", wrap: true,
    });
    contentY += 0.55;
  }

  // Feature cards (Gamma-style: accent left line + heading + description)
  if (hasFeatures) {
    const features = (data.features ?? []).slice(0, 3);
    const featureH = Math.min(0.65, (SLIDE_H - contentY - footerH - 0.2) / features.length);

    features.forEach((feat, i) => {
      const fy = contentY + i * (featureH + 0.06);
      const accentCol = i % 2 === 0 ? c.primary : c.secondary;

      // Card background
      slide.addShape(pres.ShapeType.rect, {
        x: contentX, y: fy, w: contentW, h: featureH,
        fill: { color: hex(c.surface) }, line: { color: hex(c.surface) },
        rectRadius: 0.04,
      });
      // Left accent
      slide.addShape(pres.ShapeType.rect, {
        x: contentX, y: fy, w: 0.06, h: featureH,
        fill: { color: hex(accentCol) }, line: { color: hex(accentCol) },
      });

      if (feat.description) {
        slide.addText(feat.heading, {
          x: contentX + 0.16, y: fy + 0.04,
          w: contentW - 0.24, h: featureH * 0.45,
          fontSize: 12, fontFace: f.title,
          color: hex(c.titleText), bold: true, valign: "bottom",
        });
        slide.addText(feat.description, {
          x: contentX + 0.16, y: fy + featureH * 0.48,
          w: contentW - 0.24, h: featureH * 0.48,
          fontSize: 10, fontFace: f.body,
          color: hex(c.mutedText), valign: "top", wrap: true,
        });
      } else {
        slide.addText(feat.heading, {
          x: contentX + 0.16, y: fy,
          w: contentW - 0.24, h: featureH,
          fontSize: 12, fontFace: f.title,
          color: hex(c.titleText), bold: true, valign: "middle",
        });
      }
    });
  }

  // Bottom accent dash
  slide.addShape(pres.ShapeType.rect, {
    x: contentX, y: SLIDE_H - footerH - 0.15, w: 1.4, h: 0.08,
    fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
  });
}

// ─── PYRAMID slide ────────────────────────────────────────────────────────────
// Stacked progressively-narrower layers (index 0 = top/narrowest)

function buildPyramidSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: PyramidSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;

  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const levels = (data.levels ?? []).slice(0, 5);
  const n = levels.length;
  if (n === 0) return;

  const bodyY = topOffset + TITLE_BAR_H + 0.12;
  const bodyH = SLIDE_H - bodyY - footerH - 0.12;
  const layerH = bodyH / n;
  const maxW = SLIDE_W * 0.72;
  const minW = maxW * 0.14;
  const centerX = SLIDE_W / 2;
  const GAP = 0.04;

  // Color palette: primary→secondary→lighter variants
  const colorPalette = [c.primary, c.secondary, c.bullet, c.tableRow2, "F3F4F6"];

  levels.forEach((level, i) => {
    const w = minW + (maxW - minW) * (i / Math.max(n - 1, 1));
    const x = centerX - w / 2;
    const y = bodyY + i * layerH;
    const bgColor = colorPalette[i] ?? c.surface;
    const textColor = i <= 1 ? "FFFFFF" : hex(c.bodyText);
    const labelSize = Math.min(14, Math.max(9, layerH * 10.5));

    // Layer block — roundRect for softer look
    slide.addShape(pres.ShapeType.roundRect, {
      x, y: y + GAP, w, h: layerH - GAP,
      fill: { color: hex(bgColor) }, line: { color: hex(bgColor) },
      rectRadius: 0.06,
    });

    // Label inside block
    slide.addText(level.label, {
      x: x + 0.15, y: y + GAP, w: w - 0.3, h: layerH - GAP,
      fontSize: labelSize, fontFace: f.title,
      color: textColor, bold: i === 0,
      align: "center", valign: "middle",
    });

    // Description to the right (outside pyramid)
    if (level.description && x + w + 0.15 < SLIDE_W - 0.1) {
      slide.addShape(pres.ShapeType.rect, {
        x: x + w + 0.1, y: y + layerH * 0.44 + GAP, w: 0.45, h: 0.03,
        fill: { color: hex(c.mutedText) }, line: { color: hex(c.mutedText) },
      });
      slide.addText(level.description, {
        x: x + w + 0.06, y: y + GAP, w: SLIDE_W - (x + w) - 0.1, h: layerH - GAP,
        fontSize: Math.max(7, labelSize - 4), fontFace: f.body,
        color: hex(c.mutedText), align: "left", valign: "middle", wrap: true,
      });
    }
  });
}

// ─── SWOT slide ───────────────────────────────────────────────────────────────
// 2×2 matrix: Strengths / Weaknesses / Opportunities / Threats

function buildSwotSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: SwotSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;

  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const bodyY = topOffset + TITLE_BAR_H + 0.06;
  const bodyH = SLIDE_H - bodyY - footerH - 0.06;
  const OUTER_GAP = 0.1;
  const INNER_GAP = 0.08;
  const quadW = (SLIDE_W - OUTER_GAP * 2 - INNER_GAP) / 2;
  const quadH = (bodyH - INNER_GAP) / 2;
  const HEADER_H = 0.42;

  const quadrants = [
    {
      key: "S", label: "강점 (Strengths)", bullets: data.strengths ?? [],
      bg: c.primary, x: OUTER_GAP, y: bodyY,
    },
    {
      key: "W", label: "약점 (Weaknesses)", bullets: data.weaknesses ?? [],
      bg: c.secondary, x: OUTER_GAP + quadW + INNER_GAP, y: bodyY,
    },
    {
      key: "O", label: "기회 (Opportunities)", bullets: data.opportunities ?? [],
      bg: c.bullet, x: OUTER_GAP, y: bodyY + quadH + INNER_GAP,
    },
    {
      key: "T", label: "위협 (Threats)", bullets: data.threats ?? [],
      bg: c.mutedText, x: OUTER_GAP + quadW + INNER_GAP, y: bodyY + quadH + INNER_GAP,
    },
  ];

  quadrants.forEach(({ key, label, bullets, bg, x, y }) => {
    // Body background — roundRect + shadow
    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w: quadW, h: quadH,
      fill: { color: hex(c.surface) }, line: { color: hex(bg), width: 0.5, transparency: 60 },
      rectRadius: 0.1,
      shadow: CARD_SHADOW,
    });
    // Header
    slide.addShape(pres.ShapeType.rect, {
      x, y, w: quadW, h: HEADER_H,
      fill: { color: hex(bg) }, line: { color: hex(bg) },
    });
    // Key letter badge
    slide.addShape(pres.ShapeType.rect, {
      x, y, w: HEADER_H, h: HEADER_H,
      fill: { color: "00000022" }, line: { color: hex(bg) },
    });
    slide.addText(key, {
      x, y, w: HEADER_H, h: HEADER_H,
      fontSize: 19, fontFace: f.title, color: "FFFFFF",
      bold: true, align: "center", valign: "middle",
    });
    // Label
    slide.addText(label, {
      x: x + HEADER_H + 0.06, y, w: quadW - HEADER_H - 0.08, h: HEADER_H,
      fontSize: 10, fontFace: f.title, color: "FFFFFF",
      bold: true, align: "left", valign: "middle",
    });
    // Bullets
    const bItems = bullets.slice(0, 4).map((b) => ({
      text: b,
      options: {
        bullet: { code: "2022" },
        color: hex(c.bodyText), fontSize: 9, paraSpaceAfter: 3,
      },
    }));
    if (bItems.length > 0) {
      slide.addText(bItems, {
        x: x + 0.1, y: y + HEADER_H + 0.06,
        w: quadW - 0.15, h: quadH - HEADER_H - 0.1,
        fontFace: f.body, valign: "top",
      });
    }
  });
}

// ─── HANA KPI slide ───────────────────────────────────────────────────────────
// Financial KPI grid with ₩ symbol, big numbers, and YoY change badges

function buildHanaKpiSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: HanaKpiSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;
  slide.background = { color: hex(c.background) };
  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const kpis = (data.kpis ?? []).slice(0, 4);
  const n = kpis.length || 1;
  const bodyY = topOffset + TITLE_BAR_H + 0.15;
  const bodyH = SLIDE_H - bodyY - footerH - 0.15;
  const GAP = 0.18;
  const cols = n <= 2 ? n : n === 3 ? 3 : 2;
  const rows = Math.ceil(n / cols);
  const cardW = (SLIDE_W - 0.6 - GAP * (cols - 1)) / cols;
  const cardH = (bodyH - GAP * (rows - 1)) / rows;

  kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = 0.3 + col * (cardW + GAP);
    const cy = bodyY + row * (cardH + GAP);
    const isPositive = kpi.positive !== false;
    const accent = isPositive ? c.primary : c.secondary;

    addCardBlock(pres, slide, { x: cx, y: cy, w: cardW, h: cardH, accent });

    // Label
    slide.addText(kpi.label, {
      x: cx + 0.12, y: cy + 0.12, w: cardW - 0.24, h: 0.32,
      fontSize: 12, fontFace: f.title,
      color: hex(c.mutedText), bold: true, align: "left", valign: "middle",
    });

    // Big value
    addBigNumber(slide, kpi.value, {
      x: cx + 0.12, y: cy + 0.42, w: cardW - 0.24, h: cardH * 0.4,
      color: accent, fontSize: Math.min(42, cardW * 14), fontFace: f.title,
    });

    // Change badge
    if (kpi.change) {
      const badgeColor = isPositive ? "16A34A" : "DC2626";
      addBadge(pres, slide, kpi.change, {
        x: cx + 0.12, y: cy + cardH - 0.42,
        color: badgeColor, w: Math.max(0.8, kpi.change.length * 0.09 + 0.35),
      });
    }
  });
}

// ─── HANA TIMELINE slide ──────────────────────────────────────────────────────
// Quarterly performance timeline with bars and growth labels

function buildHanaTimelineSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: HanaTimelineSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;
  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const periods = (data.periods ?? []).slice(0, 6);
  const n = periods.length || 1;
  const bodyY = topOffset + TITLE_BAR_H + 0.15;
  const bodyH = SLIDE_H - bodyY - footerH - 0.15;
  const GAP = 0.12;
  const barW = (SLIDE_W - 0.6 - GAP * (n - 1)) / n;
  const maxBarH = bodyH * 0.55;
  const barBaseY = bodyY + bodyH * 0.7;

  // Find max value for scaling
  const values = periods.map(p => parseFloat(p.value.replace(/[^0-9.]/g, "")) || 1);
  const maxVal = Math.max(...values, 1);

  periods.forEach((period, i) => {
    const cx = 0.3 + i * (barW + GAP);
    const val = values[i];
    const ratio = val / maxVal;
    const barH = Math.max(0.3, maxBarH * ratio);
    const barColor = i % 2 === 0 ? c.primary : c.secondary;

    // Bar
    slide.addShape(pres.ShapeType.rect, {
      x: cx, y: barBaseY - barH, w: barW, h: barH,
      fill: { color: hex(barColor) }, line: { color: hex(barColor) },
      rectRadius: 0.04,
    });

    // Value on top of bar
    slide.addText(period.value, {
      x: cx, y: barBaseY - barH - 0.35, w: barW, h: 0.32,
      fontSize: 14, fontFace: f.title,
      color: hex(c.titleText), bold: true, align: "center", valign: "bottom",
    });

    // Growth badge
    if (period.growth) {
      addBadge(pres, slide, period.growth, {
        x: cx + (barW - 0.7) / 2, y: barBaseY - barH - 0.62,
        color: period.growth.startsWith("-") ? "DC2626" : "16A34A", w: 0.7,
      });
    }

    // Period label below bar
    slide.addText(period.period, {
      x: cx, y: barBaseY + 0.05, w: barW, h: 0.3,
      fontSize: 11, fontFace: f.title,
      color: hex(c.bodyText), bold: true, align: "center", valign: "top",
    });

    // Label below period
    if (period.label) {
      slide.addText(period.label, {
        x: cx, y: barBaseY + 0.32, w: barW, h: 0.25,
        fontSize: 9, fontFace: f.body,
        color: hex(c.mutedText), align: "center", valign: "top",
      });
    }
  });
}

// ─── HANA DIVIDER slide ───────────────────────────────────────────────────────
// Section divider with large number + gradient background

function buildHanaDividerSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: HanaDividerSlide,
  style: SlideStyle
) {
  const c = style.colors;
  const f = style.fonts;

  applyBackground(pres, slide, style, "section");

  // Large number (01, 02, etc.)
  slide.addText(data.number, {
    x: 0.5, y: SLIDE_H * 0.05, w: 2.5, h: 2.0,
    fontSize: 90, fontFace: f.title,
    color: "FFFFFF", bold: true, align: "left", valign: "middle",
    transparency: 30,
  });

  // Accent line
  slide.addShape(pres.ShapeType.rect, {
    x: 0.5, y: SLIDE_H * 0.52, w: 1.2, h: 0.08,
    fill: { color: hex(c.secondary) }, line: { color: hex(c.secondary) },
  });

  // Title
  slide.addText(data.title, {
    x: 0.5, y: SLIDE_H * 0.35, w: SLIDE_W - 1.0, h: 0.7,
    fontSize: f.size.sectionTitle + 2, fontFace: f.title,
    color: "FFFFFF", bold: true, align: "left", valign: "middle",
  });

  // Subtitle
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.5, y: SLIDE_H * 0.58, w: SLIDE_W - 1.0, h: 0.5,
      fontSize: f.size.body, fontFace: f.body,
      color: hex(c.secondary), align: "left", valign: "middle",
    });
  }
}

// ─── HANA MATRIX slide ────────────────────────────────────────────────────────
// 2×2 positioning matrix (BCG/SWOT variant)

function buildHanaMatrixSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: HanaMatrixSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;
  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const bodyY = topOffset + TITLE_BAR_H + 0.08;
  const bodyH = SLIDE_H - bodyY - footerH - 0.08;
  const INNER_GAP = 0.1;
  const AXIS_W = 0.3;
  const quadW = (SLIDE_W - 0.4 - INNER_GAP - AXIS_W) / 2;
  const quadH = (bodyH - INNER_GAP - 0.3) / 2;
  const startX = 0.2 + AXIS_W;

  const quads = [
    { q: data.topLeft, x: startX, y: bodyY, color: c.primary },
    { q: data.topRight, x: startX + quadW + INNER_GAP, y: bodyY, color: c.secondary },
    { q: data.bottomLeft, x: startX, y: bodyY + quadH + INNER_GAP, color: c.bullet },
    { q: data.bottomRight, x: startX + quadW + INNER_GAP, y: bodyY + quadH + INNER_GAP, color: c.mutedText },
  ];

  quads.forEach(({ q, x, y, color }) => {
    addCardBlock(pres, slide, { x, y, w: quadW, h: quadH, accent: color, bg: c.surface });
    slide.addText(q.label, {
      x: x + 0.1, y: y + 0.1, w: quadW - 0.2, h: 0.32,
      fontSize: 12, fontFace: f.title,
      color: hex(color), bold: true, align: "left", valign: "middle",
    });
    const items = (q.items ?? []).slice(0, 4).map(b => ({
      text: b,
      options: { bullet: { code: "2022" }, color: hex(c.bodyText), fontSize: 10, paraSpaceAfter: 3 },
    }));
    if (items.length > 0) {
      slide.addText(items, {
        x: x + 0.1, y: y + 0.42, w: quadW - 0.2, h: quadH - 0.52,
        fontFace: f.body, valign: "top",
      });
    }
  });

  // Axis labels
  if (data.yAxis) {
    slide.addText(data.yAxis, {
      x: 0.1, y: bodyY, w: AXIS_W, h: bodyH,
      fontSize: 10, fontFace: f.body,
      color: hex(c.mutedText), align: "center", valign: "middle",
      rotate: 270,
    });
  }
  if (data.xAxis) {
    slide.addText(data.xAxis, {
      x: startX, y: bodyY + quadH * 2 + INNER_GAP + 0.05,
      w: quadW * 2 + INNER_GAP, h: 0.25,
      fontSize: 10, fontFace: f.body,
      color: hex(c.mutedText), align: "center", valign: "middle",
    });
  }
}

// ─── HANA ORG slide ───────────────────────────────────────────────────────────
// Organization chart: root node + children cards

function buildHanaOrgSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: HanaOrgSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;
  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const bodyY = topOffset + TITLE_BAR_H + 0.15;
  const bodyH = SLIDE_H - bodyY - footerH - 0.15;

  // Root node
  const rootW = 2.8;
  const rootH = 0.7;
  const rootX = (SLIDE_W - rootW) / 2;
  const rootY = bodyY + 0.1;

  slide.addShape(pres.ShapeType.rect, {
    x: rootX, y: rootY, w: rootW, h: rootH,
    fill: { color: hex(c.primary) }, line: { color: hex(c.primary) },
    rectRadius: 0.06,
  });
  slide.addText(data.root.label, {
    x: rootX, y: rootY, w: rootW, h: data.root.role ? rootH * 0.55 : rootH,
    fontSize: 14, fontFace: f.title,
    color: "FFFFFF", bold: true, align: "center", valign: data.root.role ? "bottom" : "middle",
  });
  if (data.root.role) {
    slide.addText(data.root.role, {
      x: rootX, y: rootY + rootH * 0.55, w: rootW, h: rootH * 0.4,
      fontSize: 10, fontFace: f.body,
      color: hex(c.secondary), align: "center", valign: "top",
    });
  }

  // Connector line down from root
  const connStartY = rootY + rootH;
  const connEndY = connStartY + 0.35;
  slide.addShape(pres.ShapeType.rect, {
    x: SLIDE_W / 2 - 0.01, y: connStartY, w: 0.02, h: connEndY - connStartY,
    fill: { color: hex(c.mutedText) }, line: { color: hex(c.mutedText) },
  });

  // Children
  const children = (data.children ?? []).slice(0, 5);
  const n = children.length;
  if (n === 0) return;

  const GAP = 0.14;
  const childW = Math.min(2.0, (SLIDE_W - 0.6 - GAP * (n - 1)) / n);
  const childH = bodyH - (connEndY - bodyY) - 0.2;
  const totalChildrenW = childW * n + GAP * (n - 1);
  const childStartX = (SLIDE_W - totalChildrenW) / 2;

  // Horizontal connector
  if (n > 1) {
    slide.addShape(pres.ShapeType.rect, {
      x: childStartX + childW / 2, y: connEndY,
      w: totalChildrenW - childW, h: 0.02,
      fill: { color: hex(c.mutedText) }, line: { color: hex(c.mutedText) },
    });
  }

  children.forEach((child, i) => {
    const cx = childStartX + i * (childW + GAP);
    const cy = connEndY + 0.25;
    const childColor = i % 2 === 0 ? c.secondary : c.primary;

    // Vertical connector down to child
    slide.addShape(pres.ShapeType.rect, {
      x: cx + childW / 2 - 0.01, y: connEndY, w: 0.02, h: 0.25,
      fill: { color: hex(c.mutedText) }, line: { color: hex(c.mutedText) },
    });

    addCardBlock(pres, slide, { x: cx, y: cy, w: childW, h: childH, accent: childColor, bg: c.surface });

    slide.addText(child.label, {
      x: cx + 0.08, y: cy + 0.12, w: childW - 0.16, h: child.role ? childH * 0.45 : childH - 0.2,
      fontSize: 12, fontFace: f.title,
      color: hex(c.titleText), bold: true, align: "center",
      valign: child.role ? "bottom" : "middle", wrap: true,
    });
    if (child.role) {
      slide.addText(child.role, {
        x: cx + 0.08, y: cy + childH * 0.5, w: childW - 0.16, h: childH * 0.4,
        fontSize: 9, fontFace: f.body,
        color: hex(c.mutedText), align: "center", valign: "top", wrap: true,
      });
    }
  });
}

// ─── Chart slide builders ─────────────────────────────────────────────────────


function buildChartBarSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: ChartBarSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;
  slide.background = { color: hex(c.background) };
  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const bodyY = topOffset + TITLE_BAR_H + 0.12;
  const bodyH = SLIDE_H - bodyY - footerH - 0.15;
  const chartX = 0.3;
  const chartW = SLIDE_W - 0.6;
  let chartY = bodyY;
  let chartH = bodyH;

  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: chartX, y: bodyY, w: chartW, h: 0.28,
      fontSize: f.size.caption + 2, fontFace: f.body,
      color: hex(c.mutedText), align: "left", valign: "middle",
    });
    chartY += 0.3;
    chartH -= 0.3;
  }

  const seriesColors = [c.primary, c.secondary, "2E86AB", "A23B72", "F18F01", "5FAD56"];
  const chartType = data.orientation === "horizontal"
    ? pres.ChartType.bar
    : pres.ChartType.bar;

  const chartData = data.series.map((s, i) => ({
    name: s.name,
    labels: data.labels,
    values: s.values,
  }));

  slide.addChart(chartType, chartData, {
    x: chartX, y: chartY, w: chartW, h: chartH - (data.source ? 0.24 : 0),
    barDir: data.orientation === "horizontal" ? "bar" : "col",
    barGrouping: data.series.length > 1 ? "clustered" : "clustered",
    chartColors: seriesColors.slice(0, data.series.length).map((col) => hex(col)),
    showLegend: data.series.length > 1,
    legendPos: "b",
    legendFontSize: f.size.caption,
    legendFontFace: f.body,
    showValue: true,
    dataLabelFontSize: Math.max(8, f.size.caption - 1),
    dataLabelFontFace: f.body,
    dataLabelColor: hex(c.bodyText),
    catAxisLabelFontSize: f.size.caption,
    catAxisLabelFontFace: f.body,
    catAxisLabelColor: hex(c.bodyText),
    valAxisLabelFontSize: f.size.caption,
    valAxisLabelFontFace: f.body,
    valAxisLabelColor: hex(c.mutedText),
    plotAreaBkgndColor: hex(c.background),
    chartAreaBkgndColor: hex(c.background),
  } as pptxgen.IChartOpts);

  if (data.source) {
    slide.addText(`출처: ${data.source}`, {
      x: chartX, y: chartY + chartH - 0.22, w: chartW, h: 0.22,
      fontSize: f.size.caption - 1, fontFace: f.body,
      color: hex(c.mutedText), align: "right", italic: true,
    });
  }
}

function buildChartPieSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: ChartPieSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;
  slide.background = { color: hex(c.background) };
  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const bodyY = topOffset + TITLE_BAR_H + 0.12;
  const bodyH = SLIDE_H - bodyY - footerH - 0.15;
  const chartX = 0.5;
  const chartW = SLIDE_W - 1.0;
  let chartY = bodyY;
  let chartH = bodyH;

  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: chartX, y: bodyY, w: chartW, h: 0.28,
      fontSize: f.size.caption + 2, fontFace: f.body,
      color: hex(c.mutedText), align: "left",
    });
    chartY += 0.3;
    chartH -= 0.3;
  }

  const seriesColors = [c.primary, c.secondary, "2E86AB", "A23B72", "F18F01", "5FAD56", "3D405B", "81B29A"];

  slide.addChart(pres.ChartType.doughnut, [{ name: data.title, labels: data.labels, values: data.values }], {
    x: chartX, y: chartY, w: chartW, h: chartH - (data.source ? 0.24 : 0),
    chartColors: seriesColors.slice(0, data.values.length).map((col) => hex(col)),
    holeSize: 55,
    showLegend: true,
    legendPos: "r",
    legendFontSize: f.size.caption,
    legendFontFace: f.body,
    legendColor: hex(c.bodyText),
    showPercent: true,
    dataLabelFontSize: Math.max(8, f.size.caption),
    dataLabelFontFace: f.body,
    dataLabelColor: "FFFFFF",
    chartAreaBkgndColor: hex(c.background),
    plotAreaBkgndColor: hex(c.background),
  } as pptxgen.IChartOpts);

  if (data.source) {
    slide.addText(`출처: ${data.source}`, {
      x: chartX, y: chartY + chartH - 0.22, w: chartW, h: 0.22,
      fontSize: f.size.caption - 1, fontFace: f.body,
      color: hex(c.mutedText), align: "right", italic: true,
    });
  }
}

function buildChartLineSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  data: ChartLineSlide,
  style: SlideStyle,
  topOffset = 0,
  footerH = 0
) {
  const c = style.colors;
  const f = style.fonts;
  slide.background = { color: hex(c.background) };
  addTitleBar(pres, slide, data.title, style, topOffset, footerH);

  const bodyY = topOffset + TITLE_BAR_H + 0.12;
  const bodyH = SLIDE_H - bodyY - footerH - 0.15;
  const chartX = 0.3;
  const chartW = SLIDE_W - 0.6;
  let chartY = bodyY;
  let chartH = bodyH;

  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: chartX, y: bodyY, w: chartW, h: 0.28,
      fontSize: f.size.caption + 2, fontFace: f.body,
      color: hex(c.mutedText), align: "left",
    });
    chartY += 0.3;
    chartH -= 0.3;
  }

  const seriesColors = [c.primary, c.secondary, "2E86AB", "A23B72", "F18F01", "5FAD56"];

  const chartData = data.series.map((s) => ({
    name: s.name,
    labels: data.labels,
    values: s.values,
  }));

  slide.addChart(pres.ChartType.line, chartData, {
    x: chartX, y: chartY, w: chartW, h: chartH - (data.source ? 0.24 : 0),
    chartColors: seriesColors.slice(0, data.series.length).map((col) => hex(col)),
    lineSize: 2.5,
    showLegend: data.series.length > 1,
    legendPos: "b",
    legendFontSize: f.size.caption,
    legendFontFace: f.body,
    showValue: false,
    catAxisLabelFontSize: f.size.caption,
    catAxisLabelFontFace: f.body,
    catAxisLabelColor: hex(c.bodyText),
    valAxisLabelFontSize: f.size.caption,
    valAxisLabelFontFace: f.body,
    valAxisLabelColor: hex(c.mutedText),
    plotAreaBkgndColor: hex(c.background),
    chartAreaBkgndColor: hex(c.background),
  } as pptxgen.IChartOpts);

  if (data.source) {
    slide.addText(`출처: ${data.source}`, {
      x: chartX, y: chartY + chartH - 0.22, w: chartW, h: 0.22,
      fontSize: f.size.caption - 1, fontFace: f.body,
      color: hex(c.mutedText), align: "right", italic: true,
    });
  }
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export async function buildPptx(presentation: PptPresentation): Promise<Buffer> {
  const pres = new pptxgen();

  // Resolve design preset → SlideStyle (colors + fonts + chrome)
  const preset = getPreset(presentation.presetId ?? presentation.theme);
  const style  = resolveStyle(preset);

  pres.layout = "LAYOUT_16x9";
  pres.title = presentation.title;
  pres.subject = presentation.title;
  pres.author = "HRD Workspace AI";

  const tmpl = presentation.template;
  const skipLayouts = tmpl?.skipLayouts ?? ["title", "closing"];

  for (let i = 0; i < presentation.slides.length; i++) {
    const slideData = presentation.slides[i];
    const slide = pres.addSlide();
    __currentSlideIdx = i;

    const useTemplate = tmpl !== undefined && !skipLayouts.includes(slideData.layout);
    const topOffset = useTemplate && tmpl.topStrip ? (tmpl.topStrip.height ?? 0.38) : 0;
    const footerH = useTemplate && tmpl.bottomStrip ? (tmpl.bottomStrip.height ?? 0.38) : 0;

    if (useTemplate && tmpl.topStrip) {
      applyTopStrip(pres, slide, tmpl.topStrip, style);
    }

    switch (slideData.layout) {
      case "title":
        buildTitleSlide(pres, slide, slideData, style);
        break;
      case "content":
        buildContentSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "two_column":
        buildTwoColumnSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "table":
        buildTableSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "section":
        buildSectionSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "closing":
        buildClosingSlide(pres, slide, slideData, style);
        break;
      case "agenda":
        buildAgendaSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "grid":
        buildGridSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "process":
        buildProcessSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "timeline":
        buildTimelineSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "comparison":
        buildComparisonSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "stats":
        buildStatsSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "quote":
        buildQuoteSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "pyramid":
        buildPyramidSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "swot":
        buildSwotSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "highlight":
        buildHighlightSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "hana_kpi":
        buildHanaKpiSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "hana_timeline":
        buildHanaTimelineSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "hana_divider":
        buildHanaDividerSlide(pres, slide, slideData, style);
        break;
      case "hana_matrix":
        buildHanaMatrixSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "hana_org":
        buildHanaOrgSlide(pres, slide, slideData, style, topOffset, footerH);
        break;
      case "chart_bar":
        buildChartBarSlide(pres, slide, slideData as ChartBarSlide, style, topOffset, footerH);
        break;
      case "chart_pie":
        buildChartPieSlide(pres, slide, slideData as ChartPieSlide, style, topOffset, footerH);
        break;
      case "chart_line":
        buildChartLineSlide(pres, slide, slideData as ChartLineSlide, style, topOffset, footerH);
        break;
      case "scene":
        // renderSceneSlide is async — errors fall back to a blank content slide
        await renderSceneSlide(pres, slide, slideData, style.fonts.body).catch(() => {
          const fallback = slideData as SceneSlide;
          buildContentSlide(pres, slide, { layout: "content", title: fallback.title ?? "슬라이드", bullets: [] }, style, topOffset, footerH);
        });
        break;
    }

    if (useTemplate && tmpl.bottomStrip) {
      applyBottomStrip(pres, slide, tmpl.bottomStrip, style, i + 1);
    }
  }

  const result = await pres.write({ outputType: "nodebuffer" });
  return result as Buffer;
}

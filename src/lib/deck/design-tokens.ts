/**
 * Hana deck design tokens — single source of truth for all slide components.
 * All components consume these tokens; no inline color/size values allowed.
 */

export const COLORS = {
  primary:    "#009591",   // 하나그린 — 메인 강조
  secondary:  "#00B5B0",   // 라이트 하나그린
  accent:     "#ED1651",   // 포인트 빨강 (희소 사용)
  dark:       "#007A77",   // 다크 하나그린
  ink:        "#1A1A1A",   // 본문 최상위 텍스트
  muted:      "#6B7280",   // 보조 텍스트
  surface:    "#F0FAFA",   // 카드/섹션 배경
  surfaceAlt: "#E6F7F7",   // 교번 행/배경
  border:     "#D1EEEE",   // 경계선
  bg:         "#FFFFFF",   // 슬라이드 배경
  white:      "#FFFFFF",
} as const;

/** Tailwind class strings — use directly in className */
export const TW = {
  // Font family
  font: "font-['하나체',_'Malgun_Gothic',_sans-serif]",

  // Slide container: 16:9, fixed 1280px wide
  slide: "relative w-[1280px] h-[720px] overflow-hidden bg-white font-['하나체',_'Malgun_Gothic',_sans-serif]",

  // Title bar (header strip at top of content slides)
  titleBar: "w-full h-[72px] flex items-center px-12 shrink-0",
  titleBarText: "text-white text-[22px] font-bold leading-tight",

  // Outer content padding area (below title bar)
  body: "flex-1 px-12 py-8 flex flex-col",

  // Typography scale
  displayHuge: "text-[72px] font-bold leading-[1.1]",
  displayLarge: "text-[54px] font-bold leading-[1.15]",
  h1: "text-[36px] font-bold leading-tight",
  h2: "text-[24px] font-bold leading-snug",
  h3: "text-[18px] font-semibold leading-snug",
  bodyLarge: "text-[16px] leading-relaxed",
  bodyMd: "text-[14px] leading-relaxed",
  caption: "text-[11px] leading-snug",
  label: "text-[10px] font-medium uppercase tracking-wider",

  // Gaps
  gapSm: "gap-3",
  gap: "gap-6",
  gapLg: "gap-8",

  // Cards
  card: "rounded-xl p-6 flex flex-col",
  cardSm: "rounded-lg p-4 flex flex-col",
} as const;

/** Pixel-level metrics for SVG/canvas overlays */
export const PX = {
  slideW: 1280,
  slideH: 720,
  titleBarH: 72,
  padH: 48,  // horizontal padding (px-12)
  padV: 32,  // vertical padding (py-8)
  contentW: 1280 - 48 * 2,  // 1184
  contentH: 720 - 72 - 32 * 2,  // 544
} as const;

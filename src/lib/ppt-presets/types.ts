import type { PptTheme } from "@/lib/ppt-themes";
import type { SlideLayout } from "@/lib/ppt-builder";

// ─── Decoration primitives (repeating background chrome elements) ─────────────

export type Decoration =
  | { type: "circle"; x: number; y: number; r: number; color: string; opacity: number }
  | { type: "rect"; x: number; y: number; w: number; h: number; color: string; opacity: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; color: string; thickness: number };

// ─── Chrome (shared slide frame elements) ─────────────────────────────────────

export interface TitleBarStyle {
  /** Visual variant of the title bar */
  style: "full-bleed" | "left-accent" | "minimal-underline";
  heightInches: number;
  /** Override bg color (defaults to theme primary) */
  bgColor?: string;
}

export interface Chrome {
  titleBar: TitleBarStyle;
  /** Repeating decorative shapes applied on every slide */
  decorations: Decoration[];
  logo?: {
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    widthInches: number;
  };
  pageNumber?: {
    position: "bottom-right" | "bottom-center";
    fontSize: number;
    color: string;
  };
  footerLine?: {
    color: string;
    thickness: number;
  };
}

// ─── Per-slide-type overrides ─────────────────────────────────────────────────

export interface TitleSlideConfig {
  style: "center-gradient" | "split" | "full-image";
  coverShape?: "diagonal" | "circle";
}

export interface SectionSlideConfig {
  style: "numbered" | "full-color" | "side-bar";
}

// ─── Token subset (can partially override the base PptTheme) ─────────────────

export type ColorTokens = Partial<PptTheme["colors"]>;
export type FontTokens  = Partial<Pick<PptTheme["fonts"], "title" | "body">>;

// ─── Sample deck (layout / narrative guidance extracted from a reference PPTX) ─

export interface SampleDeck {
  /** High-level slide flow description, e.g. "표지 → 목차 → 섹션(현황/이슈/계획) → 우수사례 → 결론" */
  narrative: string;
  /** Layout types this preset prefers — AI is instructed to use these actively */
  preferredLayouts: SlideLayout[];
  /** Style notes extracted from the reference PPTX */
  styleNotes: string[];
}

// ─── Full DesignPreset ────────────────────────────────────────────────────────

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  /** Path to source PPTX used for extraction (documentation only) */
  sourceFile?: string;
  /** Base PptTheme ID — chrome + tokens layer on top of this */
  baseTheme: string;
  tokens: {
    colors: ColorTokens;
    fonts: FontTokens;
  };
  chrome: Chrome;
  titleSlide: TitleSlideConfig;
  sectionSlide: SectionSlideConfig;
  /** Optional: layout/narrative guidance extracted from a reference PPTX */
  sampleDeck?: SampleDeck;
}

// ─── Resolved style passed to every slide builder ────────────────────────────

export interface SlideStyle {
  colors: PptTheme["colors"];
  fonts: PptTheme["fonts"];
  chrome: Chrome;
  titleSlide: TitleSlideConfig;
  sectionSlide: SectionSlideConfig;
}

// ─── DeckOutline ─────────────────────────────────────────────────────────────
// Output of Stage 1 (Analyzer LLM). Pure content, no layout decisions.

export type SectionKind =
  | "intro"       // 표지/도입 섹션
  | "agenda"      // 목차
  | "section"     // 챕터 구분자
  | "concept"     // 개념/설명 (불릿 형식)
  | "data"        // 수치/KPI (숫자 강조)
  | "comparison"  // 2-way 비교
  | "process"     // 단계/순서
  | "quote"       // 인용구/핵심 메시지
  | "cta"         // Call-to-action
  | "close";      // 마무리

export interface OutlineSection {
  kind: SectionKind;
  heading: string;
  /** 3~7개 핵심 포인트 (각 25~60자) */
  points: string[];
  /** 이 섹션의 한 줄 핵심 메시지 */
  emphasis?: string;
  /** kind === "data" 일 때 수치 배열 */
  numbers?: Array<{ value: string; label: string; delta?: string }>;
  /** kind === "comparison" 일 때 좌/우 레이블 */
  sides?: { left: string; right: string };
}

export interface DeckOutline {
  title: string;
  subtitle?: string;
  sections: OutlineSection[];
}

// ─── SlotDeck ────────────────────────────────────────────────────────────────
// Output of Stage 2 (Composer). Component names + typed props only.

export interface BulletItem {
  icon: string;    // lucide icon name, e.g. "CheckCircle2"
  text: string;
  sub?: string;    // 선택적 보조 설명
}

export interface StatItem {
  value: string;   // e.g. "120%", "₩4.2B"
  label: string;
  delta?: string;  // e.g. "+18% YoY"
  icon?: string;   // lucide icon name
}

export interface ProcessStep {
  number: number;
  title: string;
  description: string;
  icon?: string;
}

export interface ComparisonSide {
  label: string;   // e.g. "현재 (AS-IS)"
  points: string[];
  emphasis?: string;
}

// Discriminated union of all slide variants
export type SlideSlot =
  | {
      component: "TitleSlide";
      props: { title: string; subtitle?: string; author?: string; date?: string };
    }
  | {
      component: "AgendaSlide";
      props: { heading: string; items: Array<{ number: number; title: string; desc?: string }> };
    }
  | {
      component: "SectionDividerSlide";
      props: { sectionNumber: number; title: string; subtitle?: string };
    }
  | {
      component: "BulletsSlide";
      props: { heading: string; bullets: BulletItem[]; emphasis?: string };
    }
  | {
      component: "StatsSlide";
      props: { heading: string; stats: StatItem[]; emphasis?: string };
    }
  | {
      component: "ComparisonSlide";
      props: { heading: string; left: ComparisonSide; right: ComparisonSide };
    }
  | {
      component: "ProcessSlide";
      props: { heading: string; steps: ProcessStep[]; emphasis?: string };
    }
  | {
      component: "QuoteSlide";
      props: { quote: string; source?: string; context?: string };
    }
  | {
      component: "ImageSplitSlide";
      props: { heading: string; bullets: BulletItem[]; imageQuery?: string; imageSide?: "left" | "right" };
    }
  | {
      component: "ClosingSlide";
      props: { message?: string; contact?: string; author?: string };
    };

export interface DeckMeta {
  title: string;
  theme: "hana";
  author?: string;
  date?: string;
  id?: string;
}

export interface SlotDeck {
  meta: DeckMeta;
  slides: SlideSlot[];
}

/**
 * Deterministic DeckOutline → SlotDeck mapper.
 * Converts structured outline sections into typed slide slots without LLM.
 * LLM is used only for icon name selection (supplementary).
 */
import type { DeckOutline, SlotDeck, SlideSlot, OutlineSection } from "./types";

// Default icon assignments by keyword matching
const ICON_KEYWORDS: Array<[RegExp, string]> = [
  [/목표|달성|성과|KPI/i, "Target"],
  [/사람|직원|인재|조직/i, "Users"],
  [/교육|학습|훈련|트레이닝/i, "GraduationCap"],
  [/전략|계획|로드맵/i, "Flag"],
  [/데이터|분석|지표/i, "BarChart2"],
  [/AI|인공지능|머신러닝/i, "Brain"],
  [/비용|예산|투자/i, "DollarSign"],
  [/시간|일정|기간/i, "Clock"],
  [/협업|소통|협력/i, "MessageSquare"],
  [/기술|시스템|플랫폼/i, "Cpu"],
  [/리더|경영|관리/i, "Briefcase"],
  [/성장|향상|개선/i, "TrendingUp"],
  [/혁신|변화|전환/i, "Zap"],
  [/문서|보고서|자료/i, "FileText"],
  [/글로벌|해외|국제/i, "Globe"],
  [/고객|서비스|만족/i, "Heart"],
  [/품질|검증|테스트/i, "CheckSquare"],
  [/마케팅|홍보|브랜드/i, "Megaphone"],
  [/보안|리스크|위험/i, "Shield"],
  [/채용|인사|HR/i, "Users"],
];

function guessIcon(text: string): string {
  for (const [re, icon] of ICON_KEYWORDS) {
    if (re.test(text)) return icon;
  }
  return "CheckCircle2";
}

/**
 * Split a point string into { title, sub }.
 * Supports "제목: 설명" format — preserves ALL content after the first colon/dash.
 * If no separator, returns the full string as text with no sub.
 */
function splitPoint(p: string): { text: string; sub?: string } {
  // Find the FIRST colon or dash separator
  const match = p.match(/^([^:\-–—]+?)[\-–—:]\s*(.+)$/s);
  if (match) {
    const title = match[1].trim();
    const desc = match[2].trim();
    // Only split if title is meaningfully short (not the whole sentence) and desc is non-empty
    if (title.length < 30 && desc.length > 5) {
      return { text: title, sub: desc };
    }
  }
  return { text: p };
}

/**
 * Split a process step into { title, description }.
 * Unlike bullets, description should always be shown (even if it's the whole string).
 */
function splitProcessStep(p: string): { title: string; description: string } {
  const match = p.match(/^([^:\-–—]+?)[\-–—:]\s*(.+)$/s);
  if (match) {
    const title = match[1].trim();
    const description = match[2].trim();
    if (title.length < 30 && description.length > 5) {
      return { title, description };
    }
  }
  // No separator: treat first ~20 chars as title, rest as description
  const words = p.split(/\s+/);
  if (words.length > 4) {
    return {
      title: words.slice(0, 3).join(" "),
      description: p,
    };
  }
  return { title: p, description: "" };
}

function mapSection(section: OutlineSection, sectionIndex: number): SlideSlot {
  const { kind, heading, points, emphasis, numbers, sides } = section;

  switch (kind) {
    case "intro":
      return {
        component: "SectionDividerSlide",
        props: { sectionNumber: sectionIndex, title: heading, subtitle: points[0] },
      };

    case "agenda":
      return {
        component: "AgendaSlide",
        props: {
          heading,
          items: points.map((p, i) => {
            const { text, sub } = splitPoint(p);
            // For agenda, strip leading numbering like "1." "1)" "Ⅰ" from title
            const cleanTitle = text.replace(/^[\dⅠⅡⅢⅣⅤ]+[.)]\s*/, "").trim();
            return { number: i + 1, title: cleanTitle || text, desc: sub };
          }),
        },
      };

    case "section":
      return {
        component: "SectionDividerSlide",
        props: { sectionNumber: sectionIndex, title: heading, subtitle: emphasis ?? points[0] },
      };

    case "data":
      if (numbers && numbers.length > 0) {
        return {
          component: "StatsSlide",
          props: {
            heading,
            stats: numbers.map((n) => ({
              value: n.value,
              label: n.label,
              delta: n.delta,
              icon: guessIcon(n.label),
            })),
            emphasis,
          },
        };
      }
      // fallback: bullets with full text preserved
      return {
        component: "BulletsSlide",
        props: {
          heading,
          bullets: points.map((p) => {
            const { text, sub } = splitPoint(p);
            return { icon: guessIcon(p), text, sub };
          }),
          emphasis,
        },
      };

    case "comparison":
      if (sides) {
        const half = Math.ceil(points.length / 2);
        return {
          component: "ComparisonSlide",
          props: {
            heading,
            left: { label: sides.left, points: points.slice(0, half), emphasis },
            right: { label: sides.right, points: points.slice(half) },
          },
        };
      }
      {
        const half = Math.ceil(points.length / 2);
        return {
          component: "ComparisonSlide",
          props: {
            heading,
            left: { label: "현재 (AS-IS)", points: points.slice(0, half) },
            right: { label: "목표 (TO-BE)", points: points.slice(half), emphasis },
          },
        };
      }

    case "process":
      return {
        component: "ProcessSlide",
        props: {
          heading,
          steps: points.map((p, i) => {
            const { title, description } = splitProcessStep(p);
            return {
              number: i + 1,
              title,
              description,
              icon: guessIcon(p),
            };
          }),
          emphasis,
        },
      };

    case "quote":
      return {
        component: "QuoteSlide",
        props: {
          quote: emphasis ?? points[0] ?? heading,
          source: points[1],
          context: points[2],
        },
      };

    case "cta":
      return {
        component: "BulletsSlide",
        props: {
          heading,
          bullets: points.map((p) => {
            const { text, sub } = splitPoint(p);
            return { icon: guessIcon(p), text, sub };
          }),
          emphasis,
        },
      };

    case "close":
      return {
        component: "ClosingSlide",
        props: {
          message: emphasis ?? heading,
          contact: points[0],
        },
      };

    case "concept":
    default:
      return {
        component: "BulletsSlide",
        props: {
          heading,
          bullets: points.map((p) => {
            const { text, sub } = splitPoint(p);
            return { icon: guessIcon(p), text, sub };
          }),
          emphasis,
        },
      };
  }
}

export function mapOutlineToDeck(outline: DeckOutline): SlotDeck {
  const slides: SlideSlot[] = [];

  slides.push({
    component: "TitleSlide",
    props: { title: outline.title, subtitle: outline.subtitle },
  });

  let sectionCounter = 0;

  for (const section of outline.sections) {
    if (section.kind === "section" || section.kind === "intro") {
      sectionCounter++;
    }
    const slot = mapSection(section, sectionCounter || 1);
    slides.push(slot);
  }

  // Ensure closing slide exists
  const lastSlide = slides[slides.length - 1];
  if (lastSlide?.component !== "ClosingSlide") {
    slides.push({
      component: "ClosingSlide",
      props: { message: "감사합니다" },
    });
  }

  return {
    meta: { title: outline.title, theme: "hana" },
    slides,
  };
}

import type { DesignPreset } from "./types";

/**
 * 하나증권 임원보고용 디자인 시스템
 *
 * 하나증권 CI:
 * - 하나그린 #009591  → primary (헤더바 배경, 섹션 배경, 표 헤더, 불릿)
 * - 하나레드 #ED1651  → secondary (강조선, 배지, 포인트)
 * - 폰트: 하나2.0 B (제목) / 하나2.0 M (본문)
 * - 타이틀바: full-bleed (그린 풀블리드) + 좌측 핑크 4pt 세로 강조선
 * - 섹션 슬라이드: full-color (그린 배경 + 섹션 번호)
 */
const hanaSecurities: DesignPreset = {
  id: "hana-report-clean",
  name: "하나증권",
  description: "하나증권 공식 CI — 하나그린(#009591) + 하나레드(#ED1651) + 하나2.0 폰트",
  baseTheme: "hana",

  tokens: {
    colors: {
      primary:     "009591",   // 하나그린 — 헤더바·섹션배경·표헤더
      secondary:   "ED1651",   // 하나레드 — 강조선·배지·포인트
      background:  "FFFFFF",
      surface:     "F0FAFA",   // 카드 배경 (그린 계열 연한 틴트)
      titleText:   "FFFFFF",   // 헤더 안 흰 제목
      bodyText:    "231F20",   // 본문 기본 텍스트
      mutedText:   "666666",   // 보조 텍스트 / 각주
      tableHeader: "009591",
      tableRow1:   "FFFFFF",
      tableRow2:   "E6F7F7",   // 그린 틴트 짝수 행
      bullet:      "009591",
      sectionBg:   "007A77",   // 섹션 슬라이드 배경 (그린 다크)
    },
    fonts: {
      title: "하나2.0 B",
      body:  "하나2.0 M",
    },
  },

  chrome: {
    titleBar: {
      style:        "full-bleed",
      heightInches: 0.806,     // 58pt ÷ 72pt/in — 풀블리드 그린 헤더
    },
    decorations: [
      // 타이틀바 우측 반투명 흰 원형 (CI 브랜드 패턴)
      { type: "circle", x: 9.1, y: -0.35, r: 0.9, color: "FFFFFF", opacity: 25 },
      // 본문 우하단 그린 워터마크 원 (은은한 브랜드 느낌)
      { type: "circle", x: 8.5, y: 3.7,  r: 1.7,  color: "009591", opacity: 6  },
    ],
    pageNumber: {
      position: "bottom-right",
      fontSize: 8,
      color:    "9CA3AF",
    },
    footerLine: {
      color:     "009591",    // 그린 푸터선
      thickness: 0.5,
    },
  },

  titleSlide: {
    style:       "center-gradient",
    coverShape:  "circle",
  },

  sectionSlide: {
    style: "full-color",       // 그린 배경 + 흰 섹션 제목
  },

  sampleDeck: {
    narrative:
      "표지 → 목차(로마숫자 Ⅰ/Ⅱ/Ⅲ agenda) → 섹션 인트로(section) → " +
      "추진 배경·현황(timeline 또는 comparison) → 세부 실행 방안(process 또는 grid) → " +
      "우수사례(grid 또는 comparison) → 종합·결론(highlight 또는 stats) → 마무리(closing)",
    preferredLayouts: [
      "agenda",
      "section",
      "timeline",
      "comparison",
      "process",
      "grid",
      "highlight",
      "stats",
      "closing",
    ],
    styleNotes: [
      "목차는 로마숫자(Ⅰ Ⅱ Ⅲ Ⅳ) + 섹션명 agenda 레이아웃",
      "헤더바·섹션 배경은 하나그린(#009591), 배지·강조선은 하나레드(#ED1651)",
      "카드 배경은 연한 그린 틴트(#F0FAFA), 카드 상단 그린 3pt 강조선 적용",
      "표 헤더는 그린, 짝수 행은 #E6F7F7 그린 틴트",
      "수치·퍼센트가 있으면 stats 또는 chart_bar 우선 사용",
      "같은 레이아웃 3회 연속 사용 금지",
      "보조 설명은 mutedText(#666666) 10pt 이하",
    ],
  },
};

export default hanaSecurities;

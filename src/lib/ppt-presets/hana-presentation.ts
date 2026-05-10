import type { DesignPreset } from "./types";

/**
 * 하나증권 발표용 디자인 시스템
 *
 * hana-report-clean과 동일한 CI(색상·폰트·로고)를 사용하되
 * 시각화(표·차트·비교·프로세스)를 적극적으로 활용하는 발표 덱 전용 프리셋.
 *
 * 차이점:
 * - titleBar: full-bleed (동일)
 * - sectionSlide: numbered (번호+제목 스타일, 발표 흐름 강조)
 * - preferredLayouts: table·chart_bar·chart_pie·chart_line·comparison·process·grid 우선
 * - 슬라이드당 핵심 1메시지, 텍스트 최소화, 시각화 최대화
 */
const hanaPresentation: DesignPreset = {
  id: "hana-presentation",
  name: "하나증권 발표용",
  description: "하나증권 CI — 발표·세미나 최적화. 표·차트·비교 레이아웃 강조.",
  baseTheme: "hana",

  tokens: {
    colors: {
      primary:     "009591",   // 하나그린
      secondary:   "ED1651",   // 하나레드 (강조)
      background:  "FFFFFF",
      surface:     "F0FAFA",
      titleText:   "FFFFFF",
      bodyText:    "231F20",
      mutedText:   "666666",
      tableHeader: "009591",
      tableRow1:   "FFFFFF",
      tableRow2:   "E6F7F7",
      bullet:      "009591",
      sectionBg:   "007A77",
      // Extended
      tertiary:    "007A77",
      accentWarm:  "ED1651",
      accentCool:  "1E4D9B",
      accentHR:    "2E7D32",
      cardHeaderText: "FFFFFF",
      datapointText:  "009591",
    },
    fonts: {
      title: "하나2.0 B",
      body:  "하나2.0 M",
    },
  },

  chrome: {
    titleBar: {
      style:        "full-bleed",
      heightInches: 0.806,
    },
    decorations: [
      // 타이틀바 우측 반투명 흰 원형
      { type: "circle", x: 9.1, y: -0.35, r: 0.9, color: "FFFFFF", opacity: 25 },
      // 본문 우하단 그린 워터마크 원
      { type: "circle", x: 8.5, y: 3.7, r: 1.7, color: "009591", opacity: 6 },
    ],
    pageNumber: {
      position: "bottom-right",
      fontSize: 8,
      color:    "9CA3AF",
    },
    footerLine: {
      color:     "009591",
      thickness: 0.5,
    },
  },

  titleSlide: {
    style:      "center-gradient",
    coverShape: "circle",
  },

  sectionSlide: {
    style: "numbered",   // 섹션 번호 강조 — 발표 흐름 명확화
  },

  sampleDeck: {
    narrative:
      "표지 → 목차(agenda) → 섹션 인트로(hana_divider) → " +
      "현황 분석(chart_bar 또는 chart_line) → 비교/분석(comparison 또는 table) → " +
      "주요 이슈(two_column 또는 hana_matrix) → 실행 방안(process 또는 grid) → " +
      "KPI 요약(hana_kpi 또는 stats) → 마무리(closing)",
    preferredLayouts: [
      "table",
      "chart_bar",
      "chart_pie",
      "chart_line",
      "comparison",
      "process",
      "grid",
      "hana_kpi",
      "hana_matrix",
      "two_column",
    ],
    styleNotes: [
      "슬라이드당 핵심 메시지 1문장 — 제목이 결론이 되도록",
      "표 헤더는 하나그린(#009591), 짝수 행은 #E6F7F7 틴트",
      "차트 색상: primary(하나그린) → secondary(하나레드) → accentCool(네이비) 순서",
      "비교 슬라이드(comparison): 좌측 현재/문제, 우측 해결/목표 배치",
      "프로세스(process): 최대 5단계, 각 단계에 짧은 동사형 라벨",
      "텍스트 불릿은 슬라이드당 최대 5개 — 이상이면 grid나 comparison으로 전환",
      "같은 레이아웃 2회 연속 사용 지양",
      "수치 강조: hana_kpi 또는 stats 레이아웃으로 숫자를 크게 표시",
    ],
  },
};

export default hanaPresentation;

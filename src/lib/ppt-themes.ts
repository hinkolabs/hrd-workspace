export type ThemeId = "professional" | "modern" | "education" | "minimal" | "hana";

export interface PptTheme {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    primary: string;      // Main brand color (hex without #)
    secondary: string;    // Accent color
    background: string;   // Slide background
    surface: string;      // Card/section background
    titleText: string;    // Title text color
    bodyText: string;     // Body text color
    mutedText: string;    // Muted/secondary text
    tableHeader: string;  // Table header bg
    tableRow1: string;    // Table row alternating color 1
    tableRow2: string;    // Table row alternating color 2
    bullet: string;       // Bullet accent color
    sectionBg: string;    // Section divider background
    // Extended semantic palette (added in quality overhaul)
    tertiary?: string;    // 3번째 브랜드 색 (그리드 3번째 아이템 / 프로세스 3단계)
    accentWarm?: string;  // 경고/포인트 (빨강계)
    accentCool?: string;  // 전략/분석 (파랑계)
    accentHR?: string;    // HR/인사 (녹색계)
    cardHeaderText?: string; // 카드 헤더 흰/진한 선택
    datapointText?: string;  // 수치 강조용 (기본: primary)
  };
  fonts: {
    title: string;
    body: string;
    size: {
      // Classic (kept for back-compat)
      mainTitle: number;
      slideTitle: number;
      sectionTitle: number;
      body: number;
      bullet: number;
      caption: number;
      // Extended semantic sizes (added in quality overhaul)
      displayHuge: number;    // 표지 메인 타이틀 (큰 수치 등)
      displayLarge: number;   // 표지 서브 / KPI 수치
      h1: number;             // 타이틀바
      h2: number;             // 카드 헤딩
      h3: number;             // 서브 헤딩
      label: number;          // 배지/라벨
      bodyLarge: number;      // 본문 강조
      bodySmall: number;      // 본문 축약
      footnote: number;       // 각주/출처
      tableHeader: number;    // 표 헤더
      tableCell: number;      // 표 셀
    };
  };
}

const DEFAULT_FONT_SIZES = {
  mainTitle: 48,
  slideTitle: 32,
  sectionTitle: 42,
  body: 18,
  bullet: 17,
  caption: 12,
  // Extended
  displayHuge: 54,
  displayLarge: 38,
  h1: 22,
  h2: 16,
  h3: 14,
  label: 10,
  bodyLarge: 15,
  bodySmall: 11,
  footnote: 9,
  tableHeader: 12,
  tableCell: 11,
};

// 하나서체: 하나금융그룹 공식 폰트 (pptxgenjs uses internal font family name)
// Bold(제목) = "하나2.0 B", Medium(본문) = "하나2.0 M", Light = "하나2.0 L"
const DEFAULT_FONTS = { title: "하나2.0 B", body: "하나2.0 M" };

export const PPT_THEMES: Record<ThemeId, PptTheme> = {
  hana: {
    id: "hana",
    name: "하나증권",
    description: "하나증권 공식 CI - 하나그린 + 화이트",
    colors: {
      primary: "009591",
      secondary: "ED1651",
      background: "FFFFFF",
      surface: "F0FAFA",
      titleText: "231F20",
      bodyText: "231F20",
      mutedText: "666666",
      tableHeader: "009591",
      tableRow1: "FFFFFF",
      tableRow2: "E6F7F7",
      bullet: "009591",
      sectionBg: "007A77",
      // Extended semantic palette
      tertiary:   "1E4D9B",  // Navy — 3번째 브랜드 색 (전략/분석)
      accentWarm: "ED1651",  // Hana red
      accentCool: "1E4D9B",  // Navy
      accentHR:   "2E7D32",  // Green (HR·인사)
      cardHeaderText: "FFFFFF",
      datapointText:  "009591",
    },
    fonts: { ...DEFAULT_FONTS, size: DEFAULT_FONT_SIZES },
  },

  professional: {
    id: "professional",
    name: "Professional",
    description: "네이비 + 화이트 - 비즈니스 보고서용",
    colors: {
      primary: "1E3A5F",
      secondary: "2E86AB",
      background: "FFFFFF",
      surface: "F4F6F9",
      titleText: "1E3A5F",
      bodyText: "2D3748",
      mutedText: "718096",
      tableHeader: "1E3A5F",
      tableRow1: "FFFFFF",
      tableRow2: "EBF0F7",
      bullet: "2E86AB",
      sectionBg: "1E3A5F",
      tertiary:   "C05621",
      accentWarm: "C53030",
      accentCool: "2B6CB0",
      accentHR:   "2F855A",
      cardHeaderText: "FFFFFF",
      datapointText:  "1E3A5F",
    },
    fonts: { ...DEFAULT_FONTS, size: DEFAULT_FONT_SIZES },
  },

  modern: {
    id: "modern",
    name: "Modern",
    description: "다크 그레이 + 인디고 - 제안서/일반용",
    colors: {
      primary: "312E81",
      secondary: "6366F1",
      background: "1F2937",
      surface: "374151",
      titleText: "F9FAFB",
      bodyText: "E5E7EB",
      mutedText: "9CA3AF",
      tableHeader: "312E81",
      tableRow1: "374151",
      tableRow2: "4B5563",
      bullet: "818CF8",
      sectionBg: "312E81",
      tertiary:   "EC4899",
      accentWarm: "F97316",
      accentCool: "0EA5E9",
      accentHR:   "10B981",
      cardHeaderText: "FFFFFF",
      datapointText:  "A5B4FC",
    },
    fonts: { ...DEFAULT_FONTS, size: DEFAULT_FONT_SIZES },
  },

  education: {
    id: "education",
    name: "Education",
    description: "블루 + 밝은 톤 - 교육 자료용",
    colors: {
      primary: "0369A1",
      secondary: "38BDF8",
      background: "F0F9FF",
      surface: "E0F2FE",
      titleText: "0C4A6E",
      bodyText: "1E3A5F",
      mutedText: "0369A1",
      tableHeader: "0369A1",
      tableRow1: "FFFFFF",
      tableRow2: "E0F2FE",
      bullet: "0EA5E9",
      sectionBg: "0369A1",
      tertiary:   "F59E0B",
      accentWarm: "EF4444",
      accentCool: "0EA5E9",
      accentHR:   "10B981",
      cardHeaderText: "FFFFFF",
      datapointText:  "0369A1",
    },
    fonts: { ...DEFAULT_FONTS, size: DEFAULT_FONT_SIZES },
  },

  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "화이트 + 블랙 - 깔끔한 스타일",
    colors: {
      primary: "111827",
      secondary: "6B7280",
      background: "FFFFFF",
      surface: "F9FAFB",
      titleText: "111827",
      bodyText: "374151",
      mutedText: "9CA3AF",
      tableHeader: "111827",
      tableRow1: "FFFFFF",
      tableRow2: "F3F4F6",
      bullet: "6B7280",
      sectionBg: "111827",
      tertiary:   "9CA3AF",
      accentWarm: "DC2626",
      accentCool: "2563EB",
      accentHR:   "059669",
      cardHeaderText: "FFFFFF",
      datapointText:  "111827",
    },
    fonts: { ...DEFAULT_FONTS, size: DEFAULT_FONT_SIZES },
  },

};

export const DEFAULT_THEME: ThemeId = "hana";

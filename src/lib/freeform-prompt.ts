/**
 * Shared prompt builder for Freeform (scene-based) PPT generation.
 * Used by both generate/route.ts and redesign/route.ts.
 */

import { PPT_THEMES, type ThemeId } from "./ppt-themes";
import type { SceneSlide } from "./ppt-builder";
import { validateAndSanitizeScene } from "./scene-validator";

// ─── Few-shot example generator ────────────────────────────────────────────────

function makeTitleExample(primary: string, secondary: string): object {
  return {
    layout: "scene",
    title: "경영지원그룹 현황 보고",
    background: primary,
    elements: [
      { type: "rect", x: 0, y: 0, w: 10, h: 5.625, fill: primary },
      { type: "ellipse", x: 7.4, y: -2.6, w: 5.2, h: 5.2, fill: "#FFFFFF", opacity: 0.12 },
      { type: "ellipse", x: -1.8, y: 3.8, w: 3.6, h: 3.6, fill: "#FFFFFF", opacity: 0.10 },
      { type: "ellipse", x: 9.05, y: 2.7, w: 1.6, h: 1.6, fill: secondary, opacity: 0.42 },
      { type: "rect", x: 0, y: 0.56, w: 0.14, h: 4.5, fill: secondary },
      { type: "rect", x: 0.35, y: 4.0, w: 5.2, h: 0.04, fill: secondary },
      { type: "text", x: 0.42, y: 0.28, w: 8.3, h: 3.5, text: "경영지원그룹\n현황 보고", fontSize: 46, color: "#FFFFFF", bold: true, align: "left", valign: "middle" },
      { type: "text", x: 0.42, y: 4.1, w: 8.0, h: 0.52, text: "2024년 상반기", fontSize: 17, color: "#DDDDDD", align: "left", valign: "middle" },
      { type: "text", x: 0.42, y: 5.07, w: 8.0, h: 0.38, text: "2024년 6월", fontSize: 11, color: secondary, align: "left" },
    ],
  };
}

function makeStatsExample(primary: string, secondary: string, surface: string, bodyText: string, muted: string): object {
  return {
    layout: "scene",
    title: "핵심 성과 지표",
    background: "#FFFFFF",
    elements: [
      { type: "rect", x: 0, y: 0, w: 10, h: 5.625, fill: "#FFFFFF" },
      { type: "rect", x: 0, y: 0, w: 10, h: 0.75, fill: primary },
      { type: "rect", x: 0, y: 0, w: 0.07, h: 0.75, fill: secondary },
      { type: "rect", x: 0, y: 0.71, w: 10, h: 0.04, fill: secondary },
      { type: "ellipse", x: 8.7, y: -0.3, w: 1.8, h: 1.8, fill: "#FFFFFF", opacity: 0.10 },
      { type: "text", x: 0.25, y: 0, w: 9.0, h: 0.71, text: "핵심 성과 지표", fontSize: 22, color: "#FFFFFF", bold: true, align: "left", valign: "middle" },
      { type: "rect", x: 0.3, y: 0.98, w: 4.35, h: 3.9, fill: surface },
      { type: "rect", x: 0.3, y: 0.98, w: 4.35, h: 0.12, fill: primary },
      { type: "icon", name: "mdi:trending-up", x: 1.2, y: 1.3, w: 0.7, h: 0.7, color: primary },
      { type: "text", x: 0.3, y: 1.7, w: 4.35, h: 1.6, text: "120%", fontSize: 52, color: primary, bold: true, align: "center", valign: "middle" },
      { type: "text", x: 0.3, y: 3.35, w: 4.35, h: 0.5, text: "목표 달성률", fontSize: 15, color: bodyText, bold: true, align: "center", valign: "middle" },
      { type: "text", x: 0.3, y: 3.85, w: 4.35, h: 0.3, text: "전년 대비 +20%p", fontSize: 10, color: muted, align: "center" },
      { type: "rect", x: 5.35, y: 0.98, w: 4.35, h: 3.9, fill: surface },
      { type: "rect", x: 5.35, y: 0.98, w: 4.35, h: 0.12, fill: secondary },
      { type: "icon", name: "mdi:currency-krw", x: 6.25, y: 1.3, w: 0.7, h: 0.7, color: secondary },
      { type: "text", x: 5.35, y: 1.7, w: 4.35, h: 1.6, text: "₩4.2B", fontSize: 52, color: secondary, bold: true, align: "center", valign: "middle" },
      { type: "text", x: 5.35, y: 3.35, w: 4.35, h: 0.5, text: "연간 매출", fontSize: 15, color: bodyText, bold: true, align: "center", valign: "middle" },
      { type: "text", x: 5.35, y: 3.85, w: 4.35, h: 0.3, text: "YoY +18%", fontSize: 10, color: muted, align: "center" },
      { type: "ellipse", x: 7.2, y: 3.5, w: 3.5, h: 3.5, fill: primary, opacity: 0.04 },
    ],
  };
}

function makeContentExample(primary: string, secondary: string, surface: string, bodyText: string): object {
  return {
    layout: "scene",
    title: "주요 실행 전략",
    background: "#FFFFFF",
    elements: [
      { type: "rect", x: 0, y: 0, w: 10, h: 5.625, fill: "#FFFFFF" },
      { type: "rect", x: 0, y: 0, w: 10, h: 0.75, fill: primary },
      { type: "rect", x: 0, y: 0, w: 0.07, h: 0.75, fill: secondary },
      { type: "rect", x: 0, y: 0.71, w: 10, h: 0.04, fill: secondary },
      { type: "ellipse", x: 8.7, y: -0.3, w: 1.8, h: 1.8, fill: "#FFFFFF", opacity: 0.10 },
      { type: "text", x: 0.25, y: 0, w: 9.0, h: 0.71, text: "주요 실행 전략", fontSize: 22, color: "#FFFFFF", bold: true, align: "left", valign: "middle" },
      { type: "rect", x: 0.3, y: 0.98, w: 9.4, h: 1.1, fill: surface },
      { type: "rect", x: 0.3, y: 0.98, w: 0.16, h: 1.1, fill: primary },
      { type: "icon", name: "mdi:target", x: 0.62, y: 1.12, w: 0.52, h: 0.52, color: primary },
      { type: "text", x: 1.35, y: 0.98, w: 8.2, h: 1.1, text: "전략 1: 디지털 전환 가속화 — 핵심 시스템 클라우드 전환", fontSize: 14, color: bodyText, bold: false, valign: "middle" },
      { type: "rect", x: 0.3, y: 2.22, w: 9.4, h: 1.1, fill: surface },
      { type: "rect", x: 0.3, y: 2.22, w: 0.16, h: 1.1, fill: secondary },
      { type: "icon", name: "mdi:account-group", x: 0.62, y: 2.36, w: 0.52, h: 0.52, color: secondary },
      { type: "text", x: 1.35, y: 2.22, w: 8.2, h: 1.1, text: "전략 2: 핵심 인재 역량 강화 — 교육 체계 재정비 및 채용 확대", fontSize: 14, color: bodyText, bold: false, valign: "middle" },
      { type: "rect", x: 0.3, y: 3.46, w: 9.4, h: 1.1, fill: surface },
      { type: "rect", x: 0.3, y: 3.46, w: 0.16, h: 1.1, fill: primary },
      { type: "icon", name: "mdi:chart-line", x: 0.62, y: 3.60, w: 0.52, h: 0.52, color: primary },
      { type: "text", x: 1.35, y: 3.46, w: 8.2, h: 1.1, text: "전략 3: 성과 기반 운영 체계 — KPI 재설계 및 주간 리뷰 정착", fontSize: 14, color: bodyText, bold: false, valign: "middle" },
      { type: "ellipse", x: 7.5, y: 3.8, w: 3.2, h: 3.2, fill: primary, opacity: 0.05 },
    ],
  };
}

function makeAgendaExample(primary: string, secondary: string, surface: string, bodyText: string, muted: string): object {
  return {
    layout: "scene",
    title: "목차",
    background: "#FFFFFF",
    elements: [
      { type: "rect", x: 0, y: 0, w: 10, h: 5.625, fill: "#FFFFFF" },
      { type: "rect", x: 0, y: 0, w: 10, h: 0.75, fill: primary },
      { type: "rect", x: 0, y: 0, w: 0.07, h: 0.75, fill: secondary },
      { type: "text", x: 0.25, y: 0, w: 9.0, h: 0.75, text: "목차", fontSize: 22, color: "#FFFFFF", bold: true, valign: "middle" },
      { type: "rect", x: 0.3, y: 1.1, w: 4.6, h: 1.0, fill: surface },
      { type: "text", x: 0.45, y: 1.1, w: 0.6, h: 1.0, text: "Ⅰ", fontSize: 28, color: primary, bold: true, valign: "middle" },
      { type: "text", x: 1.1, y: 1.15, w: 3.5, h: 0.45, text: "추진 배경", fontSize: 15, color: bodyText, bold: true, valign: "middle" },
      { type: "text", x: 1.1, y: 1.55, w: 3.5, h: 0.45, text: "시장 환경 및 내부 이슈 진단", fontSize: 11, color: muted, valign: "top" },
      { type: "rect", x: 5.1, y: 1.1, w: 4.6, h: 1.0, fill: surface },
      { type: "text", x: 5.25, y: 1.1, w: 0.6, h: 1.0, text: "Ⅱ", fontSize: 28, color: secondary, bold: true, valign: "middle" },
      { type: "text", x: 5.9, y: 1.15, w: 3.5, h: 0.45, text: "현황 분석", fontSize: 15, color: bodyText, bold: true, valign: "middle" },
      { type: "text", x: 5.9, y: 1.55, w: 3.5, h: 0.45, text: "핵심 KPI 및 격차 분석", fontSize: 11, color: muted, valign: "top" },
      { type: "rect", x: 0.3, y: 2.35, w: 4.6, h: 1.0, fill: surface },
      { type: "text", x: 0.45, y: 2.35, w: 0.6, h: 1.0, text: "Ⅲ", fontSize: 28, color: primary, bold: true, valign: "middle" },
      { type: "text", x: 1.1, y: 2.4, w: 3.5, h: 0.45, text: "실행 전략", fontSize: 15, color: bodyText, bold: true, valign: "middle" },
      { type: "text", x: 1.1, y: 2.8, w: 3.5, h: 0.45, text: "3대 영역별 세부 액션", fontSize: 11, color: muted, valign: "top" },
      { type: "rect", x: 5.1, y: 2.35, w: 4.6, h: 1.0, fill: surface },
      { type: "text", x: 5.25, y: 2.35, w: 0.6, h: 1.0, text: "Ⅳ", fontSize: 28, color: secondary, bold: true, valign: "middle" },
      { type: "text", x: 5.9, y: 2.4, w: 3.5, h: 0.45, text: "기대 효과", fontSize: 15, color: bodyText, bold: true, valign: "middle" },
      { type: "text", x: 5.9, y: 2.8, w: 3.5, h: 0.45, text: "정량·정성 임팩트", fontSize: 11, color: muted, valign: "top" },
      { type: "ellipse", x: 7.8, y: 4.0, w: 3.0, h: 3.0, fill: primary, opacity: 0.06 },
    ],
  };
}

function makeProcessExample(primary: string, secondary: string, bodyText: string, muted: string): object {
  return {
    layout: "scene",
    title: "실행 프로세스",
    background: "#FFFFFF",
    elements: [
      { type: "rect", x: 0, y: 0, w: 10, h: 5.625, fill: "#FFFFFF" },
      { type: "rect", x: 0, y: 0, w: 10, h: 0.75, fill: primary },
      { type: "rect", x: 0, y: 0, w: 0.07, h: 0.75, fill: secondary },
      { type: "text", x: 0.25, y: 0, w: 9.0, h: 0.75, text: "실행 프로세스", fontSize: 22, color: "#FFFFFF", bold: true, valign: "middle" },
      // 4 step chevrons
      { type: "rect", x: 0.3,  y: 1.6, w: 2.2, h: 0.9, fill: primary, opacity: 0.9 },
      { type: "text", x: 0.3,  y: 1.6, w: 2.2, h: 0.9, text: "01", fontSize: 32, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "text", x: 0.3,  y: 2.55, w: 2.2, h: 0.5, text: "기획", fontSize: 14, color: bodyText, bold: true, align: "center" },
      { type: "text", x: 0.3,  y: 3.05, w: 2.2, h: 0.9, text: "과제 정의 및 KPI 설정", fontSize: 10, color: muted, align: "center", valign: "top" },
      { type: "rect", x: 2.6,  y: 1.6, w: 2.2, h: 0.9, fill: secondary, opacity: 0.9 },
      { type: "text", x: 2.6,  y: 1.6, w: 2.2, h: 0.9, text: "02", fontSize: 32, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "text", x: 2.6,  y: 2.55, w: 2.2, h: 0.5, text: "실행", fontSize: 14, color: bodyText, bold: true, align: "center" },
      { type: "text", x: 2.6,  y: 3.05, w: 2.2, h: 0.9, text: "팀별 액션 플랜 수행", fontSize: 10, color: muted, align: "center", valign: "top" },
      { type: "rect", x: 4.9,  y: 1.6, w: 2.2, h: 0.9, fill: primary, opacity: 0.8 },
      { type: "text", x: 4.9,  y: 1.6, w: 2.2, h: 0.9, text: "03", fontSize: 32, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "text", x: 4.9,  y: 2.55, w: 2.2, h: 0.5, text: "점검", fontSize: 14, color: bodyText, bold: true, align: "center" },
      { type: "text", x: 4.9,  y: 3.05, w: 2.2, h: 0.9, text: "주간 단위 진행률 리뷰", fontSize: 10, color: muted, align: "center", valign: "top" },
      { type: "rect", x: 7.2,  y: 1.6, w: 2.5, h: 0.9, fill: secondary, opacity: 0.85 },
      { type: "text", x: 7.2,  y: 1.6, w: 2.5, h: 0.9, text: "04", fontSize: 32, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "text", x: 7.2,  y: 2.55, w: 2.5, h: 0.5, text: "안착", fontSize: 14, color: bodyText, bold: true, align: "center" },
      { type: "text", x: 7.2,  y: 3.05, w: 2.5, h: 0.9, text: "표준화·공유·확산", fontSize: 10, color: muted, align: "center", valign: "top" },
      { type: "line", x1: 2.5, y1: 2.05, x2: 2.6, y2: 2.05, color: primary, thickness: 2 },
      { type: "line", x1: 4.8, y1: 2.05, x2: 4.9, y2: 2.05, color: primary, thickness: 2 },
      { type: "line", x1: 7.1, y1: 2.05, x2: 7.2, y2: 2.05, color: primary, thickness: 2 },
      { type: "ellipse", x: -1.0, y: 4.5, w: 2.8, h: 2.8, fill: primary, opacity: 0.06 },
    ],
  };
}

function makeComparisonExample(primary: string, secondary: string, surface: string, bodyText: string, muted: string): object {
  return {
    layout: "scene",
    title: "Before / After",
    background: "#FFFFFF",
    elements: [
      { type: "rect", x: 0, y: 0, w: 10, h: 5.625, fill: "#FFFFFF" },
      { type: "rect", x: 0, y: 0, w: 10, h: 0.75, fill: primary },
      { type: "rect", x: 0, y: 0, w: 0.07, h: 0.75, fill: secondary },
      { type: "text", x: 0.25, y: 0, w: 9.0, h: 0.75, text: "Before / After", fontSize: 22, color: "#FFFFFF", bold: true, valign: "middle" },
      // Before (left)
      { type: "rect", x: 0.3, y: 1.1, w: 4.3, h: 4.1, fill: surface },
      { type: "rect", x: 0.3, y: 1.1, w: 4.3, h: 0.5, fill: muted },
      { type: "text", x: 0.3, y: 1.1, w: 4.3, h: 0.5, text: "AS-IS", fontSize: 14, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "text", x: 0.5, y: 1.75, w: 3.9, h: 0.5, text: "• 분기 리포트 수작업 3일 소요", fontSize: 12, color: bodyText, valign: "top" },
      { type: "text", x: 0.5, y: 2.2, w: 3.9, h: 0.5, text: "• 데이터 일관성 이슈 빈발", fontSize: 12, color: bodyText, valign: "top" },
      { type: "text", x: 0.5, y: 2.65, w: 3.9, h: 0.5, text: "• KPI 가시성 낮음", fontSize: 12, color: bodyText, valign: "top" },
      // VS badge
      { type: "ellipse", x: 4.55, y: 2.6, w: 0.9, h: 0.9, fill: secondary },
      { type: "text", x: 4.55, y: 2.6, w: 0.9, h: 0.9, text: "VS", fontSize: 14, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      // After (right)
      { type: "rect", x: 5.4, y: 1.1, w: 4.3, h: 4.1, fill: surface },
      { type: "rect", x: 5.4, y: 1.1, w: 4.3, h: 0.5, fill: primary },
      { type: "text", x: 5.4, y: 1.1, w: 4.3, h: 0.5, text: "TO-BE", fontSize: 14, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "text", x: 5.6, y: 1.75, w: 3.9, h: 0.5, text: "✓ 자동화 리포트 실시간 생성", fontSize: 12, color: bodyText, bold: true, valign: "top" },
      { type: "text", x: 5.6, y: 2.2, w: 3.9, h: 0.5, text: "✓ 단일 데이터 레이크 적용", fontSize: 12, color: bodyText, bold: true, valign: "top" },
      { type: "text", x: 5.6, y: 2.65, w: 3.9, h: 0.5, text: "✓ 경영 대시보드 전면 도입", fontSize: 12, color: bodyText, bold: true, valign: "top" },
      { type: "text", x: 5.4, y: 4.6, w: 4.3, h: 0.5, text: "→ 업무 효율 80%↑ 기대", fontSize: 13, color: primary, bold: true, align: "center" },
    ],
  };
}

function makeTableExample(primary: string, secondary: string, surface: string, bodyText: string, muted: string): object {
  // Consulting-style data table slide (Lotte-deck inspired)
  return {
    layout: "scene",
    title: "2.1 시스템별 운영 현황",
    background: "#FFFFFF",
    elements: [
      { type: "rect", x: 0, y: 0, w: 10, h: 5.625, fill: "#FFFFFF" },
      // Top title strip — slim, left-aligned chapter tag + title
      { type: "text", x: 0.35, y: 0.25, w: 9, h: 0.4, text: "2.1  시스템별 운영 현황", fontSize: 18, color: bodyText, bold: true },
      { type: "rect", x: 0.35, y: 0.72, w: 9.3, h: 0.02, fill: primary },
      // Small unit tag (top-right)
      { type: "rect", x: 8.0, y: 0.28, w: 1.7, h: 0.3, fill: primary },
      { type: "text", x: 8.0, y: 0.28, w: 1.7, h: 0.3, text: "(단위: 원)", fontSize: 9, color: "#FFFFFF", align: "center", valign: "middle" },
      // The table itself — 4 rows × 5 cols
      {
        type: "table",
        x: 0.35, y: 0.95, w: 9.3, h: 3.4,
        colW: [2.0, 1.8, 1.8, 1.85, 1.85],
        border: { color: "#CCCCCC", pt: 0.5 },
        defaultFontSize: 11,
        cells: [
          [
            { text: "시스템명", fill: primary, color: "#FFFFFF", bold: true, align: "center" },
            { text: "구축연도", fill: primary, color: "#FFFFFF", bold: true, align: "center" },
            { text: "주관 부서", fill: primary, color: "#FFFFFF", bold: true, align: "center" },
            { text: "21년 비용", fill: primary, color: "#FFFFFF", bold: true, align: "center" },
            { text: "22년 예상", fill: primary, color: "#FFFFFF", bold: true, align: "center" },
          ],
          [
            { text: "연결회계", bold: true },
            { text: "'07", align: "center" },
            { text: "재무팀", align: "center" },
            { text: "150억", align: "right", color: primary, bold: true },
            { text: "180억", align: "right", bold: true },
          ],
          [
            { text: "안전관리", bold: true, fill: surface },
            { text: "'12", align: "center", fill: surface },
            { text: "안전팀", align: "center", fill: surface },
            { text: "130억", align: "right", fill: surface },
            { text: "145억", align: "right", bold: true, fill: surface },
          ],
          [
            { text: "부동산정보", bold: true },
            { text: "'18", align: "center" },
            { text: "자산팀", align: "center" },
            { text: "33억", align: "right" },
            { text: "42억", align: "right", bold: true },
          ],
        ],
      },
      // Footnote strip
      { type: "text", x: 0.35, y: 4.55, w: 9, h: 0.25, text: "※ 부가세 별도 / 전년 대비 증감률 상위 3개 시스템 표기", fontSize: 9, color: muted },
      // Bottom accent bar
      { type: "rect", x: 0.35, y: 4.9, w: 0.3, h: 0.3, fill: secondary },
      { type: "text", x: 0.75, y: 4.9, w: 8, h: 0.3, text: "'22년 안전관리 시스템 고도화로 비용 증가 예상", fontSize: 11, color: bodyText, valign: "middle" },
    ],
  };
}

function makeChartExample(primary: string, secondary: string, bodyText: string, muted: string): object {
  return {
    layout: "scene",
    title: "분기별 실적 추이",
    background: "#FFFFFF",
    elements: [
      { type: "rect", x: 0, y: 0, w: 10, h: 5.625, fill: "#FFFFFF" },
      { type: "rect", x: 0, y: 0, w: 10, h: 0.75, fill: primary },
      { type: "rect", x: 0, y: 0, w: 0.07, h: 0.75, fill: secondary },
      { type: "text", x: 0.25, y: 0, w: 9, h: 0.75, text: "분기별 매출 추이 — 2024", fontSize: 22, color: "#FFFFFF", bold: true, valign: "middle" },
      // Left chart
      {
        type: "chart",
        chartType: "bar",
        x: 0.3, y: 1.0, w: 5.8, h: 3.8,
        barDir: "col",
        series: [
          { name: "매출", labels: ["1Q", "2Q", "3Q", "4Q"], values: [320, 380, 450, 520] },
          { name: "목표", labels: ["1Q", "2Q", "3Q", "4Q"], values: [300, 350, 400, 500] },
        ],
        colors: [primary, secondary],
        showLegend: true,
        showValue: true,
      },
      // Right insight panel
      { type: "rect", x: 6.3, y: 1.0, w: 3.5, h: 3.8, fill: "#F5F7FA" },
      { type: "rect", x: 6.3, y: 1.0, w: 3.5, h: 0.4, fill: primary },
      { type: "text", x: 6.3, y: 1.0, w: 3.5, h: 0.4, text: "Key Insight", fontSize: 13, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "text", x: 6.5, y: 1.55, w: 3.1, h: 0.55, text: "YoY +62.5%", fontSize: 26, color: primary, bold: true, align: "center" },
      { type: "text", x: 6.5, y: 2.15, w: 3.1, h: 0.4, text: "4Q 최대 실적 달성", fontSize: 12, color: bodyText, align: "center" },
      { type: "rect", x: 6.5, y: 2.7, w: 3.1, h: 0.02, fill: "#DDDDDD" },
      { type: "text", x: 6.5, y: 2.85, w: 3.1, h: 0.3, text: "• 신규 상품 2개 출시", fontSize: 10, color: bodyText },
      { type: "text", x: 6.5, y: 3.15, w: 3.1, h: 0.3, text: "• 파트너 채널 확대", fontSize: 10, color: bodyText },
      { type: "text", x: 6.5, y: 3.45, w: 3.1, h: 0.3, text: "• 단가 프리미엄 전략", fontSize: 10, color: bodyText },
      // Footnote
      { type: "text", x: 0.3, y: 5.0, w: 9.4, h: 0.3, text: "출처: 2024년 분기별 실적 보고서", fontSize: 9, color: muted },
    ],
  };
}

function makeShapeDiagramExample(primary: string, secondary: string, bodyText: string): object {
  // Uses "shape" primitive with various prstGeom to build a SmartArt-like diagram
  return {
    layout: "scene",
    title: "시스템 아키텍처",
    background: "#FFFFFF",
    elements: [
      { type: "rect", x: 0, y: 0, w: 10, h: 5.625, fill: "#FFFFFF" },
      { type: "text", x: 0.35, y: 0.25, w: 9, h: 0.45, text: "시스템 아키텍처 — 3계층 구조", fontSize: 20, color: bodyText, bold: true },
      { type: "rect", x: 0.35, y: 0.82, w: 9.3, h: 0.02, fill: primary },
      // Layer 1 (top) — chevron row
      { type: "shape", shape: "chevron", x: 0.5, y: 1.2, w: 2.7, h: 0.6, style: { fill: primary }, text: "사용자 계층", fontSize: 14, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "shape", shape: "chevron", x: 3.5, y: 1.2, w: 2.7, h: 0.6, style: { fill: primary, opacity: 0.8 }, text: "파트너 계층", fontSize: 14, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "shape", shape: "chevron", x: 6.5, y: 1.2, w: 2.7, h: 0.6, style: { fill: primary, opacity: 0.6 }, text: "관리자 계층", fontSize: 14, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      // Layer 2 (middle) — service boxes with rounded corners
      { type: "shape", shape: "roundRect", x: 0.5, y: 2.2, w: 2.7, h: 1.3, style: { fill: "#F0F4FA", border: { color: secondary, pt: 1.5 } }, text: "API Gateway\n\n인증 · 라우팅 · 로드밸런싱", fontSize: 11, color: bodyText, align: "center", valign: "middle" },
      { type: "shape", shape: "roundRect", x: 3.5, y: 2.2, w: 2.7, h: 1.3, style: { fill: "#F0F4FA", border: { color: secondary, pt: 1.5 } }, text: "Business Logic\n\n주문 · 결제 · 회원", fontSize: 11, color: bodyText, align: "center", valign: "middle" },
      { type: "shape", shape: "roundRect", x: 6.5, y: 2.2, w: 2.7, h: 1.3, style: { fill: "#F0F4FA", border: { color: secondary, pt: 1.5 } }, text: "Integration\n\n외부 시스템 연계", fontSize: 11, color: bodyText, align: "center", valign: "middle" },
      // Arrows between layer 2 boxes
      { type: "line", x1: 3.2, y1: 2.85, x2: 3.5, y2: 2.85, color: secondary, thickness: 2, arrowHead: "triangle" },
      { type: "line", x1: 6.2, y1: 2.85, x2: 6.5, y2: 2.85, color: secondary, thickness: 2, arrowHead: "triangle" },
      // Layer 3 (bottom) — data stores as "can" shape
      { type: "shape", shape: "can", x: 1.2, y: 3.9, w: 1.5, h: 1.2, style: { fill: "#262626" }, text: "Primary\nDB", fontSize: 11, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "shape", shape: "can", x: 4.25, y: 3.9, w: 1.5, h: 1.2, style: { fill: "#4467AE" }, text: "Cache\nRedis", fontSize: 11, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "shape", shape: "can", x: 7.3, y: 3.9, w: 1.5, h: 1.2, style: { fill: "#2E7D32" }, text: "Analytics\nWarehouse", fontSize: 10, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      // Connectors from layer 2 to layer 3
      { type: "line", x1: 1.85, y1: 3.5, x2: 1.85, y2: 3.9, color: "#888888", thickness: 1, dashStyle: "dash" },
      { type: "line", x1: 4.85, y1: 3.5, x2: 4.85, y2: 3.9, color: "#888888", thickness: 1, dashStyle: "dash" },
      { type: "line", x1: 7.85, y1: 3.5, x2: 7.85, y2: 3.9, color: "#888888", thickness: 1, dashStyle: "dash" },
    ],
  };
}

function makeCompositeCoverExample(primary: string, secondary: string, surface: string, bodyText: string, muted: string): object {
  // Hana-report-style composite cover: left sidebar + multi-zone right panel
  return {
    layout: "scene",
    title: "경영지원그룹 전략 보고",
    background: "#FFFFFF",
    elements: [
      { type: "rect", x: 0, y: 0, w: 10, h: 5.625, fill: "#FFFFFF" },
      // Left dark sidebar
      { type: "rect", x: 0, y: 0, w: 3.15, h: 5.625, fill: "#262626" },
      { type: "rect", x: 3.09, y: 0, w: 0.06, h: 5.625, fill: secondary },
      // Sidebar content
      { type: "text", x: 0.25, y: 0.9, w: 2.7, h: 0.4, text: "그룹 CEO 업무보고", fontSize: 10, color: "#9E9E9E" },
      { type: "text", x: 0.25, y: 1.3, w: 2.7, h: 1.0, text: "관계사 협업\n활성화 방안", fontSize: 22, color: "#FFFFFF", bold: true, valign: "top" },
      { type: "rect", x: 0.25, y: 2.4, w: 1.9, h: 0.04, fill: secondary },
      { type: "text", x: 0.25, y: 2.55, w: 2.7, h: 0.4, text: "시너지 + 문화 + 인사의 삼위일체", fontSize: 9, color: "#DDDDDD" },
      { type: "text", x: 0.25, y: 4.3, w: 2.7, h: 0.3, text: "경영지원그룹장", fontSize: 9, color: "#9E9E9E" },
      { type: "text", x: 0.25, y: 4.6, w: 2.7, h: 0.4, text: "홍길동 전무", fontSize: 14, color: "#FFFFFF", bold: true },
      { type: "text", x: 0.25, y: 5.0, w: 2.7, h: 0.3, text: "2026. 04. 20", fontSize: 9, color: "#9E9E9E" },
      // Right panel — WHY section
      { type: "text", x: 3.4, y: 0.3, w: 6.4, h: 0.4, text: "WHY?", fontSize: 13, color: secondary, bold: true },
      { type: "rect", x: 3.4, y: 0.65, w: 6.2, h: 0.02, fill: "#DDDDDD" },
      { type: "rect", x: 3.4, y: 0.75, w: 3.0, h: 1.4, fill: "#E8EEF8" },
      { type: "text", x: 3.5, y: 0.85, w: 2.8, h: 0.35, text: "매년 아젠다", fontSize: 10, color: muted },
      { type: "text", x: 3.5, y: 1.25, w: 2.8, h: 0.35, text: "→ 그룹 콜라보 활성화", fontSize: 11, color: "#1E4D9B", bold: true },
      { type: "text", x: 3.5, y: 1.6, w: 2.8, h: 0.35, text: "→ 관계사 협업 확대", fontSize: 11, color: "#1E4D9B", bold: true },
      { type: "rect", x: 6.6, y: 0.75, w: 3.0, h: 1.4, fill: "#FDEDED" },
      { type: "text", x: 6.7, y: 0.85, w: 2.8, h: 0.3, text: "그러나 현실은", fontSize: 10, color: "#666666", bold: true },
      { type: "text", x: 6.7, y: 1.2, w: 2.8, h: 0.3, text: "✗ 관계사 상품 이해 無", fontSize: 10, color: "#C03030" },
      { type: "text", x: 6.7, y: 1.5, w: 2.8, h: 0.3, text: "✗ 실적 체크의 반복", fontSize: 10, color: "#C03030" },
      { type: "text", x: 6.7, y: 1.8, w: 2.8, h: 0.3, text: "✗ 동기부여 부족", fontSize: 10, color: "#C03030" },
      // Data strip
      { type: "rect", x: 3.4, y: 2.3, w: 6.2, h: 0.55, fill: "#262626" },
      { type: "text", x: 3.5, y: 2.35, w: 2.0, h: 0.25, text: "경쟁사 비은행 기여도", fontSize: 8, color: "#9E9E9E" },
      { type: "text", x: 3.5, y: 2.55, w: 6.0, h: 0.3, text: "38%    29%    12%", fontSize: 13, color: "#FFFFFF", bold: true, align: "center" },
      // HOW section
      { type: "text", x: 3.4, y: 3.0, w: 6.4, h: 0.4, text: "HOW? — 삼위일체", fontSize: 13, color: secondary, bold: true },
      { type: "rect", x: 3.4, y: 3.4, w: 6.2, h: 0.02, fill: "#DDDDDD" },
      { type: "rect", x: 3.4, y: 3.5, w: 2.0, h: 0.38, fill: "#1E4D9B" },
      { type: "text", x: 3.4, y: 3.5, w: 2.0, h: 0.38, text: "시너지", fontSize: 11, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "rect", x: 3.4, y: 3.88, w: 2.0, h: 1.5, fill: surface },
      { type: "text", x: 3.5, y: 3.98, w: 1.85, h: 1.3, text: "• 콜라보북 제작\n• 협업 마케팅\n• 주간 점검", fontSize: 9, color: bodyText, valign: "top" },
      { type: "rect", x: 5.5, y: 3.5, w: 2.0, h: 0.38, fill: secondary },
      { type: "text", x: 5.5, y: 3.5, w: 2.0, h: 0.38, text: "기업문화", fontSize: 11, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "rect", x: 5.5, y: 3.88, w: 2.0, h: 1.5, fill: surface },
      { type: "text", x: 5.6, y: 3.98, w: 1.85, h: 1.3, text: "• 칭찬 웨이브\n• 현장 격려\n• 본업 캠페인", fontSize: 9, color: bodyText, valign: "top" },
      { type: "rect", x: 7.6, y: 3.5, w: 2.0, h: 0.38, fill: "#2E7D32" },
      { type: "text", x: 7.6, y: 3.5, w: 2.0, h: 0.38, text: "인사", fontSize: 11, color: "#FFFFFF", bold: true, align: "center", valign: "middle" },
      { type: "rect", x: 7.6, y: 3.88, w: 2.0, h: 1.5, fill: surface },
      { type: "text", x: 7.7, y: 3.98, w: 1.85, h: 1.3, text: "• 인사 가점\n• 연수 우선배정\n• 분기 표창", fontSize: 9, color: bodyText, valign: "top" },
    ],
  };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildFreeformSystemPrompt(themeId: ThemeId): string {
  const theme = PPT_THEMES[themeId] ?? PPT_THEMES.professional;
  const c = theme.colors;
  const primary = `#${c.primary}`;
  const secondary = `#${c.secondary}`;
  const bg = `#${c.background}`;
  const surface = `#${c.surface}`;
  const bodyText = `#${c.bodyText}`;
  const muted = `#${c.mutedText}`;

  const example1 = JSON.stringify(makeTitleExample(primary, secondary));
  const example2 = JSON.stringify(makeStatsExample(primary, secondary, surface, bodyText, muted));
  const example3 = JSON.stringify(makeContentExample(primary, secondary, surface, bodyText));
  const example4 = JSON.stringify(makeAgendaExample(primary, secondary, surface, bodyText, muted));
  const example5 = JSON.stringify(makeProcessExample(primary, secondary, bodyText, muted));
  const example6 = JSON.stringify(makeComparisonExample(primary, secondary, surface, bodyText, muted));
  const example7 = JSON.stringify(makeCompositeCoverExample(primary, secondary, surface, bodyText, muted));
  const example8 = JSON.stringify(makeTableExample(primary, secondary, surface, bodyText, muted));
  const example9 = JSON.stringify(makeChartExample(primary, secondary, bodyText, muted));
  const example10 = JSON.stringify(makeShapeDiagramExample(primary, secondary, bodyText));

  return `당신은 세계 최고 수준의 프레젠테이션 디자이너입니다.
각 슬라이드를 "scene" 형식의 드로잉 프리미티브 JSON으로 설계합니다.

=== 캔버스 규격 (절대 준수) ===
- 크기: 가로 10.0인치 × 세로 5.625인치 (16:9 와이드)
- 원점: 좌상단 (0, 0). x는 오른쪽, y는 아래 방향
- 단위: 인치 (소수점 사용 가능)
- ⚠️ 모든 요소의 x+w는 10.0을 넘지 말고, y+h는 5.625를 넘지 마세요 (배경 ellipse만 경계 밖으로 걸쳐도 됨)
- ⚠️ 텍스트 박스가 겹치지 않도록 배치. 이전 요소의 하단(y+h)보다 아래로 다음 요소 배치
- ⚠️ fontSize가 h보다 클 수 없음. 텍스트 높이 h = (fontSize/72)×1.4 이상으로 여유 확보

=== 테마 색상 ===
- Primary:   ${primary}  (타이틀바, 주요 배경, 핵심 강조)
- Secondary: ${secondary}  (액센트, 구분선, 아이콘)
- Background: ${bg}  (슬라이드 배경)
- Surface:   ${surface}  (카드 배경)
- BodyText:  ${bodyText}  (본문 텍스트)
- Muted:     ${muted}  (보조 텍스트)

=== 프리미티브 타입 (Tier 1 — 기본) ===
{"type":"rect","x":N,"y":N,"w":N,"h":N,"fill":"#HEX","opacity":0.0-1.0,"radius":0-0.5,"border":{"color":"#HEX","pt":1},"shadow":true}
{"type":"ellipse","x":N,"y":N,"w":N,"h":N,"fill":"#HEX","opacity":0.0-1.0,"border":{"color":"#HEX","pt":1}}
{"type":"line","x1":N,"y1":N,"x2":N,"y2":N,"color":"#HEX","thickness":1-8,"dashStyle":"solid|dash|dot","arrowHead":"none|triangle|arrow"}
{"type":"text","x":N,"y":N,"w":N,"h":N,"text":"...","fontSize":8-72,"color":"#HEX","bold":true,"align":"left|center|right","valign":"top|middle|bottom","underline":true,"fill":"#HEX"}
{"type":"icon","name":"mdi:icon-name","x":N,"y":N,"w":N,"h":N,"color":"#HEX"}

=== 프리미티브 타입 (Tier 2 — 고급, 적극 활용 권장) ===
// 다양한 preset shape (roundRect/diamond/triangle/chevron/rightArrow/callout1/can/cube/parallelogram/trapezoid/star5/flowChartProcess/flowChartDecision 등 180+ 종)
{"type":"shape","shape":"roundRect","x":N,"y":N,"w":N,"h":N,"style":{"fill":"#HEX","border":{"color":"#HEX","pt":1},"shadow":true},"text":"...","fontSize":14,"color":"#HEX","bold":true,"align":"center","valign":"middle","rotate":0}

// 데이터 테이블 — 컨설팅 덱 스타일 (행/열, 셀별 색상/정렬)
{"type":"table","x":N,"y":N,"w":N,"h":N,"colW":[2,2,2],"border":{"color":"#HEX","pt":0.5},"defaultFontSize":11,"cells":[
  [ {"text":"헤더1","fill":"#HEX","color":"#FFFFFF","bold":true,"align":"center"}, ... ],
  [ {"text":"셀","align":"right","bold":true}, ... ]
]}

// 네이티브 차트 (편집 가능한 실제 PowerPoint 차트)
{"type":"chart","chartType":"bar|pie|line|doughnut|area","x":N,"y":N,"w":N,"h":N,"series":[
  {"name":"매출","labels":["1Q","2Q","3Q"],"values":[100,150,200]}
],"title":"...","showLegend":true,"showValue":true,"colors":["#HEX","#HEX"],"barDir":"col|bar"}

// 리치 텍스트 (한 박스 안에 여러 스타일 런)
{"type":"richText","x":N,"y":N,"w":N,"h":N,"runs":[
  {"text":"강조","bold":true,"color":"#EF3535","fontSize":18},
  {"text":" 일반 텍스트","fontSize":12,"color":"#262626"}
],"align":"left","valign":"middle"}

=== 필수 디자인 규칙 ===
1. 모든 슬라이드는 캔버스 전체를 덮는 배경 rect로 시작 (x:0,y:0,w:10,h:5.625)
2. 콘텐츠 슬라이드(내용/목차/통계 등): 상단 타이틀바 rect (x:0,y:0,w:10,h:0.75, fill:primary)
3. 전체 배경 슬라이드(표지/섹션/마무리): 반투명 대형 원 2개 이상 (슬라이드 경계 바깥으로 걸침)
   - 대형 원: w/h 4-6인치, opacity 0.10-0.14, 우상단 또는 좌하단 바깥으로
4. 좌측 액센트 바: 표지/섹션/마무리에서 secondary 색상 얇은 rect (w:0.12-0.16)
5. 타이포 계층: 타이틀(20-28pt 흰색) → 소제목(14-18pt) → 본문(11-14pt) → 캡션(9-11pt)
6. 카드 행: 아이콘(mdi:) + 배경 rect + 좌측 accent bar + 텍스트 조합으로 bullets 대신 사용
7. 워터마크 원: 슬라이드 우하단에 large ellipse (primary, opacity 0.04-0.06)
8. 최소 요소 수: 슬라이드당 10개 이상. 많을수록 정보밀도 높음
9. 여백: 좌우 최소 0.3인치 margin. 상단 타이틀바(0.75인치) 아래부터 콘텐츠 시작
10. icon 이름은 반드시 "mdi:" prefix로 시작 (예: mdi:rocket-launch, mdi:chart-bar)
11. ⚠️ 중복 방지: 같은 타이틀바/워터마크 패턴을 기계적으로 반복하지 말고 슬라이드 목적에 맞게 변주
12. 다채색 활용: 3개 이상 카드/단계 → 색을 교차(primary, secondary, #1E4D9B navy, #2E7D32 green 등)
13. 숫자 강조: 수치(%, 금액, 증감률)는 displayLarge(36-52pt)로 카드 중앙에 크게

=== 응답 형식 ===
순수 JSON 배열만 반환하세요 (마크다운 코드블록 금지):
[
  { "layout": "scene", "title": "슬라이드 제목", "background": "#HEX", "elements": [...] },
  ...
]

=== 고급 레이아웃 가이드 ===
데이터/수치가 3개 이상이면 무조건 **table** 또는 **chart** 프리미티브 사용 (text로 숫자 나열 금지)
다이어그램/프로세스/계층구조는 **shape**로 chevron/roundRect/can/cube 등 적극 사용
제목 중 강조어·수치·영문 약어는 **richText**로 색/크기 차별화 권장
카드 내부에 옅은 gradient가 필요하면 fill: { type: "gradient", colors: ["#HEX1","#HEX2"], angle: 90 }

=== 디자인 예시 10종 ===

예시1 (표지 슬라이드):
${example1}

예시2 (KPI 통계 슬라이드):
${example2}

예시3 (아이콘 카드 내용 슬라이드):
${example3}

예시4 (목차 agenda):
${example4}

예시5 (프로세스 4단계):
${example5}

예시6 (비교 AS-IS/TO-BE):
${example6}

예시7 (복합형 대시보드 표지 — 좌측 사이드바 + 우측 다중 블록):
${example7}

예시8 (데이터 테이블 — Lotte/컨설팅 덱 스타일, table 프리미티브):
${example8}

예시9 (네이티브 차트 + Key Insight 패널):
${example9}

예시10 (SmartArt풍 시스템 아키텍처 다이어그램 — shape 프리미티브로 chevron/roundRect/can):
${example10}`;
}

// ─── Response parser ──────────────────────────────────────────────────────────

export function parseFreeformResponse(
  raw: string,
  themeId: ThemeId,
  originalSlideCount?: number
): SceneSlide[] {
  const theme = PPT_THEMES[themeId] ?? PPT_THEMES.professional;
  const c = theme.colors;

  // Strip markdown fences
  const cleaned = raw
    .replace(/^```[\w]*\n?/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    try {
      parsed = JSON.parse(`[${cleaned}]`);
    } catch {
      return [];
    }
  }

  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown>).slides
      ? ((parsed as Record<string, unknown>).slides as unknown[])
      : [];

  const scenes: SceneSlide[] = [];
  for (const raw of arr) {
    const result = validateAndSanitizeScene(raw);
    if (result.valid && result.scene) {
      scenes.push(result.scene);
    }
  }

  // If we got too few scenes, pad with fallback content slides
  if (originalSlideCount !== undefined && scenes.length < originalSlideCount) {
    while (scenes.length < originalSlideCount) {
      scenes.push({
        layout: "scene",
        title: `슬라이드 ${scenes.length + 1}`,
        background: `#${c.background}`,
        elements: [
          { type: "rect", x: 0, y: 0, w: 10, h: 5.625, fill: `#${c.background}` },
          { type: "rect", x: 0, y: 0, w: 10, h: 0.75, fill: `#${c.primary}` },
          { type: "rect", x: 0, y: 0, w: 0.07, h: 0.75, fill: `#${c.secondary}` },
          { type: "text", x: 0.25, y: 0, w: 9, h: 0.75, text: `슬라이드 ${scenes.length + 1}`, fontSize: 22, color: "#FFFFFF", bold: true, valign: "middle" },
        ],
      });
    }
  }

  return scenes;
}

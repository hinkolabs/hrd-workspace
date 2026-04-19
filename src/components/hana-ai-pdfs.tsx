"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

// ── Font registration ──────────────────────────────────────────────────────────
Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: "/fonts/NotoSansKR-Regular.ttf", fontWeight: 400, fontStyle: "normal" },
    { src: "/fonts/NotoSansKR-Regular.ttf", fontWeight: 400, fontStyle: "italic" },
    { src: "/fonts/NotoSansKR-Bold.ttf",    fontWeight: 700, fontStyle: "normal" },
    { src: "/fonts/NotoSansKR-Bold.ttf",    fontWeight: 700, fontStyle: "italic" },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

// ── Shared palette ─────────────────────────────────────────────────────────────
const WHITE    = "#FFFFFF";
const GRAY_50  = "#F9FAFB";
const GRAY_200 = "#E5E7EB";
const GRAY_400 = "#9CA3AF";
const GRAY_500 = "#6B7280";
const GRAY_700 = "#374151";
const GRAY_900 = "#111827";
const RED_600  = "#DC2626";
const RED_50   = "#FEF2F2";

// A – green (실장님 보고용)   B – indigo (PPT)   C – slate (대본)
const A_MAIN = "#059669"; const A_LIGHT = "#ECFDF5"; const A_TEXT = "#065F46";
const B_MAIN = "#4F46E5"; const B_LIGHT = "#EEF2FF"; const B_TEXT = "#312E81";
const C_MAIN = "#374151"; const C_LIGHT = "#F3F4F6"; const C_TEXT = "#111827";

// ── Shared style factory ───────────────────────────────────────────────────────
function makeStyles(accent: string, accentLight: string, accentText: string) {
  return StyleSheet.create({
    page: {
      fontFamily: "NotoSansKR",
      backgroundColor: WHITE,
      paddingTop: 30,
      paddingBottom: 44,
      paddingHorizontal: 40,
      fontSize: 8,
      color: GRAY_700,
      lineHeight: 1.6,
    },
    // Slim cover header (no badge row)
    headerSlim: {
      backgroundColor: accent,
      borderRadius: 7,
      paddingVertical: 11,
      paddingHorizontal: 18,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerSlimLeft: { flex: 1 },
    headerOrg: { fontSize: 7.5, color: WHITE, opacity: 0.8, marginBottom: 2 },
    headerTitle: { fontSize: 15, fontWeight: 700, color: WHITE, lineHeight: 1.25 },
    headerSub: { fontSize: 7.5, color: WHITE, opacity: 0.85, marginTop: 3 },
    headerRight: { alignItems: "flex-end", gap: 3 },
    headerRightBadge: {
      backgroundColor: "rgba(255,255,255,0.18)",
      borderRadius: 12,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      fontSize: 7,
      color: WHITE,
    },
    // Full header (for B, C cover pages)
    headerBlock: {
      backgroundColor: accent,
      borderRadius: 8,
      paddingVertical: 20,
      paddingHorizontal: 22,
      marginBottom: 14,
    },
    headerBadge: { fontSize: 7.5, color: WHITE, opacity: 0.8, marginBottom: 3 },
    headerTitleLg: { fontSize: 17, fontWeight: 700, color: WHITE, lineHeight: 1.3, marginBottom: 5 },
    headerSubLg: { fontSize: 8.5, color: WHITE, opacity: 0.85 },
    badgeRow: { flexDirection: "row", gap: 6, marginTop: 10 },
    badge: {
      backgroundColor: "rgba(255,255,255,0.18)",
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 7.5,
      color: WHITE,
    },
    // Section title
    sectionTitle: {
      fontSize: 9.5,
      fontWeight: 700,
      color: accent,
      borderBottomWidth: 1,
      borderBottomColor: accent,
      paddingBottom: 2.5,
      marginBottom: 7,
      marginTop: 10,
    },
    // Table
    tableHeaderRow: {
      flexDirection: "row",
      backgroundColor: accent,
      borderRadius: 4,
      marginBottom: 1,
    },
    tableHeader: {
      color: WHITE,
      fontSize: 7.5,
      fontWeight: 700,
      paddingVertical: 4.5,
      paddingHorizontal: 6,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: GRAY_200,
      paddingVertical: 3.5,
      paddingHorizontal: 6,
    },
    tableRowAlt: { backgroundColor: GRAY_50 },
    tableCell: { fontSize: 7.5, color: GRAY_700 },
    tableCellBold: { fontSize: 7.5, color: GRAY_900, fontWeight: 700 },
    tableCellAccent: { fontSize: 7.5, color: accent, fontWeight: 700 },
    // Info grid (2-col key/value)
    infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
    infoCell: {
      width: "48%",
      backgroundColor: GRAY_50,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: GRAY_200,
      padding: 6,
    },
    infoCellLabel: { fontSize: 6.5, color: GRAY_500, fontWeight: 700, marginBottom: 1.5 },
    infoCellValue: { fontSize: 7.5, color: GRAY_900 },
    // Bullet
    bulletRow: { flexDirection: "row", gap: 4, marginBottom: 2 },
    bulletDot: { fontSize: 7.5, color: accent, marginTop: 1 },
    bulletText: { fontSize: 8, color: GRAY_700, flex: 1 },
    // Highlight box
    hlBox: {
      backgroundColor: accentLight,
      borderLeftWidth: 3,
      borderLeftColor: accent,
      borderRadius: 3,
      paddingVertical: 5,
      paddingHorizontal: 8,
      marginVertical: 4,
    },
    hlLabel: { fontSize: 7, color: accent, fontWeight: 700, marginBottom: 1.5 },
    hlText: { fontSize: 7.5, color: accentText },
    // Card (for B slides / C Q&A)
    card: {
      borderWidth: 1,
      borderColor: GRAY_200,
      borderRadius: 6,
      marginBottom: 8,
      overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: accentLight,
      paddingVertical: 6,
      paddingHorizontal: 9,
      gap: 7,
    },
    cardBadge: {
      backgroundColor: accent,
      borderRadius: 9,
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 7,
      color: WHITE,
      fontWeight: 700,
    },
    cardTitle: { fontSize: 8.5, fontWeight: 700, color: accentText, flex: 1 },
    cardBody: { paddingVertical: 7, paddingHorizontal: 9 },
    // 4-col strategy badge row
    strategyRow: { flexDirection: "row", gap: 4, marginBottom: 7 },
    strategyCell: {
      flex: 1,
      backgroundColor: accentLight,
      borderRadius: 5,
      borderTopWidth: 2,
      borderTopColor: accent,
      paddingVertical: 5,
      paddingHorizontal: 6,
    },
    strategyCellHighlight: {
      flex: 1,
      backgroundColor: accent,
      borderRadius: 5,
      paddingVertical: 5,
      paddingHorizontal: 6,
    },
    strategyNum: { fontSize: 6.5, color: GRAY_500, fontWeight: 700, marginBottom: 1.5 },
    strategyNumLight: { fontSize: 6.5, color: WHITE, opacity: 0.75, fontWeight: 700, marginBottom: 1.5 },
    strategyLabel: { fontSize: 7.5, color: GRAY_900, fontWeight: 700 },
    strategyLabelLight: { fontSize: 7.5, color: WHITE, fontWeight: 700 },
    strategySub: { fontSize: 6.5, color: GRAY_500, marginTop: 2 },
    strategySubLight: { fontSize: 6.5, color: WHITE, opacity: 0.85, marginTop: 2 },
    // Footer
    footer: {
      position: "absolute",
      bottom: 16,
      left: 40,
      right: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: GRAY_200,
      paddingTop: 4,
    },
    footerText: { fontSize: 6.5, color: GRAY_400 },
  });
}

// ── Reusable primitives ────────────────────────────────────────────────────────
type StyleSet = ReturnType<typeof makeStyles>;

function Bullet({ text, s }: { text: string; s: StyleSet }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

function Footer({ label, page, s }: { label: string; page: number; s: StyleSet }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{label}</Text>
      <Text style={s.footerText}>{page}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT A — 실장님 보고용 1페이지 기획서
// ═══════════════════════════════════════════════════════════════════════════════

function DocA() {
  const s = makeStyles(A_MAIN, A_LIGHT, A_TEXT);
  return (
    <Document title="[A] 신입사원 AI 리터러시 교육 기획서" author="하나증권 인재개발">
      <Page size="A4" style={s.page}>

        {/* ── 슬림 헤더 ── */}
        <View style={s.headerSlim}>
          <View style={s.headerSlimLeft}>
            <Text style={s.headerOrg}>하나증권 인재개발 | 2026년</Text>
            <Text style={s.headerTitle}>신입사원 AI 리터러시 교육 기획서</Text>
            <Text style={s.headerSub}>ChatGPT·Claude·Gemini 무료 AI 실전 활용 — 증권사 안전 사용법 중심</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerRightBadge}>5시간 · 5교시</Text>
            <Text style={s.headerRightBadge}>신입사원 전원</Text>
            <Text style={s.headerRightBadge}>내부 강사 1인</Text>
          </View>
        </View>

        {/* ── BLOCK 1: 왜 지금인가 (경쟁사 현황) ── */}
        <Text style={s.sectionTitle}>① 왜 지금인가 — 경쟁사 AI 도입 현황 (2025~2026)</Text>
        <View style={{ marginBottom: 6 }}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeader, { width: "22%" }]}>증권사</Text>
            <Text style={[s.tableHeader, { flex: 1 }]}>사내 AI 도입 현황</Text>
            <Text style={[s.tableHeader, { width: "22%" }]}>단계</Text>
          </View>
          {[
            ["KB증권",     "AI디지털본부 신설 · M365 Copilot 전사 도입 · AI 혁신서비스 지정 업계 최다 7건",         "사내 플랫폼 운영 중"],
            ["미래에셋",   "하이퍼클로바X 대시 sLLM 자체 구축 · AI Assistant 전사 업무 플랫폼 · 로보어드바이저 1위", "사내 플랫폼 운영 중"],
            ["NH투자",     "AI 전담조직 20명 · 차트분석 AI '차분이'(금융권 최초 이미지 인식) · GPT 뉴스레터",         "전담조직 운영 중"],
            ["신한투자",   "AI솔루션부 신설 · '챗프로' 사내 반복업무 자동화·보고서 생성·번역 운영 중",                "사내 도구 운영 중"],
            ["IBK투자",    "금융특화 sLLM 'OLA-F' 내재화 · 생성형 AI 실무 교육 2회 운영 (2024)",                      "내재화 진행 중"],
            ["하나증권",   "공포탐욕시그널 (자체 AI 모델, 업계 최초 종목별 심리지수) · 사내 AI 플랫폼 구축 추진 중",  "도입 추진 중"],
          ].map(([co, desc, stage], i) => (
            <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {},
              co === "하나증권" ? { backgroundColor: A_LIGHT, borderLeftWidth: 2, borderLeftColor: A_MAIN } : {}]}>
              <Text style={[s.tableCellBold, { width: "22%" }]}>{co}</Text>
              <Text style={[s.tableCell, { flex: 1 }]}>{desc}</Text>
              <Text style={[s.tableCell, { width: "22%", color: co === "하나증권" ? A_MAIN : GRAY_500 }]}>{stage}</Text>
            </View>
          ))}
        </View>
        <View style={[s.hlBox, { marginBottom: 6 }]}>
          <Text style={s.hlText}>
            경쟁사는 이미 사내 AI 플랫폼 단계. 하나증권도 2026 핵심전략으로 AI 중심 재설계를 천명.
            사내 플랫폼 오픈 전까지, 신입사원이 무료 공용 AI를 안전하게 쓸 역량을 선제 확보하는 것이 본 교육의 목적.
          </Text>
        </View>

        {/* ── BLOCK 2: 하나증권 2026 4대 전략 ── */}
        <Text style={s.sectionTitle}>② 하나증권 2026 4대 핵심전략 (강성묵 대표 신년사)</Text>
        <View style={s.strategyRow}>
          <View style={s.strategyCell}>
            <Text style={s.strategyNum}>전략 1</Text>
            <Text style={s.strategyLabel}>발행어음 기반{"\n"}생산적 금융</Text>
            <Text style={s.strategySub}>모험자본 공급 확대</Text>
          </View>
          <View style={s.strategyCell}>
            <Text style={s.strategyNum}>전략 2</Text>
            <Text style={s.strategyLabel}>디지털자산{"\n"}전환</Text>
            <Text style={s.strategySub}>STO 토큰증권 추진</Text>
          </View>
          <View style={s.strategyCellHighlight}>
            <Text style={s.strategyNumLight}>전략 3 ★</Text>
            <Text style={s.strategyLabelLight}>AI 중심{"\n"}사업·업무 재설계</Text>
            <Text style={s.strategySubLight}>의사결정·실행 고도화</Text>
          </View>
          <View style={s.strategyCell}>
            <Text style={s.strategyNum}>전략 4</Text>
            <Text style={s.strategyLabel}>부문별 혁신</Text>
            <Text style={s.strategySub}>WM 초개인화 / IB ONE / S&T 아시아</Text>
          </View>
        </View>
        <View style={[s.hlBox, { marginBottom: 6 }]}>
          <Text style={s.hlLabel}>본 교육 연계 포인트</Text>
          <Text style={s.hlText}>
            "전략 3(AI 중심 재설계)"은 임원급 선언. 신입사원이 AI를 쓸 줄 알아야 전략이 현장에서 실행된다.
            함영주 회장: "다음 승부는 스테이블코인과 AI". 하나증권 자체 AI 모델 공포탐욕시그널은 업계 최초 종목별 심리지수.
          </Text>
        </View>

        {/* ── BLOCK 3: 커리큘럼 (활용 사례 중심) ── */}
        <Text style={s.sectionTitle}>③ 5교시 커리큘럼 — 이론 20% · 활용 사례·실습 80%</Text>
        <View style={{ marginBottom: 6 }}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeader, { width: "18%" }]}>교시</Text>
            <Text style={[s.tableHeader, { width: "28%" }]}>주제</Text>
            <Text style={[s.tableHeader, { flex: 1 }]}>핵심 내용 (사례·시연·실습 중심)</Text>
          </View>
          {[
            ["1교시 50분", "AI 왜 써야 하나", "경쟁사 AI 격차 → 하나증권 4대전략 → 공포탐욕시그널 시연 → Before/After 시간 비교 → 3색 신호등"],
            ["2교시 50분", "3대 레드라인 + 퀴즈", "MNPI·고객정보·발간 전 자료 실사고 사례 → 30초 결정 트리 → 케이스 퀴즈 15문항 → 검증 3단계"],
            ["3교시 50분", "무료 AI 3종 실전 시연", "ChatGPT·Claude·Gemini 무료 한도·강점 비교 → 동일 프롬프트 3종 라이브 비교 시연 → 업무별 도구 매트릭스"],
            ["4교시 50분", "부서별 활용 플레이북", "WM·IB·S&T·리서치·리테일·백오피스 × 실무 시나리오 + 권장 AI 도구 → 소그룹 토론·발표"],
            ["5교시 50분", "핸즈온 + 마무리", "부서별 과제 실습 (공개 데이터만) → 조별 베스트 프롬프트 발표 → 3대 행동수칙 → Q&A"],
          ].map(([t, s2, k], i) => (
            <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.tableCellBold, { width: "18%" }]}>{t}</Text>
              <Text style={[s.tableCellBold, { width: "28%", color: A_MAIN }]}>{s2}</Text>
              <Text style={[s.tableCell, { flex: 1 }]}>{k}</Text>
            </View>
          ))}
        </View>

        {/* ── BLOCK 4: 기대 성과 + 문의 ── */}
        <Text style={s.sectionTitle}>④ 기대 성과 지표 및 문의</Text>
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 4 }}>
          {[
            ["3대 레드라인\n퀴즈 정답률", "≥ 90%", "교육 당일"],
            ["30일 내\n현업 AI 시도율", "≥ 70%", "교육 후 30일"],
            ["컴플라이언스\n위반 건수", "0건", "교육 후 90일"],
            ["업무 효율\n체감 향상율", "≥ 60%", "교육 후 90일"],
          ].map(([label, val, when]) => (
            <View key={label} style={{ flex: 1, backgroundColor: GRAY_50, borderRadius: 5, borderWidth: 1, borderColor: GRAY_200, padding: 5 }}>
              <Text style={{ fontSize: 6.5, color: GRAY_500, marginBottom: 2 }}>{label}</Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: A_MAIN, marginBottom: 1 }}>{val}</Text>
              <Text style={{ fontSize: 6, color: GRAY_400 }}>{when}</Text>
            </View>
          ))}
        </View>
        <View style={[s.hlBox, { paddingVertical: 4 }]}>
          <Text style={s.hlText}>
            교육 후 30일·90일 팔로업 설문 (5문항) · 심화 워크숍 (배치 3개월 후) · 사내 AI 정책 문서화 병행 추진{"\n"}
            담당: 인재개발실 (연락처 기입)
          </Text>
        </View>

        <Footer label="하나증권 인재개발 · 신입사원 AI 리터러시 교육 기획서 (1/1)" page={1} s={s} />
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT B — PPT 제작용 슬라이드 구성안 (30장, 활용사례 중심)
// ═══════════════════════════════════════════════════════════════════════════════

function DocB() {
  const s = makeStyles(B_MAIN, B_LIGHT, B_TEXT);

  const slides: Array<{ id: string; section: string; title: string; bullets: string[]; tip?: string }> = [
    // ── 1교시: AI 왜 써야 하나 (사례 중심 도입)
    { id: "S-01", section: "표지", title: "증권사에서 안전하게 AI를 일에 끼워넣는 법",
      bullets: ["하나증권 신입사원 AI 리터러시 교육 | 2026", "ChatGPT · Claude · Gemini 무료 AI 실전 활용"],
      tip: "하나증권 브랜드 컬러 적용. 부제 강조." },
    { id: "S-02", section: "오리엔테이션", title: "오늘의 여정 — 5교시 타임라인",
      bullets: ["1교시: AI 왜 써야 하나 — 경쟁사·하나증권 전략 + Before/After",
        "2교시: 3대 레드라인 + 케이스 퀴즈 15문항",
        "3교시: ChatGPT·Claude·Gemini 무료 3종 라이브 비교 시연",
        "4교시: 부서별 활용 플레이북 (WM·IB·S&T·리서치·리테일·백오피스)",
        "5교시: 핸즈온 실습 + 조별 발표 + Q&A"],
      tip: "수평 타임라인 5단계, 현재 교시 강조. 이론 20% · 실전 80% 비율 표기." },
    { id: "S-03", section: "1교시", title: "경쟁사는 지금 어디까지 왔나",
      bullets: ["KB증권: M365 Copilot 전사 도입 · AI 혁신서비스 지정 업계 최다 7건",
        "미래에셋: 자체 sLLM 'AI Assistant 플랫폼' 전사 운영 · 로보어드바이저 1위",
        "NH투자: AI 전담조직 20명 · 차트분석 AI '차분이' (금융권 최초 이미지 인식)",
        "신한투자: AI솔루션부 신설 · '챗프로' 사내 업무 자동화 운영 중",
        "IBK투자: 금융특화 sLLM 'OLA-F' 내재화 · 직원 AI 실무 교육 2회 완료"],
      tip: "카드 5개 좌→우 배치. 각 증권사 로고 또는 색상 구분." },
    { id: "S-04", section: "1교시", title: "하나증권 2026년 4대 핵심전략",
      bullets: ["전략 1: 발행어음 기반 생산적 금융 확대 (모험자본)",
        "전략 2: 디지털자산(STO) 전환",
        "전략 3 ★: AI 중심 사업·업무 재설계 — 의사결정·실행 고도화",
        "전략 4: 부문별 혁신 — WM 초개인화 · IB ONE IB · S&T 아시아 진출",
        "함영주 회장: '다음 승부는 스테이블코인과 AI'"],
      tip: "전략 3을 하나증권 그린 계열로 강조. 4분할 카드 레이아웃." },
    { id: "S-05", section: "1교시", title: "하나증권 AI 실전 사례: 공포탐욕시그널",
      bullets: ["업계 최초 자체 AI 모델 기반 종목별 심리지수 (2025년 9월 출시)",
        "퀀트 알고리즘 + AI 모델: 가격변동성·모멘텀·52주 이격도·거래강도 6개 변수",
        "5단계 분류: 매우공포→공포→관망→탐욕→매우탐욕 / 0~100점 수치화",
        "공포 구간 매수 후 탐욕 구간 매도 시 평균 수익률 약 7% (내부 테스트)",
        "→ 하나증권이 AI를 '서비스'로 만들어냈다. 다음은 '업무 전반'"],
      tip: "스마트폰 MTS 화면 목업 또는 그래프 이미지 삽입 권장." },
    { id: "S-06", section: "1교시", title: "그래서 신입사원인 우리는?",
      bullets: ["경쟁사: 사내 AI 플랫폼 구축 완료 → 직원이 사내 도구로 쓰는 단계",
        "하나증권: 사내 플랫폼 구축 추진 중 → 지금 당장은 무료 공용 AI가 현실적 선택",
        "무료 ChatGPT·Claude·Gemini로 공개 정보 업무를 먼저 익혀두면",
        "→ 사내 플랫폼 오픈 시 누구보다 빠르게 적응 가능",
        "→ 단, 안전하게 쓰는 법부터 배워야 한다"],
      tip: "두 갈래 경로 화살표: 경쟁사(플랫폼) vs 하나증권(현재) → 합류점." },
    { id: "S-07", section: "1교시", title: "같은 업무, 다른 시간 (Before vs After)",
      bullets: ["일일 시황 요약: 60분 → 12분 (ChatGPT + DART 공시)",
        "영문 리포트 번역·요약: 90분 → 18분 (Claude 200K 컨텍스트)",
        "고객 안내 메일 초안: 30분 → 7분 (ChatGPT 구어체 초안)",
        "엑셀 함수·VBA 문제: 45분 → 5분 (Gemini/ChatGPT 코드 생성)",
        "→ 하루 평균 2~3시간 회수. 연간 500~700시간 절감"],
      tip: "Before 컬럼 회색·숫자 크게, After 컬럼 초록·숫자 크게. 비교 효과 극대화." },
    { id: "S-08", section: "1교시", title: "3색 신호등 — 오늘의 판단 기준",
      bullets: ["🔴 빨강 — 절대 금지: 어떤 AI에도 입력 불가. 위반 시 징계 + 법적 책임",
        "🟡 노랑 — 사내 승인 도구로만: 사내 AI 플랫폼 오픈 시 해당 도구 사용",
        "🟢 초록 — 무료 공용 AI 사용 가능: 결과물 검증 3단계 필수",
        "→ 이 신호등이 오늘 교육 전체의 판단 기준입니다"],
      tip: "실제 신호등 이미지 or 3색 원형 아이콘. 핵심 메시지는 크게." },

    // ── 2교시: 3대 레드라인 + 퀴즈
    { id: "S-09", section: "2교시", title: "이미 사고가 났습니다",
      bullets: ["삼성전자 직원, ChatGPT에 소스코드 붙여넣기 → OpenAI 서버 전송 → 전사 AI 금지",
        "미국 로펌 변호사, AI가 만든 허위 판례 그대로 법원 제출 → 법원 제재·징계",
        "국내 금융사 직원, 고객 거래내역 AI에 입력 → 정보보호법 위반 조사",
        "→ 증권사에서 같은 일이 생기면: 자본시장법 + 개인정보보호법 + 회사 징계 동시"],
      tip: "빨간 배경 뉴스 카드 3개. 충격 효과." },
    { id: "S-10", section: "2교시", title: "레드라인 ① MNPI (미공개 중요 정보)",
      bullets: ["정의: 공시 전 실적 / M&A 내용 / 유상증자 계획 / 목표주가 (발표 전)",
        "근거: 자본시장법 제174조 (내부자거래 금지)",
        "❌ '다음 주 공시할 당사 영업이익으로 시황 보고서 초안 써줘'",
        "✅ 공시 완료 후 DART 공시문 붙여넣기 → AI 요약",
        "기준: 공시 전이냐 후냐. 타이밍이 전부."],
      tip: "X/O 케이스 대비. 빨강/초록 배경으로 직관적 표현." },
    { id: "S-11", section: "2교시", title: "레드라인 ② 고객 개인·금융 정보",
      bullets: ["정의: 고객 실명 / 계좌번호 / 잔고 / 거래내역 / 연락처 / 투자성향",
        "근거: 개인정보보호법 / 신용정보법 / 금융소비자보호법",
        "❌ '홍길동(계좌번호 1234-5678, 잔고 3억) 포트폴리오 추천해줘'",
        "✅ '50대, 자산 3억, 중위험 성향 고객 적합 포트폴리오 추천해줘'",
        "비식별화해도 공용 AI에는 노랑(🟡) 판단 — 사내 도구 우선"],
      tip: "실명/익명 비교 카드. 비식별화도 완전 안전이 아님을 강조." },
    { id: "S-12", section: "2교시", title: "레드라인 ③ 발간 전 리서치·딜 정보",
      bullets: ["정의: 미발간 리포트 초안 / 목표주가 / 딜 코드명 / IM 원문 / 실사 자료",
        "❌ '이 기업 초안 리포트 검토해줘' (발간 전 사내 문서)",
        "✅ 경쟁사 공식 발간 리포트 PDF 텍스트 붙여넣기 → AI 비교 분석",
        "AI 환각 주의: 수치·법령·날짜는 반드시 DART·한은·금감원 원출처 대조",
        "AI가 틀린 수치로 보고서 작성 → 책임은 서명한 직원 본인"],
      tip: "발간 전 vs 발간 후 타임라인으로 시각화." },
    { id: "S-13", section: "2교시", title: "30초 결정 트리",
      bullets: ["Q1: 공개된 정보인가? (DART공시·뉴스·공식보도자료) → YES → 🟢",
        "Q2: MNPI / 고객 개인정보 포함? → YES → 🔴 스톱",
        "Q3: 사내 기밀 자료? (감사보고서·인사자료·미서명계약서) → YES → 🔴 스톱",
        "Q4: 나머지 사내 정보? → 🟡 사내 승인 도구 오픈 후 사용",
        "→ 책상에 붙여두세요. 오늘 배포 카드에 있습니다"],
      tip: "다이아몬드형 플로차트. 3색 그대로. 한눈에 보이도록." },
    { id: "S-14", section: "2교시", title: "AI 출력 검증 3단계",
      bullets: ["STEP 1: 수치·날짜·법령 조항 → 원출처(DART·한은·금감원) 100% 대조",
        "STEP 2: 개인정보·MNPI 포함 여부 자가 체크 (신호등 기준)",
        "STEP 3: 외부 발송·보고 전 상급자 또는 동료 1인 확인",
        "→ 처음 3개월은 의식적으로. 이후엔 자동으로 됩니다"],
      tip: "3단계 계단형 순서도. 각 스텝 강조색 다르게." },
    { id: "S-15", section: "2교시", title: "케이스 퀴즈 — 신호등은 무슨 색?",
      bullets: ["Q1. DART에 공시된 경쟁사 실적으로 비교분석 → ?",
        "Q2. 아직 발간 안 된 자사 리포트 초안을 AI에게 검토 요청 → ?",
        "Q3. 고객 이름 빼고 '나이·자산·성향'만 입력해 포트폴리오 추천 → ?",
        "Q4. 블룸버그 기사(영문) 한국어 번역 요약 → ?",
        "Q5. 딜 종결 후 공식 보도자료로 딜 요약 작성 → ?",
        "(5개 샘플 — 인쇄물 15문항 전체 풀이 후 해설)"],
      tip: "3색 투표 카드(빨/노/초록) 수강생 배포. 또는 QR 링크." },

    // ── 3교시: 무료 AI 3종 실전 시연
    { id: "S-16", section: "3교시", title: "ChatGPT · Claude · Gemini — 무료로 뭐가 되나",
      bullets: ["ChatGPT Free: GPT-4o mini 무료 · 범용 문서 작성·요약·번역 · 하루 메시지 제한",
        "Claude Free (Anthropic): Claude 3.5 무료 · 긴 문서 분석 강점 · 일일 사용량 제한",
        "Gemini Free (Google): Gemini 1.5 Flash 무료 · Google 검색 연동 · YouTube·Drive 연계 가능",
        "→ 무료 한도 내에서도 업무 80%는 커버 가능",
        "→ 3종 모두 한국어 지원. 사용 전 데이터 학습 설정 OFF 확인"],
      tip: "3종 비교표: 무료 한도·강점·약점·적합 업무. 아이콘 포함." },
    { id: "S-17", section: "3교시", title: "업무 유형별 도구 선택 매트릭스",
      bullets: ["공시·뉴스 요약 → ChatGPT (범용, 빠름)",
        "100페이지+ 영문 리서치 번역·분석 → Claude (긴 컨텍스트 강점)",
        "최신 뉴스 실시간 검색·요약 → Gemini (Google 검색 연동)",
        "엑셀·Python·VBA 코드 생성 → ChatGPT or Gemini",
        "긴 계약서·규정 문서 검토 요약 → Claude",
        "이미지·차트 설명 요청 → Gemini or ChatGPT-4o"],
      tip: "4열 매트릭스: 업무유형 / 추천도구 / 이유 / 주의사항. 색 구분." },
    { id: "S-18", section: "3교시", title: "프롬프트 실전 템플릿 5패턴",
      bullets: ["요약: '다음 공시문을 증권사 신입 직원이 이해할 수 있게 5줄로 요약해줘. 수치는 원문 그대로.'",
        "번역: '다음 영문 기사를 금융 용어는 국내 표준 용어로, 영문 병기하여 번역해줘.'",
        "초안: '당신은 WM 어드바이저입니다. 금리 인하 발표 후 채권형 고객에게 보낼 안내 메일 초안을 써줘.'",
        "분석: '다음 두 기업의 공시 재무제표를 비교해 표로 정리해줘. 수치 추정은 하지 말고 공시 기준으로만.'",
        "코드: 'A열: 날짜, B열: 종가 기준으로 20일 이동평균을 C열에 계산하는 엑셀 수식을 알려줘.'"],
      tip: "프롬프트 텍스트 박스 형태로. 복사해서 바로 쓸 수 있는 느낌." },
    { id: "S-19", section: "3교시", title: "[라이브 시연 ①] 동일 공시 → 3종 AI 비교",
      bullets: ["시연 대상: DART 특정 기업 사업보고서 일부 (공개 문서)",
        "동일 프롬프트를 ChatGPT / Claude / Gemini에 동시 입력",
        "비교 포인트: 응답 속도 / 요약 품질 / 수치 정확도 / 형식",
        "→ ChatGPT: 간결 빠름 / Claude: 구조적 상세 / Gemini: 검색 연동 보완",
        "→ 어떤 도구가 무조건 좋은 게 아니라 '업무에 맞게' 선택"],
      tip: "화면 3분할로 세 AI 동시 표시. 실시간 비교가 핵심." },
    { id: "S-20", section: "3교시", title: "[라이브 시연 ②] 영문 리포트 번역 (Claude)",
      bullets: ["시연 대상: 공개 영문 글로벌 IB 리포트 10페이지 (공개 자료)",
        "Claude Free에 전문 붙여넣기 → '금융 용어 국내 표준으로, 표·숫자 원문 유지'",
        "→ GPT Free 무료 한도 초과 케이스 vs Claude Free 처리 가능 케이스 비교",
        "→ 긴 문서는 Claude가 유리. 단, 수치는 반드시 원본 대조"],
      tip: "좌: 영문 원본 / 우: Claude 번역 결과. 직관적 대조." },
    { id: "S-21", section: "3교시", title: "[라이브 시연 ③] 엑셀 VBA / 파이썬 코드",
      bullets: ["시연 대상: '매일 DART에서 특정 종목 공시 긁어오는 파이썬 코드 써줘'",
        "ChatGPT vs Gemini 결과 비교 (공개 API 사용, 내부 데이터 없음 → 🟢)",
        "실행·오류 수정까지 AI와 대화하며 해결하는 방법 시연",
        "→ 코딩 경험 없어도 OK. AI가 수정도 해줍니다",
        "→ 단, 생성된 코드가 사내 시스템 접근 시 IT팀 사전 승인 필요"],
      tip: "터미널 or 엑셀 화면 캡처. 코드 블록 시각화." },

    // ── 4교시: 부서별 활용 플레이북
    { id: "S-22", section: "4교시", title: "WM/PB — 고객 이름 빼면, 나머지는 AI가 처리",
      bullets: ["🟢 일일 시황: 한은 보도자료 → ChatGPT 요약 → 고객용 한 줄 (12분)",
        "🟢 고객 안내 메일: '50대 중위험 성향 채권 고객'으로 가상화 → ChatGPT 초안 (7분)",
        "🟢 상품 비교표: 공식 상품 브로셔 텍스트 → Gemini 표 정리 (10분)",
        "🟢 ETF 해외 자료 번역: Claude로 펀드 팩트시트 번역 (15분)",
        "🔴 고객 실명·계좌번호·포트폴리오 내역 → 어떤 AI에도 입력 금지"] },
    { id: "S-23", section: "4교시", title: "IB — 공개 리서치·번역·구조화는 AI로",
      bullets: ["🟢 글로벌 M&A 영문 기사 한국어 요약: Claude 긴 컨텍스트 활용 (18분)",
        "🟢 산업 분석 섹션 구조: '반도체 산업 IM 목차 뼈대 만들어줘 (가상)' → ChatGPT",
        "🟢 비교 분석표(Comps) 구조: 수치 없이 항목·형식만 → AI 템플릿",
        "🟢 공개 IR 자료 영문→한국어 번역·요약: Claude",
        "🔴 딜 코드명·미공개 밸류에이션·실사 자료·LOI 원문 → 절대 금지"] },
    { id: "S-24", section: "4교시", title: "S&T — 뉴스 브리핑·코드 생성 전부 초록",
      bullets: ["🟢 해외 뉴스 브리핑: Bloomberg·Reuters 5개 → ChatGPT 요약 → 데일리 1페이지 (15분)",
        "🟢 국내 파생상품 뉴스: Gemini 실시간 검색 연동 요약",
        "🟢 파이썬 데이터 분석 코드: '공개 야후파이낸스 데이터로 변동성 계산' → ChatGPT",
        "🟢 엑셀 VBA 자동화: 반복 보고서 생성 코드 → ChatGPT (5분)",
        "🔴 실시간 호가 데이터·포지션·주문 정보 → AI 입력 금지"] },
    { id: "S-25", section: "4교시", title: "리서치 — 공시 정리·번역은 AI로, 자사 리포트는 내부",
      bullets: ["🟢 DART 사업보고서 정리: 재무지표 표 추출 → Claude (20분)",
        "🟢 공개 외신 리포트 번역: 글로벌 IB 공개 발간본 → Claude 번역 (18분)",
        "🟢 두 기업 공시 재무 비교: DART 수치 붙여넣기 → ChatGPT 표 정리",
        "🟢 산업 통계 자료 요약: 공개 통계청·금감원 자료 → Gemini 요약",
        "🔴 자사 발간 전 리포트 초안·목표주가·투자의견 → 내부 도구만"] },
    { id: "S-26", section: "4교시", title: "리테일 — 안내문·FAQ·민원 초안 자동화",
      bullets: ["🟢 상품 FAQ: 공식 브로셔 텍스트 → ChatGPT 구어체 FAQ 20개 (10분)",
        "🟢 고객 안내문 초안: '금리 인상 후 적금 고객 안내문, 쉬운 말로' → ChatGPT",
        "🟢 민원 답변 초안: 유사 사례 공개 자료 기반 → Claude 초안 후 컴플팀 검토",
        "🟢 SNS 상품 홍보 카피: 공식 상품 정보 → ChatGPT 3가지 버전",
        "🔴 고객 거래내역·민원인 개인정보 → AI 입력 금지, 완성본은 반드시 검토 후 발송"] },
    { id: "S-27", section: "4교시", title: "백오피스·IT·컴플라이언스 — 코드·법령 요약 전부 초록",
      bullets: ["🟢 엑셀 함수·VBA: 매크로 작성, 데이터 정제, VLOOKUP 복잡 수식 → ChatGPT (5분)",
        "🟢 파이썬 코드 디버깅: 오류 메시지 붙여넣기 → ChatGPT 원인·수정 방법",
        "🟢 금융 법령 공개 조문 요약: '자본시장법 제174조 내용과 적용 기준 요약' → Claude",
        "🟢 회의록 정리: 녹취 텍스트(내부 정보 제외) → Gemini 구조화",
        "🔴 감사보고서·인사 자료·미서명 계약서·내부 규정 원문 → 공용 AI 금지"] },

    // ── 5교시: 핸즈온 + 마무리
    { id: "S-28", section: "5교시", title: "핸즈온 시나리오 — 부서별 실습 과제",
      bullets: ["WM: 한은 기준금리 인하 발표문 → 채권 고객 안내 메일 초안 (ChatGPT)",
        "IB: 반도체 M&A 영문 기사 2건 → 한국어 딜 요약 보고서 (Claude)",
        "S&T: 아시아 시장 뉴스 5개 → 데일리 브리핑 1페이지 (ChatGPT or Gemini)",
        "리서치: DART 특정 기업 사업보고서 → 재무지표 비교표 (Claude)",
        "리테일·백오피스: 공개 법령 조문 → 직원용 Q&A 5개 (ChatGPT)",
        "→ 모든 시나리오 공개 데이터만 사용 🟢"],
      tip: "조별 과제지 인쇄 배포 또는 QR 링크. 시간: 20분 실습 + 5분 발표." },
    { id: "S-29", section: "5교시", title: "조별 발표 — 베스트 프롬프트 공유",
      bullets: ["각 조: 사용한 AI 도구 / 프롬프트 / 결과물 품질 / 아쉬운 점 2~3분 발표",
        "청중: 같은 프롬프트로 더 좋은 결과를 낼 수 있는 개선안 제안",
        "강사: 프롬프트 개선 피드백 제공",
        "우수 프롬프트는 팀 공유 문서에 저장 → 부서 전파"],
      tip: "화이트보드 or 화면 공유. 참여형 분위기." },
    { id: "S-30", section: "마무리", title: "오늘의 3대 행동수칙 + AI 주행 면허 취득",
      bullets: ["1️⃣ 레드라인 3개 외우기: MNPI · 고객정보 · 발간 전 자료 — 이것만 지키면 절반 성공",
        "2️⃣ 초안은 초안이다: 검증 3단계 후 사용, 최종 책임은 내가",
        "3️⃣ 초록부터 적극적으로: 공시·뉴스·번역·코드 — 지금 당장 시작",
        "사내 AI 플랫폼 오픈 시 → 오늘 배운 습관 그대로 적용",
        "30일 팔로업 설문 드립니다 · 문의: 인재개발실"],
      tip: "신호등 초록불 + '면허 취득' 임팩트 있게. 기념 분위기로 마무리." },
  ];

  const pages: Array<typeof slides> = [];
  let cur: typeof slides = [];
  slides.forEach((sl, i) => {
    cur.push(sl);
    if (cur.length === 4 || i === slides.length - 1) { pages.push([...cur]); cur = []; }
  });

  return (
    <Document title="[B] AI 리터러시 교육 PPT 슬라이드 구성안" author="하나증권 인재개발">
      {/* Index page */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBlock}>
          <Text style={s.headerBadge}>하나증권 인재개발 | PPT 제작 가이드</Text>
          <Text style={s.headerTitleLg}>AI 리터러시 교육{"\n"}PPT 슬라이드 구성안</Text>
          <Text style={s.headerSubLg}>슬라이드별 제목 · 핵심 불릿 · 디자인 힌트 | 총 30장</Text>
          <View style={s.badgeRow}>
            <Text style={s.badge}>30 슬라이드</Text>
            <Text style={s.badge}>5교시 구성</Text>
            <Text style={s.badge}>사례·시연 중심 80%</Text>
          </View>
        </View>
        <Text style={s.sectionTitle}>슬라이드 목록</Text>
        <View style={s.tableHeaderRow}>
          <Text style={[s.tableHeader, { width: "14%" }]}>번호</Text>
          <Text style={[s.tableHeader, { width: "18%" }]}>섹션</Text>
          <Text style={[s.tableHeader, { flex: 1 }]}>슬라이드 제목</Text>
        </View>
        {slides.map((sl, i) => (
          <View key={sl.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tableCellBold, { width: "14%", color: B_MAIN }]}>{sl.id}</Text>
            <Text style={[s.tableCell, { width: "18%" }]}>{sl.section}</Text>
            <Text style={[s.tableCell, { flex: 1 }]}>{sl.title}</Text>
          </View>
        ))}
        <Footer label="하나증권 인재개발 · AI 리터러시 교육 PPT 구성안" page={1} s={s} />
      </Page>

      {/* Slide detail pages */}
      {pages.map((group, pi) => (
        <Page key={pi} size="A4" style={s.page}>
          {group.map((sl) => (
            <View key={sl.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardBadge}>{sl.id}</Text>
                <Text style={[s.cardTitle, { fontSize: 7.5 }]}>{sl.section}</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={{ fontSize: 9, fontWeight: 700, color: B_TEXT, marginBottom: 4 }}>{sl.title}</Text>
                {sl.bullets.map((b, bi) => <Bullet key={bi} text={b} s={s} />)}
                {sl.tip && (
                  <View style={[s.hlBox, { marginTop: 4 }]}>
                    <Text style={s.hlLabel}>디자인 힌트</Text>
                    <Text style={s.hlText}>{sl.tip}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
          <Footer label="하나증권 인재개발 · AI 리터러시 교육 PPT 구성안" page={pi + 2} s={s} />
        </Page>
      ))}
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT C — 강의 대본 (무료 AI 3종 · 경쟁사 맥락 반영)
// ═══════════════════════════════════════════════════════════════════════════════

const SCRIPT_SECTIONS = [
  {
    label: "1교시 (00:00–00:50)",
    title: "AI 왜 써야 하나 — 경쟁사·하나증권 전략 + 3색 신호등",
    items: [
      { heading: "오프닝 [S-01] 00:00", lines: [
        "안녕하세요. 오늘 다섯 시간 함께할 강사입니다. (자기소개)",
        "오늘 교육은 금지 교육이 아닙니다. '어떻게 하면 증권사에서 제대로 AI를 쓸 수 있냐'를 배우는 시간입니다.",
        "이론은 최소, 실제로 써보는 게 80%입니다. 노트보다는 눈과 손을 쓸 준비를 해주세요.",
      ]},
      { heading: "아이스브레이킹 [S-02] 00:03", lines: [
        "ChatGPT 써보신 분? / Claude 써보신 분? / Gemini 써보신 분?",
        "학교 과제에 써본 분? / 업무에 써본 분?",
        "→ 지금까지 쓰신 방식은 개인 용도입니다. 증권사 직원으로 업무에 쓰는 건 완전히 다른 규칙이 있습니다. 그 차이를 배웁니다.",
      ]},
      { heading: "경쟁사 현황 [S-03] 00:06", lines: [
        "오늘 아침에도 기사가 나왔습니다. KB증권은 마이크로소프트 Copilot을 전사에 깔았습니다.",
        "미래에셋증권은 자체 AI 플랫폼을 만들었습니다. NH투자증권은 AI 전담 조직만 20명입니다.",
        "신한투자증권은 '챗프로'라는 사내 AI 도구로 이미 보고서 초안을 AI가 씁니다.",
        "이건 먼 미래 얘기가 아닙니다. 여러분이 배치받을 그 부서에서 지금 일어나는 일입니다.",
      ]},
      { heading: "하나증권 4대 전략 [S-04] 00:12", lines: [
        "강성묵 대표님이 올해 신년사에서 직접 말씀하셨습니다. 4대 핵심전략 중 하나가 'AI 중심 사업·업무 재설계'입니다.",
        "함영주 회장님도 '다음 승부는 스테이블코인과 AI'라고 하셨습니다.",
        "하나증권도 이미 공포탐욕시그널이라는 자체 AI 모델을 MTS에 탑재했습니다. 업계 최초입니다.",
        "임원 선언이 있었다는 건 예산도 있고 실행도 한다는 뜻입니다. 여러분이 AI를 쓸 줄 알아야 전략이 현장에서 실행됩니다.",
      ]},
      { heading: "그래서 신입사원인 우리는 [S-06] 00:20", lines: [
        "경쟁사는 사내 AI 플랫폼 단계. 하나증권도 구축 중입니다.",
        "지금 당장은 무료 ChatGPT·Claude·Gemini가 현실적 선택입니다.",
        "지금 무료 AI로 공개 정보 업무를 익혀두면, 사내 플랫폼이 열릴 때 가장 빠르게 적응할 수 있습니다.",
        "단, 안전하게 쓰는 법부터 배워야 합니다. 그게 오늘 교육의 목적입니다.",
      ]},
      { heading: "Before / After [S-07] 00:26", lines: [
        "제가 실제로 측정한 수치입니다. 일일 시황 요약: 60분 → 12분. 영문 리포트 번역: 90분 → 18분.",
        "고객 메일 초안: 30분 → 7분. 엑셀 함수 문제: 45분 → 5분.",
        "하루 2~3시간이 돌아옵니다. 연간으로 치면 500시간 이상입니다.",
        "그 시간을 더 중요한 일에 쓸 수 있습니다.",
      ]},
      { heading: "3색 신호등 [S-08] 00:36", lines: [
        "빨강은 절대 멈춤. 어떤 AI에도, 어떤 상황에서도 입력 금지. 위반하면 법적 책임입니다.",
        "노랑은 사내 승인 도구로만. 사내 플랫폼 오픈 후 해당 도구 사용.",
        "초록은 지금 바로 쓰셔도 됩니다. 단, 결과물은 반드시 검증 3단계.",
        "오늘 교육 내내 이 신호등이 나옵니다. 지금 외워두세요.",
      ]},
    ],
  },
  {
    label: "2교시 (01:00–01:50)",
    title: "3대 레드라인 + 케이스 퀴즈 15문항",
    items: [
      { heading: "사고 사례 [S-09] 01:02", lines: [
        "삼성전자 직원이 ChatGPT에 소스코드를 붙여넣었습니다. OpenAI 서버로 전송됐고, 삼성은 전사 AI 사용을 금지했습니다.",
        "미국 로펌 변호사는 AI가 만든 허위 판례를 법원에 그대로 제출했습니다. 법원 제재를 받았습니다.",
        "증권사에서 같은 일이 생기면? 자본시장법 + 개인정보보호법 + 회사 징계가 동시에 옵니다. 개인 책임입니다.",
      ]},
      { heading: "레드라인 ① MNPI [S-10] 01:07", lines: [
        "MNPI는 Material Non-Public Information, 미공개 중요 정보입니다.",
        "공시 전 실적, M&A, 유상증자 계획, 자사 목표주가가 대표적입니다.",
        "기준은 딱 하나입니다. '공시 전이냐 후냐.' 공시 후는 초록, 공시 전은 빨강.",
        "자본시장법 제174조. 위반하면 형사 처벌입니다.",
      ]},
      { heading: "레드라인 ② 고객정보 [S-11] 01:13", lines: [
        "고객 실명, 계좌번호, 잔고, 거래내역, 투자성향은 무조건 빨강입니다.",
        "홍길동 이름을 빼도 계좌번호가 있으면 빨강. 비식별화해도 사내 도구 우선입니다.",
        "가상 프로필로 대체하세요. '50대, 자산 3억, 중위험 성향 고객'으로 일반화하면 초록입니다.",
      ]},
      { heading: "레드라인 ③ 발간 전 자료 [S-12] 01:19", lines: [
        "미발간 리서치 초안, 목표주가, 딜 코드명, IM 원문은 빨강입니다.",
        "같은 내용도 공개 전이면 빨강, 공개 후면 초록. 타이밍이 전부입니다.",
        "AI 환각도 주의하세요. AI는 모르면 그럴듯하게 만들어냅니다. 수치·날짜·법령은 반드시 원출처 대조.",
      ]},
      { heading: "30초 결정 트리 [S-13] 01:27", lines: [
        "공개 정보냐? YES면 초록. / MNPI·고객정보냐? YES면 빨강. / 나머지 사내 정보는 노랑.",
        "30초면 판단할 수 있습니다. 오늘 배포하는 카드에 있습니다. 책상에 붙여두세요.",
      ]},
      { heading: "케이스 퀴즈 15문항 01:32", lines: [
        "인쇄물(또는 QR)을 꺼내주세요. 15개 케이스, 각각 빨강/노랑/초록 중 선택. 5분 드립니다.",
        "먼저 혼자 풀기. 틀려도 전혀 창피하지 않습니다. 헷갈리는 케이스를 지금 경험하는 게 더 중요합니다.",
        "[대표 해설] DART 공시 기업 실적 요약 → 🟢 / 미발간 자사 리포트 초안 → 🔴 / 고객 이름 없이 나이·자산·성향만 → 🟢",
        "빨강 케이스마다 '대신 이렇게 하세요'를 반드시 같이 설명합니다.",
      ]},
      { heading: "검증 3단계 [S-14] 01:43", lines: [
        "Step 1: 수치·날짜·법령 → 원출처 100% 대조. AI가 틀렸을 수 있습니다.",
        "Step 2: 개인정보·MNPI 포함 여부 자가 체크. 신호등 기준으로.",
        "Step 3: 외부 발송·보고 전 상급자 또는 동료 1인 확인.",
        "처음 3개월은 의식적으로. 3개월 후엔 자동으로 됩니다.",
      ]},
    ],
  },
  {
    label: "3교시 (02:00–02:50)",
    title: "ChatGPT·Claude·Gemini 무료 3종 라이브 시연",
    items: [
      { heading: "무료 3종 비교 [S-16] 02:02", lines: [
        "ChatGPT Free: GPT-4o mini 무료. 범용 문서 작성·요약·번역. 하루 메시지 제한 있습니다.",
        "Claude Free (Anthropic): Claude 3.5 무료. 긴 문서 분석이 특히 강합니다. 일일 사용량 제한.",
        "Gemini Free (Google): Gemini 1.5 Flash 무료. Google 검색·YouTube·Drive 연동이 강점.",
        "3종 모두 한국어 지원. 사용 전 데이터 학습 설정을 OFF로 꺼두세요. 지금 제가 보여드리겠습니다.",
      ]},
      { heading: "도구 선택 매트릭스 [S-17] 02:10", lines: [
        "공시·뉴스 요약 → ChatGPT (빠르고 범용). / 100페이지 영문 리포트 → Claude (긴 컨텍스트).",
        "최신 뉴스 실시간 검색 → Gemini (Google 연동). / 엑셀·파이썬 코드 → ChatGPT or Gemini.",
        "어떤 도구가 무조건 좋은 게 아닙니다. 업무에 맞게 선택하는 겁니다.",
      ]},
      { heading: "[라이브 시연 ①] 동일 공시 3종 비교 [S-19] 02:14", lines: [
        "지금 제 화면을 보세요. DART에서 특정 기업 사업보고서 일부를 가져왔습니다. 공개 문서입니다.",
        "동일한 프롬프트를 ChatGPT / Claude / Gemini 세 곳에 동시에 입력합니다.",
        "결과를 보시면: ChatGPT는 간결하고 빠릅니다. Claude는 구조적이고 상세합니다. Gemini는 검색 연동으로 보완합니다.",
        "어떤 차이가 보이시나요? (수강생 반응 수렴) → 업무에 따라 선택하면 됩니다.",
      ]},
      { heading: "[라이브 시연 ②] 영문 리포트 번역 [S-20] 02:24", lines: [
        "지금 제 화면을 보세요. 공개 영문 글로벌 IB 리포트 10페이지입니다.",
        "Claude Free에 전문을 붙여넣습니다. 프롬프트: '금융 용어는 국내 표준으로, 표·숫자는 원문 유지하여 번역해줘.'",
        "ChatGPT Free는 이 길이에서 무료 한도 초과가 날 수 있습니다. Claude Free는 처리됩니다.",
        "결과물 나왔습니다. 수치는 원본과 대조해야 합니다. 지금 같이 확인해볼까요?",
      ]},
      { heading: "[라이브 시연 ③] 엑셀 / 파이썬 코드 [S-21] 02:35", lines: [
        "코딩 경험 없으셔도 됩니다. 제가 보여드리겠습니다.",
        "ChatGPT에게: 'A열 날짜, B열 종가 기준으로 20일 이동평균을 C열에 계산하는 엑셀 수식을 알려줘.'",
        "나왔습니다. 엑셀에 붙여넣으면 바로 됩니다.",
        "오류가 나면? 오류 메시지를 그대로 다시 붙여넣으면 AI가 수정합니다. 이게 코파일럿 방식입니다.",
        "단, 생성된 코드가 사내 시스템에 접근한다면 IT팀 사전 승인이 필요합니다.",
      ]},
      { heading: "실전 템플릿 5패턴 [S-18] 02:44", lines: [
        "지금 배포할 인쇄물에 5개 프롬프트 템플릿이 있습니다. 이거 갖다 쓰시면 됩니다.",
        "요약형 / 번역형 / 초안형 / 비교분석형 / 코드형 — 증권사 업무 80%를 커버합니다.",
        "역할·맥락·지시·형식 4요소 다 넣으면 됩니다. 30초 더 써도 30분이 절약됩니다.",
      ]},
    ],
  },
  {
    label: "4교시 (03:00–03:50)",
    title: "부서별 활용 플레이북 — 스토리텔링 + 소그룹 토론",
    items: [
      { heading: "WM/PB [S-22] 03:05", lines: [
        "입사 1주차, WM 부서에서 받은 첫 미션: '오늘 한은 기준금리 발표 후 채권 고객 안내 메일 써줘.'",
        "60분짜리 일입니다. AI로 하면 어떻게 될까요?",
        "한은 보도자료(공개) → ChatGPT에 붙여넣기 → '채권 고객 안내 메일 초안, 전문용어 없이' → 7분.",
        "고객 이름이 들어가는 순간 스톱. 가상 프로필로 대체하세요.",
      ]},
      { heading: "IB [S-23] 03:13", lines: [
        "IB 1주차 미션: '글로벌 반도체 M&A 영문 기사 3건 읽고 한국어 요약 보고서 써줘.'",
        "2시간짜리 일입니다. Claude에 영문 기사 붙여넣기 → '딜 배경·조건·시사점 구조로 한국어 요약' → 18분.",
        "딜 코드명, 미공개 밸류에이션, 실사 자료는 절대 입력 금지.",
      ]},
      { heading: "S&T / 리서치 [S-24,25] 03:21", lines: [
        "S&T: 장 시작 전 블룸버그·로이터 영문 뉴스 5개 → ChatGPT 요약 → 데일리 브리핑 1페이지. 15분.",
        "파이썬 코드 짜야 할 일 → ChatGPT에 물어보세요. 코딩 없이 됩니다.",
        "리서치: DART 사업보고서 재무지표 표 추출 → Claude 20분. 경쟁사 공개 리포트 비교 → ChatGPT.",
        "자사 발간 전 리포트 초안은 절대 공용 AI에 넣지 마세요.",
      ]},
      { heading: "리테일 / 백오피스 [S-26,27] 03:30", lines: [
        "리테일: 상품 FAQ 20개 → ChatGPT 10분. 고객 안내문 → 검토 후 발송. 민원 초안 → 컴플팀 확인 필수.",
        "백오피스: 엑셀 VBA, 파이썬 디버깅, 법령 조문 요약은 전부 초록. 코딩 몰라도 됩니다.",
        "사내 정보가 들어가는 순간 노랑 또는 빨강. 로직만 AI에게, 데이터는 직접.",
      ]},
      { heading: "소그룹 토론 03:40", lines: [
        "옆 동료 2~3명과 5분 토론 시작합니다.",
        "주제: '내 부서에서 AI로 가장 먼저 해볼 일은 무엇이고, 어떤 도구를 쓰고, 무엇을 주의해야 하나?'",
        "5분 후 조별로 1분씩 발표. 강사가 피드백 드립니다.",
      ]},
    ],
  },
  {
    label: "5교시 (04:00–04:50)",
    title: "핸즈온 실습 + 조별 발표 + Q&A",
    items: [
      { heading: "핸즈온 안내 [S-28] 04:02", lines: [
        "트랙 A(노트북): 시나리오 → 직접 프롬프트 설계 → AI 실행 → 검증 → 조별 발표 2~3분.",
        "트랙 B(워크시트): 강사 시연 → 종이 워크시트에 프롬프트 작성 → 조별 발표.",
        "모든 시나리오는 공개 데이터만 사용합니다. 전부 초록입니다.",
        "부서별 과제지를 지금 배포합니다. 20분 드립니다.",
      ]},
      { heading: "조별 발표 [S-29] 04:25", lines: [
        "각 조: 사용한 AI / 프롬프트 / 결과물 품질 / 아쉬운 점 2~3분 발표.",
        "청중: 더 좋은 프롬프트 개선안 제안 환영합니다.",
        "우수 프롬프트는 오늘 공유 문서에 저장하겠습니다. 배치 후 동료에게 전파해주세요.",
      ]},
      { heading: "마무리 3대 수칙 [S-30] 04:43", lines: [
        "1번: 레드라인 3개 외우기 — MNPI, 고객정보, 발간 전 자료. 이것만 지키면 절반 성공.",
        "2번: 초안은 초안이다 — 검증 3단계 후 사용. 최종 책임은 내가.",
        "3번: 초록을 지금 당장 — 공시·뉴스·번역·코드, 오늘부터 시작하세요.",
      ]},
      { heading: "클로징 04:48", lines: [
        "여러분은 오늘 AI 안전 주행 면허를 받았습니다.",
        "쓰세요. 단, 신호등을 지키면서.",
        "사내 AI 플랫폼이 열리면 오늘 배운 습관 그대로 적용하면 됩니다.",
        "30일 팔로업 설문 드립니다. 솔직한 답변이 다음 기수에 반영됩니다. 수고하셨습니다.",
      ]},
    ],
  },
];

const QNA_LIST = [
  ["ChatGPT 유료 플랜은 데이터 학습을 끄니까 써도 되나요?",
    "유료 플랜도 데이터 학습 설정을 OFF 하면 보안이 강화됩니다. 하지만 하나증권 보안 정책은 도구 유·무료와 무관합니다. MNPI·고객정보는 어떤 플랜에서도 입력 불가. 결국 무엇을 입력하느냐가 기준입니다."],
  ["Claude 무료로도 긴 문서가 정말 되나요?",
    "Claude Free는 10만 토큰(약 75,000 단어) 수준의 컨텍스트를 지원합니다. 10~20페이지 영문 리포트는 충분히 처리됩니다. 다만 일일 사용량 제한이 있어 많이 쓰면 초기화될 수 있습니다. 하루 3~5건 업무라면 무료로 충분합니다."],
  ["Gemini는 언제 쓰는 게 가장 유리한가요?",
    "Gemini의 강점은 Google 검색 실시간 연동입니다. 최신 뉴스 요약, 기업 최근 동향 검색, YouTube 영상 내용 요약에 유리합니다. ChatGPT·Claude는 지식 컷오프가 있어 최신 뉴스를 모를 수 있는데, Gemini는 실시간 검색으로 보완합니다."],
  ["세 AI가 다 무료인데 결과가 다르게 나오면 어떻게 하나요?",
    "세 AI의 결과가 다르면 원출처(DART·공식 자료)로 확인이 정답입니다. AI는 생성 모델이라 같은 질문에 다른 답이 나올 수 있습니다. 특히 수치·법령·날짜가 포함된 경우 반드시 원출처 100% 대조 후 사용하세요."],
  ["비식별화 완벽히 하면 고객 정보를 공용 AI에 써도 되나요?",
    "비식별화 데이터도 공용 AI에서는 노랑(🟡) 판단입니다. 사내 승인 도구 우선 원칙이 적용됩니다. 완전 비식별화 여부 판단 자체가 어렵기 때문에 애매하면 컴플 팀에 먼저 확인하세요."],
  ["사내 AI 플랫폼은 언제 생기나요?",
    "구체적 일정은 IT팀·경영기획 공지를 확인하세요. 다만 2026 4대 전략에 'AI 중심 재설계'가 포함되어 있어 구축 방향은 확정입니다. 플랫폼 오픈 전까지는 오늘 배운 무료 AI를 공개 정보에 한해 사용하고, 내부 데이터 처리가 필요하면 IT팀에 공식 요청하세요."],
  ["AI가 생성한 보고서에 제 이름을 붙여도 되나요?",
    "최종 문서의 책임은 서명한 직원에게 있습니다. AI는 초안 도구입니다. 수치·법령이 포함된 경우 검증 3단계를 반드시 거치세요. '이건 AI가 썼으니 제 책임이 아닙니다'는 법적으로 통하지 않습니다."],
  ["데이터 학습 설정 OFF 방법을 알려주세요",
    "ChatGPT: 설정 → 데이터 제어 → '모델 학습에 사용' 비활성화. Claude: 자동으로 업무 학습 제외 (개인 계정 기준). Gemini: 설정 → Gemini 앱 활동 → 일시 중지. 회사 계정 또는 Teams/Workspace 버전은 자동 OFF인 경우가 많습니다."],
];

function DocC() {
  const s = makeStyles(C_MAIN, C_LIGHT, C_TEXT);
  return (
    <Document title="[C] AI 리터러시 교육 강의 대본" author="하나증권 인재개발">
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBlock}>
          <Text style={s.headerBadge}>하나증권 인재개발 | 강사용 대본</Text>
          <Text style={s.headerTitleLg}>AI 리터러시 교육{"\n"}강의 대본</Text>
          <Text style={s.headerSubLg}>5교시 · 무료 AI 3종 실전 시연 포함 · Q&A 8개 준비</Text>
          <View style={s.badgeRow}>
            <Text style={s.badge}>5시간 전체</Text>
            <Text style={s.badge}>교시별 구분</Text>
            <Text style={s.badge}>Q&A 8개 포함</Text>
          </View>
        </View>
        <Text style={s.sectionTitle}>사용 방법</Text>
        <Bullet text="[시간] 표시: 교육 시작 기준 누적 시간 (예: 02:14 = 2시간 14분 경과)" s={s} />
        <Bullet text="[S-번호] 표시: 해당 PPT 슬라이드 번호 (B 문서와 대응)" s={s} />
        <Bullet text="그대로 읽는 대본이 아닙니다. 흐름을 익혀서 자연스럽게 말하세요." s={s} />
        <Bullet text="시간 부족 시: 4교시 부서별 슬라이드 일부 축약 가능. 2교시 퀴즈 해설은 반드시 유지." s={s} />
        <Bullet text="3교시 라이브 시연 3개 중 1개 이상은 반드시 진행. 이것이 교육의 핵심입니다." s={s} />
        <Text style={s.sectionTitle}>교시별 목차</Text>
        {SCRIPT_SECTIONS.map((sec) => (
          <View key={sec.label} style={s.bulletRow}>
            <Text style={s.bulletDot}>▶</Text>
            <Text style={[s.bulletText, { fontWeight: 700 }]}>{sec.label} — {sec.title}</Text>
          </View>
        ))}
        <Footer label="하나증권 인재개발 · AI 리터러시 교육 강의 대본" page={1} s={s} />
      </Page>

      {/* Script pages */}
      {SCRIPT_SECTIONS.map((sec, si) => (
        <Page key={si} size="A4" style={s.page}>
          <View style={[s.headerBlock, { paddingVertical: 12 }]}>
            <Text style={[s.headerBadge, { marginBottom: 2 }]}>{sec.label}</Text>
            <Text style={[s.headerTitleLg, { fontSize: 13 }]}>{sec.title}</Text>
          </View>
          {sec.items.map((item, ii) => (
            <View key={ii} style={{ marginBottom: 9 }}>
              <Text style={{ fontSize: 8.5, fontWeight: 700, color: C_MAIN, marginBottom: 3 }}>{item.heading}</Text>
              {item.lines.map((line, li) => (
                <View key={li} style={s.bulletRow}>
                  <Text style={s.bulletDot}>›</Text>
                  <Text style={s.bulletText}>{line}</Text>
                </View>
              ))}
            </View>
          ))}
          {si < SCRIPT_SECTIONS.length - 1 && (
            <View style={[s.hlBox, { marginTop: 6 }]}>
              <Text style={s.hlLabel}>휴식 10분</Text>
              <Text style={s.hlText}>시계 확인 후 정시에 재개. 다음 교시 슬라이드와 시연 화면 미리 준비.</Text>
            </View>
          )}
          <Footer label="하나증권 인재개발 · AI 리터러시 교육 강의 대본" page={si + 2} s={s} />
        </Page>
      ))}

      {/* Q&A page */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Q&A 예상 질문 8개 — 답변 준비</Text>
        {QNA_LIST.map(([q, a], i) => (
          <View key={i} style={[s.card, { marginBottom: 7 }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardBadge}>Q{i + 1}</Text>
              <Text style={s.cardTitle}>{q}</Text>
            </View>
            <View style={s.cardBody}>
              <Text style={{ fontSize: 8, color: GRAY_700 }}>{a}</Text>
            </View>
          </View>
        ))}
        <Footer label="하나증권 인재개발 · AI 리터러시 교육 강의 대본" page={SCRIPT_SECTIONS.length + 2} s={s} />
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Download infrastructure
// ═══════════════════════════════════════════════════════════════════════════════

type DocKey = "A" | "B" | "C";

const DOC_META: Record<DocKey, { label: string; filename: string; color: string; hoverColor: string }> = {
  A: { label: "[A] 실장님 보고용 기획서", filename: "A_하나증권_AI교육_기획서.pdf", color: "bg-emerald-600", hoverColor: "hover:bg-emerald-700" },
  B: { label: "[B] PPT 슬라이드 구성안",  filename: "B_하나증권_AI교육_PPT구성안.pdf", color: "bg-indigo-600", hoverColor: "hover:bg-indigo-700" },
  C: { label: "[C] 강의 대본",             filename: "C_하나증권_AI교육_강의대본.pdf",  color: "bg-slate-700", hoverColor: "hover:bg-slate-800" },
};

function makePdfBlob(key: DocKey): Promise<Blob> {
  const doc = key === "A" ? <DocA /> : key === "B" ? <DocB /> : <DocC />;
  return pdf(doc).toBlob();
}

function PDFBtn({ docKey }: { docKey: DocKey }) {
  const [generating, setGenerating] = useState(false);
  const meta = DOC_META[docKey];

  const handle = async () => {
    setGenerating(true);
    try {
      const blob = await makePdfBlob(docKey);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={generating}
      className={`flex items-center gap-2 px-4 py-2 ${meta.color} ${meta.hoverColor} disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer`}
    >
      {generating ? (
        <><Loader2 size={14} className="animate-spin" />PDF 생성 중...</>
      ) : (
        <><Download size={14} />{meta.label}</>
      )}
    </button>
  );
}

export function HanaAIPDFButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <PDFBtn docKey="A" />
      <PDFBtn docKey="B" />
      <PDFBtn docKey="C" />
    </div>
  );
}

export async function generatePDF(key: DocKey): Promise<Blob> {
  return makePdfBlob(key);
}

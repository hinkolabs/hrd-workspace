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

// ── Palette ────────────────────────────────────────────────────────────────────
const WHITE    = "#FFFFFF";
const GRAY_50  = "#F9FAFB";
const GRAY_200 = "#E5E7EB";
const GRAY_400 = "#9CA3AF";
const GRAY_500 = "#6B7280";
const GRAY_700 = "#374151";
const GRAY_900 = "#111827";

// A – amber (보고용)   B – violet (Alli 브랜드)   C – slate (대본)
const A_MAIN = "#D97706"; const A_LIGHT = "#FFFBEB"; const A_TEXT = "#92400E";
const B_MAIN = "#7C3AED"; const B_LIGHT = "#F5F3FF"; const B_TEXT = "#4C1D95";
const C_MAIN = "#374151"; const C_LIGHT = "#F3F4F6"; const C_TEXT = "#111827";

// ── Style factory ──────────────────────────────────────────────────────────────
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
    headerOrg:   { fontSize: 7.5, color: WHITE, opacity: 0.8, marginBottom: 2 },
    headerTitle: { fontSize: 15, fontWeight: 700, color: WHITE, lineHeight: 1.25 },
    headerSub:   { fontSize: 7.5, color: WHITE, opacity: 0.85, marginTop: 3 },
    headerRight: { alignItems: "flex-end", gap: 3 },
    headerRightBadge: {
      backgroundColor: "rgba(255,255,255,0.18)",
      borderRadius: 12,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      fontSize: 7,
      color: WHITE,
    },
    headerBlock: {
      backgroundColor: accent,
      borderRadius: 8,
      paddingVertical: 20,
      paddingHorizontal: 22,
      marginBottom: 14,
    },
    headerBadge:   { fontSize: 7.5, color: WHITE, opacity: 0.8, marginBottom: 3 },
    headerTitleLg: { fontSize: 17, fontWeight: 700, color: WHITE, lineHeight: 1.3, marginBottom: 5 },
    headerSubLg:   { fontSize: 8.5, color: WHITE, opacity: 0.85 },
    badgeRow: { flexDirection: "row", gap: 6, marginTop: 10 },
    badge: {
      backgroundColor: "rgba(255,255,255,0.18)",
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 7.5,
      color: WHITE,
    },
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
    tableRowAlt:      { backgroundColor: GRAY_50 },
    tableRowHighlight: { backgroundColor: accentLight, borderLeftWidth: 2, borderLeftColor: accent },
    tableCell:        { fontSize: 7.5, color: GRAY_700 },
    tableCellBold:    { fontSize: 7.5, color: GRAY_900, fontWeight: 700 },
    tableCellAccent:  { fontSize: 7.5, color: accent,   fontWeight: 700 },
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
    bulletRow: { flexDirection: "row", gap: 4, marginBottom: 2 },
    bulletDot:  { fontSize: 7.5, color: accent, marginTop: 1 },
    bulletText: { fontSize: 8, color: GRAY_700, flex: 1 },
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
    hlText:  { fontSize: 7.5, color: accentText },
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
    cardBody:  { paddingVertical: 7, paddingHorizontal: 9 },
    // 4-col feature row
    featureRow: { flexDirection: "row", gap: 4, marginBottom: 7 },
    featureCell: {
      flex: 1,
      backgroundColor: accentLight,
      borderRadius: 5,
      borderTopWidth: 2,
      borderTopColor: accent,
      paddingVertical: 5,
      paddingHorizontal: 6,
    },
    featureIcon:  { fontSize: 10, marginBottom: 3 },
    featureLabel: { fontSize: 7.5, color: GRAY_900, fontWeight: 700, marginBottom: 2 },
    featureSub:   { fontSize: 6.5, color: GRAY_500 },
    // metric cards
    metricRow: { flexDirection: "row", gap: 4, marginBottom: 7 },
    metricCell: {
      flex: 1,
      backgroundColor: GRAY_50,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: GRAY_200,
      padding: 6,
    },
    metricLabel:  { fontSize: 6.5, color: GRAY_500, marginBottom: 2 },
    metricBefore: { fontSize: 8, color: "#DC2626", fontWeight: 700, marginBottom: 1 },
    metricArrow:  { fontSize: 7, color: GRAY_400, marginBottom: 1 },
    metricAfter:  { fontSize: 9, color: accent,   fontWeight: 700 },
    // two-column pro/con
    twoCol: { flexDirection: "row", gap: 5, marginBottom: 7 },
    twoColCell: {
      flex: 1,
      backgroundColor: GRAY_50,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: GRAY_200,
      padding: 6,
    },
    twoColTitle: { fontSize: 7.5, fontWeight: 700, color: GRAY_900, marginBottom: 4 },
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
// DOCUMENT A — 실장님 보고용 1페이지
// ═══════════════════════════════════════════════════════════════════════════════

function DocA() {
  const s = makeStyles(A_MAIN, A_LIGHT, A_TEXT);
  return (
    <Document title="[A] Alli Works 사내 도입 3시간 첫 교육 기획서" author="하나증권 인재개발">
      <Page size="A4" style={s.page}>

        {/* 슬림 헤더 */}
        <View style={s.headerSlim}>
          <View style={s.headerSlimLeft}>
            <Text style={s.headerOrg}>하나증권 인재개발 | Alli Works 신규 도입</Text>
            <Text style={s.headerTitle}>Alli Works 3시간 첫 사용 가이드 교육 기획서</Text>
            <Text style={s.headerSub}>초보자 전원 대상 · 자격증 Q&A 챗봇 실습 · Qwen-2.5-72B 사내 폐쇄망 운영</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerRightBadge}>3시간 · 7세션</Text>
            <Text style={s.headerRightBadge}>10~20명</Text>
            <Text style={s.headerRightBadge}>Qwen-2.5-72B</Text>
          </View>
        </View>

        {/* 블록 1: 왜 Alli인가 */}
        <Text style={s.sectionTitle}>① 왜 Alli Works인가 — ChatGPT·Claude·Gemini와 무엇이 다른가</Text>
        <View style={{ marginBottom: 7 }}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeader, { width: "20%" }]}>항목</Text>
            <Text style={[s.tableHeader, { width: "20%" }]}>ChatGPT 등 공용 AI</Text>
            <Text style={[s.tableHeader, { flex: 1 }]}>Alli Works (사내 도입)</Text>
          </View>
          {[
            ["데이터 보안",   "외부 서버 전송, 학습 사용 가능성", "사내 폐쇄망 + Qwen 온프레미스 → 외부 전송 0건"],
            ["답변 근거",     "인터넷 학습 데이터 기반, 출처 불명확", "사내 문서·Q&A RAG 기반, 출처 원문 자동 링크"],
            ["실패 대응",     "AI가 모르면 그냥 지어냄(할루시네이션)", "조건 분기 노드 → AI 실패 시 담당자 자동 연결"],
            ["구축 방법",     "API 키만으로 작동 (개인 사용)",    "노코드 플로우 빌더 → 비개발자도 챗봇 제작 가능"],
            ["비용 구조",     "사용량 기반 API 과금 (증가할수록 비용 증가)", "Qwen 온프레미스 → 사용량 무관 고정 인프라 비용"],
          ].map(([item, gpt, alli], i) => (
            <View key={i} style={[s.tableRow, i === 4 ? s.tableRowHighlight : i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.tableCellBold, { width: "20%" }]}>{item}</Text>
              <Text style={[s.tableCell,     { width: "20%", color: "#DC2626" }]}>{gpt}</Text>
              <Text style={[s.tableCellBold, { flex: 1, color: A_MAIN }]}>{alli}</Text>
            </View>
          ))}
        </View>
        <View style={[s.hlBox, { marginBottom: 6 }]}>
          <Text style={s.hlText}>
            Alli의 핵심: 사내 문서를 AI에 연결해 '출처 있는 답변'을 만들고, AI가 실패하면 자동으로 사람에게 연결합니다.
            공용 AI가 '무엇이든 그럴듯하게 말하는 도구'라면, Alli는 '사내 지식 기반의 검증된 답변 도구'입니다.
          </Text>
        </View>

        {/* 블록 2: 도입 효과 수치 */}
        <Text style={s.sectionTitle}>② 도입 효과 — 무엇이 달라지나</Text>
        <View style={s.metricRow}>
          {[
            ["사내 지식 검색 시간",  "15~30분",  "↓",  "10초 이내",   "(RAG + Q&A 즉시 매칭)"],
            ["FAQ 일일 처리량",      "수십 건",  "↑",  "수백 건",     "(24시간 자동 응답)"],
            ["담당자 응답 대기시간", "수 시간",  "↓",  "수 분",       "(알림 + 이전 대화 전달)"],
            ["신규 인입 학습 시간",  "1주일 이상","↓", "당일 체험",   "(사내 Q&A 즉시 접근)"],
          ].map(([label, before, arrow, after, note]) => (
            <View key={label} style={s.metricCell}>
              <Text style={s.metricLabel}>{label}</Text>
              <Text style={s.metricBefore}>{before}</Text>
              <Text style={s.metricArrow}>{arrow}</Text>
              <Text style={s.metricAfter}>{after}</Text>
              <Text style={{ fontSize: 6, color: GRAY_400, marginTop: 2 }}>{note}</Text>
            </View>
          ))}
        </View>
        <View style={[s.hlBox, { marginBottom: 6 }]}>
          <Text style={s.hlLabel}>할루시네이션 주의</Text>
          <Text style={s.hlText}>
            RAG 기반이어도 검색 소스가 없거나 부정확하면 Alli도 지어낼 수 있습니다.
            반드시 출처 원문을 클릭 확인하는 습관이 필요합니다. 수치 답변은 원본 문서 대조 필수.
          </Text>
        </View>

        {/* 블록 3: Qwen-2.5-72B 전환 */}
        <Text style={s.sectionTitle}>③ Qwen-2.5-72B — 왜 Azure OpenAI가 아닌 오픈소스 모델인가</Text>
        <View style={s.twoCol}>
          <View style={s.twoColCell}>
            <Text style={[s.twoColTitle, { color: A_MAIN }]}>장점</Text>
            <Bullet text="데이터 외부 전송 완전 차단 (사내 폐쇄망)" s={s} />
            <Bullet text="사용량 기반 과금 없음 — 무제한 사용 가능" s={s} />
            <Bullet text="한국어 처리 우수 (Qwen2.5 다국어 벤치 상위)" s={s} />
            <Bullet text="모델 커스터마이징·파인튜닝 자유" s={s} />
            <Bullet text="자격증 Q&A 등 단순 도메인 품질 GPT-4o 수준" s={s} />
          </View>
          <View style={s.twoColCell}>
            <Text style={[s.twoColTitle, { color: "#DC2626" }]}>주의 사항</Text>
            <Bullet text="복잡 추론·코드는 GPT-4o 대비 약간 열세" s={s} />
            <Bullet text="GPU 인프라 필요 (H100 2~4장 수준)" s={s} />
            <Bullet text="모델 업데이트 주기 직접 관리" s={s} />
            <Bullet text="이미지 인식은 Qwen2.5-VL 별도 필요" s={s} />
            <Bullet text="단순·반복 Q&A에 최적, 복잡 분석엔 확인 필요" s={s} />
          </View>
        </View>

        {/* 블록 4: 3시간 커리큘럼 + 성과 지표 */}
        <Text style={s.sectionTitle}>④ 3시간 7세션 커리큘럼 + 기대 성과 지표</Text>
        <View style={{ marginBottom: 5 }}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeader, { width: "22%" }]}>세션</Text>
            <Text style={[s.tableHeader, { width: "22%" }]}>주제</Text>
            <Text style={[s.tableHeader, { flex: 1 }]}>핵심 내용 (초보자 기준)</Text>
          </View>
          {[
            ["세션 1 (25분)", "Alli 소개·왜 Qwen", "왜 Alli인가 · 다른 AI와 차이점 · Qwen 배경 · 대시보드 개요"],
            ["세션 2 (20분)", "대시보드 투어",      "3개 핵심 메뉴(지식베이스·앱관리·대화) 눈으로 익히기"],
            ["──  휴식 ──",   "",                   ""],
            ["세션 3 (25분)", "지식베이스 실습",    "Q&A CSV 업로드 · 문서 업로드 · 폴더·해시태그 설정"],
            ["세션 4 (40분)", "챗봇 제작 핵심",     "앱 생성 · 메시지 노드 · 답변 노드(Qwen-2.5-72B) · 중간 테스트"],
            ["──  휴식 ──",   "",                   ""],
            ["세션 5 (25분)", "조건 분기·담당자",   "AI 실패 시 담당자 자동 연결 · 2인 1조 체험"],
            ["세션 6 (15분)", "테스트·피드백",      "4가지 테스트 · 피드백 학습 · 할루시네이션 대응"],
            ["세션 7 (10분)", "마무리·Q&A",         "오늘 배운 것 정리 · 다음 단계 · Q&A"],
          ].map(([t, s2, k], i) => (
            <View key={i} style={[s.tableRow,
              t.includes("──") ? { backgroundColor: "#F3F4F6" } : i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[t.includes("──") ? s.tableCell : s.tableCellBold, { width: "22%" }]}>{t}</Text>
              <Text style={[s.tableCellBold, { width: "22%", color: A_MAIN }]}>{s2}</Text>
              <Text style={[s.tableCell, { flex: 1 }]}>{k}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {[
            ["챗봇 완성율",       "≥ 95%",   "교육 당일"],
            ["할루시네이션 인지율","≥ 90%",  "교육 당일"],
            ["현업 활용 시도율",  "≥ 70%",   "30일 후"],
            ["FAQ 자동화 건수",   "주 50건+","3개월 후"],
          ].map(([label, val, when]) => (
            <View key={label} style={{ flex: 1, backgroundColor: GRAY_50, borderRadius: 5, borderWidth: 1, borderColor: GRAY_200, padding: 5 }}>
              <Text style={{ fontSize: 6.5, color: GRAY_500, marginBottom: 2 }}>{label}</Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: A_MAIN, marginBottom: 1 }}>{val}</Text>
              <Text style={{ fontSize: 6, color: GRAY_400 }}>{when}</Text>
            </View>
          ))}
        </View>

        <Footer label="하나증권 인재개발 · Alli Works 3시간 첫 사용 가이드 교육 기획서 (1/1)" page={1} s={s} />
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT B — PPT 슬라이드 구성안 (28슬라이드, 초보자 눈높이)
// ═══════════════════════════════════════════════════════════════════════════════

function DocB() {
  const s = makeStyles(B_MAIN, B_LIGHT, B_TEXT);

  const slides: Array<{ id: string; section: string; title: string; bullets: string[]; tip?: string }> = [
    // ── 세션 1~2: 도입부 + 대시보드
    { id: "S-01", section: "표지", title: "Alli Works 3시간 첫 사용 가이드",
      bullets: ["하나증권 인재개발 | Alli Works 신규 도입 교육 | 2026",
        "Qwen-2.5-72B 사내 폐쇄망 · 자격증 Q&A 챗봇 실습 중심"],
      tip: "Alli Works 로고 + 하나증권 CI. 'AI 시대 첫 걸음' 분위기." },
    { id: "S-02", section: "오늘의 여정", title: "3시간 동안 이런 걸 만들게 됩니다",
      bullets: ["완성 목표: 자격증 Q&A 챗봇 — 질문하면 AI가 자동 답변, 모르면 담당자 연결",
        "세션 1~2: 왜 Alli인가 + 대시보드 한 바퀴",
        "세션 3~4: 지식베이스 만들기 + 챗봇 만들기",
        "세션 5~6: 조건 분기 + 테스트 + 피드백",
        "세션 7: 마무리 + Q&A"],
      tip: "왼쪽: 최종 완성 챗봇 스크린샷. 오른쪽: 3시간 타임라인." },
    { id: "S-03", section: "세션 1", title: "왜 Alli인가 — 기존 AI와 무엇이 다른가",
      bullets: ["ChatGPT·Claude·Gemini: 인터넷 지식 기반, 출처 불명확, 외부 서버 전송",
        "Alli Works: 사내 문서·Q&A 기반 답변 + 출처 원문 자동 링크",
        "Alli Works: AI 실패 시 담당자에게 자동 에스컬레이션",
        "Alli Works: 사내 폐쇄망 + Qwen 온프레미스 → 데이터 외부 전송 0건",
        "핵심 차이: '그럴듯한 답' vs '출처 있는 답'"],
      tip: "두 열 비교표. ChatGPT 열: 빨간 X. Alli 열: 초록 체크." },
    { id: "S-04", section: "세션 1", title: "Alli를 쓰면 실제로 뭐가 달라지나",
      bullets: ["사내 지식 검색: 15~30분 → 10초 이내 (RAG 즉시 매칭)",
        "FAQ 처리: 하루 수십 건 → 수백 건 (24시간 자동 답변)",
        "담당자 응답 대기: 수 시간 → 수 분 (자동 알림 + 이전 대화 전달)",
        "신규 인입 학습: 1주일 이상 → 당일 사내 Q&A 체험 가능",
        "→ 단순 문의 응답 시간을 AI에게 넘기고, 사람은 판단이 필요한 일에 집중"],
      tip: "Before/After 수치 비교. Before 빨강, After 초록. 숫자 크게." },
    { id: "S-05", section: "세션 1", title: "Alli도 틀릴 수 있습니다 — 할루시네이션 주의",
      bullets: ["RAG 기반이어도 검색 소스가 없거나 혼란스러우면 지어낼 수 있습니다",
        "증상: 자신 있는 어투로 틀린 수치·날짜·절차를 말함",
        "대응: 항상 '출처' 클릭 → 원문 확인 (Alli는 출처를 자동 표시)",
        "수치·날짜·자격증 합격 기준 → 반드시 원본 문서 대조",
        "Q&A 우선 매칭 → 문서 RAG 순으로 할루시네이션 확률 최소화"],
      tip: "경고 아이콘 강조. 출처 확인 UI 스크린샷 삽입." },
    { id: "S-06", section: "세션 1", title: "왜 Qwen-2.5-72B인가 — 사내 폐쇄망 모델",
      bullets: ["배경: Azure OpenAI 대신 오픈소스 모델을 사내 서버에 직접 배포",
        "이유 ①: 고객·직원 데이터가 외부로 나가지 않습니다",
        "이유 ②: 사용량 기반 API 과금 없음 — 얼마나 써도 추가 비용 없음",
        "이유 ③: 하나증권 자체 규정·모델 커스터마이징 가능",
        "이유 ④: 한국어 처리 우수 (글로벌 다국어 벤치 상위권)"],
      tip: "사내 서버 → Alli → 사용자 아키텍처 다이어그램. 외부 없음 강조." },
    { id: "S-07", section: "세션 1", title: "Qwen-2.5-72B 장단점 한눈에",
      bullets: ["장점: 데이터 완전 차단 · 과금 없음 · 한국어 강함 · 커스터마이징 자유",
        "자격증 Q&A·단순 FAQ 품질: GPT-4o와 동등~근접 수준",
        "단점: 복잡 추론·긴 코드 생성은 GPT-4o 대비 약간 열세",
        "단점: GPU 인프라 필요 (H100 2~4장) · 업데이트 직접 관리",
        "→ 사내 Q&A·챗봇 용도에는 최적 선택"],
      tip: "두 열 장단점 카드. 장점 초록, 단점 주황 배경." },
    { id: "S-08", section: "세션 2", title: "Alli 대시보드 한 바퀴 — 오늘 쓸 메뉴 딱 3개",
      bullets: ["app.allganize.ai 접속 → 교육용 프로젝트 선택",
        "① 지식베이스: 문서·Q&A 올리는 곳 (세션 3에서 실습)",
        "② 앱 관리: 챗봇 만드는 곳 (세션 4에서 실습)",
        "③ 대화: 실시간 대화 관리, 담당자 수락 (세션 5에서 실습)",
        "나머지 메뉴는 지금 볼 필요 없습니다. 3개만 기억하세요"],
      tip: "Alli 실제 화면 스크린샷. 3개 메뉴 빨간 박스 강조." },
    { id: "S-09", section: "세션 2", title: "화면 구성 이해하기 (처음 보는 분 기준)",
      bullets: ["좌측 사이드바: 메뉴 탐색 (지식베이스·앱 관리·대화·설정)",
        "중앙 화면: 작업 영역 (지식베이스 문서 목록, 앱 플로우 빌더 등)",
        "우측 패널: 설정 상세 또는 출처 표시",
        "처음엔 낯설어도 괜찮습니다. 오늘 실습하면서 자연스럽게 익힙니다",
        "모르면 손 들어주세요. 강사가 바로 도와드립니다"],
      tip: "화면 캡처 + 영역별 넘버링 주석." },

    // ── 세션 3~4: 지식베이스 + 챗봇 제작
    { id: "S-10", section: "세션 3", title: "지식베이스 = 챗봇의 뇌",
      bullets: ["지식베이스가 없으면 AI는 인터넷 지식으로만 답합니다",
        "지식베이스에 올린 사내 문서·Q&A를 기반으로 답변하게 됩니다",
        "두 가지 방법: ① Q&A 직접 입력 / CSV 업로드  ② 문서(PDF·Word·HWP) 업로드",
        "Q&A: 정확한 문장 그대로 매칭 (빠르고 정확)",
        "문서: RAG로 검색 (더 넓은 범위, 할루시네이션 주의)"],
      tip: "Q&A 박스 vs 문서 박스 비교 도식." },
    { id: "S-11", section: "세션 3", title: "Q&A 일괄 업로드 실습 — 30건 CSV",
      bullets: ["메뉴: 지식베이스 → Q&A → 일괄 업로드",
        "배포된 cert-qa-sample.csv 파일 업로드 (30건)",
        "CSV 형식: '질문' 열 / '답변' 열 두 개만 있으면 됩니다",
        "해시태그: #투자자문인력  #펀드투자상담사  #파생상품투자상담사",
        "★ 업로드 후 목록에서 30건 확인 필수"],
      tip: "CSV 형식 예시 스크린샷. 업로드 버튼 강조." },
    { id: "S-12", section: "세션 3", title: "문서 업로드 + 폴더 구조 만들기",
      bullets: ["메뉴: 지식베이스 → 문서 → 새 폴더 만들기",
        "폴더: 자격증 > 투자자문인력 / 펀드투자상담사 / 파생상품투자상담사",
        "각 폴더에 해당 자격증 문서 PDF 업로드",
        "해시태그 부여 + 접근 권한: '전체 직원'",
        "★ 처리 상태 '처리 완료' 확인 후 다음 단계 진행 (1~2분 소요)"],
      tip: "폴더 트리 구조 도식. 처리 완료 상태 아이콘 강조." },
    { id: "S-13", section: "세션 3", title: "해시태그로 답변 범위를 좁히세요",
      bullets: ["해시태그 없이 검색: 전체 지식베이스 탐색 → 느림 + 엉뚱한 답 가능성",
        "해시태그 지정: 해당 범위 문서만 검색 → 빠름 + 정확도 향상",
        "예시: 챗봇에서 자격증 폴더만 검색하도록 지정하면 다른 부서 문서 오염 없음",
        "나중에 부서별 챗봇 만들 때도 같은 원리 적용",
        "→ 지식베이스 구조를 잘 만들수록 챗봇 품질이 올라갑니다"],
      tip: "해시태그 범위 다이어그램. 전체 vs 지정 비교." },
    { id: "S-14", section: "세션 4", title: "자격증 Q&A 챗봇 만들기 시작 — 앱 생성",
      bullets: ["메뉴: 앱 관리 → + 새 앱 만들기 → 대화형 앱",
        "앱 이름: 자격증 Q&A 챗봇",
        "플로우 빌더 진입 → 캔버스 화면 보임",
        "Start 노드에서 연결선 드래그 → 첫 번째 노드 추가",
        "강사 멘트: '지금부터 우리가 코딩 없이 AI 챗봇을 만듭니다'"],
      tip: "플로우 빌더 빈 캔버스 스크린샷. Start 노드 강조." },
    { id: "S-15", section: "세션 4", title: "메시지 보내기 노드 — 첫 인사말",
      bullets: ["노드 추가 → 메시지 보내기 선택",
        "메시지 내용 입력: '안녕하세요, 인재개발실 자격증 Q&A 챗봇입니다. 금융자격증 관련 문의를 도와드리겠습니다.'",
        "이 메시지가 챗봇을 처음 열었을 때 첫 화면에 나타납니다",
        "나중에 수정 가능 — 지금은 일단 입력만 해주세요"],
      tip: "메시지 노드 설정 화면 스크린샷." },
    { id: "S-16", section: "세션 4", title: "답변 생성 노드 — 핵심 설정 (Qwen-2.5-72B)",
      bullets: ["노드 추가 → 답변 생성 선택",
        "질문 입력: ● 멤버 입력 (직접 질문 방식)",
        "기본 모델: Qwen-2.5-72B (사내 폐쇄망 모델 선택)",
        "검색 소스: ☑ 문서 (자격증 폴더 지정)  ☑ Q&A  ☐ 인터넷 검색",
        "답변 변수 저장: @TEXT  (다음 노드에서 이 변수 사용)"],
      tip: "답변 노드 설정 화면 캡처. 각 항목 빨간 박스. 모델명 강조." },
    { id: "S-17", section: "세션 4", title: "중간 테스트 — 지금까지 만든 챗봇 실행",
      bullets: ["저장 → 미리보기 또는 테스트 버튼 클릭",
        "질문 ①: '투자자문인력 시험 일정은 언제인가요?' → 정상 답변 + 출처 확인",
        "질문 ②: '펀드투자상담사 합격 기준은?' → 정상 답변 확인",
        "질문 ③: '파생상품투자상담사 자격 갱신은 어떻게 하나요?' → 확인",
        "★ 답변 옆 출처 링크 클릭 → 원문 내용 일치 확인 (할루시네이션 체크)"],
      tip: "챗봇 답변 + 출처 패널 스크린샷. 출처 클릭 동선 화살표." },

    // ── 세션 5~7: 조건 분기 + 테스트 + 마무리
    { id: "S-18", section: "세션 5", title: "AI가 모를 때 — 담당자 자동 연결의 원리",
      bullets: ["문제: AI가 모르면 '없습니다'라고 하거나 지어냅니다",
        "해결: 답변에 '없습니다' 포함 → 자동으로 담당자 연결 노드 실행",
        "조건 추가 노드: 변수 @TEXT 에 '없습니다' 포함 여부 판단",
        "참(TRUE): 담당 멤버 연결 노드로 이동",
        "거짓(FALSE): 일반 종료"],
      tip: "플로우 분기 도식. 두 갈래 화살표. 조건 판단 강조." },
    { id: "S-19", section: "세션 5", title: "조건 추가 노드 설정",
      bullets: ["노드 추가 → 조건 추가 선택",
        "변수: @TEXT",
        "연산자: contains (포함)",
        "값: '없습니다'",
        "결과: 참(TRUE) → 담당 멤버 연결 / 기타(FALSE) → 종료"],
      tip: "조건 노드 설정 화면 캡처. 각 필드 강조." },
    { id: "S-20", section: "세션 5", title: "담당 멤버 연결 노드 설정",
      bullets: ["노드 추가 → 담당 멤버 연결 선택",
        "대기 메시지: '담당자 연결 중입니다. 잠시만 기다려주세요.'",
        "담당 멤버: 교육생 2인 1조로 서로 지정 (실습용)",
        "이메일 알림 + 이전 대화 내역 전달: 활성화",
        "담당자는 별도 앱 없이 웹 브라우저에서 대화 수락 가능"],
      tip: "담당자 연결 노드 설정 화면." },
    { id: "S-21", section: "세션 5", title: "2인 1조 담당자 체험 — 역할 교대",
      bullets: ["A 역할(직원): '파생상품투자상담사 환불 규정 알려줘' 질문",
        "B 역할(담당자): 대시보드 → 대화 → 대기 중 탭 → [수락] 클릭",
        "이전 대화 내역 전체 확인 → 실시간 채팅 응답",
        "5분 후 역할 교대 반복",
        "★ '수락' 버튼 위치가 어디 있는지 직접 확인하는 게 핵심"],
      tip: "대화 탭 수락 버튼 스크린샷. 두 역할 동선 화살표." },
    { id: "S-22", section: "세션 6", title: "테스트 4종 — 정상 3개 + 실패 1개",
      bullets: ["테스트 ①: '투자자문인력 시험 일정은?' → 정상 답변 + 출처 확인",
        "테스트 ②: '펀드투자상담사 합격 기준은?' → 정상 답변 확인",
        "테스트 ③: '투자자문인력과 투자권유자문인력의 차이는?' → 복합 질의 확인",
        "테스트 ④ (실패): '파생상품투자상담사 환불 규정' → 담당자 연결 작동 확인",
        "★ 테스트 ④에서 대기 중 탭에 대화가 뜨는지 확인"],
      tip: "4개 테스트 결과 화면 2×2 배치." },
    { id: "S-23", section: "세션 6", title: "할루시네이션 발견 시 대응 3단계",
      bullets: ["STEP 1: 출처 링크 클릭 → 원문 내용과 AI 답변 비교",
        "STEP 2: 불일치 발견 → 해당 Q&A 수정 또는 문서 내용 보완",
        "STEP 3: 피드백 버튼(엄지 아래) 클릭 → AI 학습 반영",
        "운영 초기 1~2주 적극 피드백 → 정확도 빠르게 향상",
        "수치·날짜·합격 기준은 항상 원본 문서 대조 후 발송"],
      tip: "3단계 순서도. 출처 클릭 → 비교 → 피드백 동선." },
    { id: "S-24", section: "세션 6", title: "피드백으로 AI가 똑똑해집니다",
      bullets: ["엄지 위: '이 답변이 정확합니다' → 좋은 답변 강화",
        "엄지 아래: '이 답변이 부정확합니다' → 개선 대상 표시",
        "담당자가 Q&A에 추가 등록 → 다음부터는 AI가 직접 답변",
        "선순환: 담당자 답변 → Q&A 등록 → AI 답변 → 담당자 부담 감소",
        "3개월 후 정확도 80%+ 목표"],
      tip: "피드백 → 학습 → 개선 선순환 도식." },
    { id: "S-25", section: "세션 6", title: "초보자가 자주 하는 실수 5가지",
      bullets: ["실수 ①: 문서를 올렸는데 '처리 완료' 확인 안 하고 바로 테스트",
        "실수 ②: 검색 소스에서 자격증 폴더 지정 안 해서 전체 문서를 뒤짐 → 느림",
        "실수 ③: 답변 변수를 @TEXT로 저장 안 해서 조건 노드에서 오류",
        "실수 ④: 출처 확인 없이 AI 답변을 그대로 외부 발송",
        "실수 ⑤: 조건값 '없습니다' 앞뒤 공백 포함 → 조건 불일치"],
      tip: "실수 5개 카드. 각 실수 옆에 해결법 한 줄씩." },
    { id: "S-26", section: "세션 7", title: "오늘 우리가 만든 것 정리",
      bullets: ["4개 노드 챗봇: Start → 메시지 보내기 → 답변 생성 → 조건 추가 → [연결/종료]",
        "Qwen-2.5-72B 기반 사내 RAG 답변 (외부 전송 없음)",
        "자격증 Q&A 30건 + 문서 3종 → AI가 참조",
        "실패 시 담당자 자동 연결 → 이전 대화 내역 전달",
        "피드백 학습 → 점점 정확해지는 구조"],
      tip: "최종 플로우 4노드 도식. 완성 체크 분위기." },
    { id: "S-27", section: "세션 7", title: "다음 단계 — 더 발전시키기",
      bullets: ["에이전트형 앱: 여러 도구를 자율적으로 호출하는 고급 챗봇",
        "답변형 앱: 단순 Q&A 위젯 형태 (웹·앱 삽입 가능)",
        "딥 리서치: 복잡한 분석·보고서 자동 생성",
        "컴플라이언스 체커: 문서 검토 자동화",
        "부서별 챗봇 확장: WM·IB·S&T·백오피스 전용 챗봇 제작"],
      tip: "로드맵 형태 화살표. 오늘 위치 강조." },
    { id: "S-28", section: "마무리", title: "오늘의 3가지 기억 + Q&A",
      bullets: ["1️⃣ 출처 항상 확인 — Alli도 틀릴 수 있습니다. 원문 클릭 습관 필수",
        "2️⃣ 피드백 적극 활용 — 초기 1~2주 엄지 아래 클릭이 AI를 빠르게 개선",
        "3️⃣ 막히면 담당자 연결 — AI가 모르면 자동으로 사람에게 연결됩니다",
        "오늘 만든 챗봇: 계속 Q&A·문서 추가하면 바로 운영 가능",
        "문의: 인재개발실 (연락처 기입)"],
      tip: "3개 카드 임팩트 있게. 마무리 분위기. Q&A 시간 안내." },
  ];

  const pages: Array<typeof slides> = [];
  let cur: typeof slides = [];
  slides.forEach((sl, i) => {
    cur.push(sl);
    if (cur.length === 4 || i === slides.length - 1) { pages.push([...cur]); cur = []; }
  });

  return (
    <Document title="[B] Alli Works 3시간 교육 PPT 슬라이드 구성안" author="하나증권 인재개발">
      {/* 목차 페이지 */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBlock}>
          <Text style={s.headerBadge}>하나증권 인재개발 | PPT 제작 가이드</Text>
          <Text style={s.headerTitleLg}>Alli Works 3시간 교육{"\n"}PPT 슬라이드 구성안</Text>
          <Text style={s.headerSubLg}>슬라이드별 제목 · 핵심 불릿 · 디자인 힌트 | 총 28장 | 초보자 눈높이</Text>
          <View style={s.badgeRow}>
            <Text style={s.badge}>28 슬라이드</Text>
            <Text style={s.badge}>7세션 구성</Text>
            <Text style={s.badge}>Qwen-2.5-72B 반영</Text>
          </View>
        </View>
        <Text style={s.sectionTitle}>슬라이드 목록</Text>
        <View style={s.tableHeaderRow}>
          <Text style={[s.tableHeader, { width: "14%" }]}>번호</Text>
          <Text style={[s.tableHeader, { width: "20%" }]}>섹션</Text>
          <Text style={[s.tableHeader, { flex: 1 }]}>슬라이드 제목</Text>
        </View>
        {slides.map((sl, i) => (
          <View key={sl.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tableCellBold, { width: "14%", color: B_MAIN }]}>{sl.id}</Text>
            <Text style={[s.tableCell, { width: "20%" }]}>{sl.section}</Text>
            <Text style={[s.tableCell, { flex: 1 }]}>{sl.title}</Text>
          </View>
        ))}
        <Footer label="하나증권 인재개발 · Alli Works 3시간 교육 PPT 구성안" page={1} s={s} />
      </Page>

      {/* 슬라이드 상세 페이지 */}
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
          <Footer label="하나증권 인재개발 · Alli Works 3시간 교육 PPT 구성안" page={pi + 2} s={s} />
        </Page>
      ))}
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT C — 강의 대본 (3시간, 초보자 대상, Qwen 반영)
// ═══════════════════════════════════════════════════════════════════════════════

const ALLI_SCRIPT = [
  {
    label: "세션 1 (00:00–00:25)",
    title: "Alli 소개 + 왜 Qwen-2.5-72B인가",
    items: [
      { heading: "오프닝 00:00", lines: [
        "안녕하세요. 오늘 Alli Works를 처음 사용해보시는 분들을 위해 준비한 3시간 과정입니다.",
        "오늘 끝나면 여러분은 직접 AI 챗봇을 하나 만들게 됩니다. 코딩은 전혀 없습니다.",
        "모르는 게 당연합니다. 손 들어주시면 바로 도와드립니다.",
      ]},
      { heading: "왜 Alli인가 [S-03] 00:03", lines: [
        "ChatGPT나 Claude 써보신 분 계시죠? Alli Works는 그 도구들과 핵심적으로 다른 점이 있습니다.",
        "첫 번째: 답변 근거. ChatGPT는 인터넷 학습 데이터로 답합니다. Alli는 우리가 올린 사내 문서·Q&A로 답합니다.",
        "두 번째: 출처 표시. Alli는 어떤 문서를 근거로 답했는지 링크를 바로 보여줍니다.",
        "세 번째: AI가 모를 때. ChatGPT는 지어냅니다. Alli는 조건 분기로 담당자에게 자동 연결합니다.",
      ]},
      { heading: "도입 효과 수치 [S-04] 00:09", lines: [
        "사내 지식 검색: 지금은 평균 15~30분 걸립니다. Alli 도입 후 10초 이내로 줄어듭니다.",
        "FAQ 처리: 하루 수십 건을 수백 건으로. 24시간 자동 응답입니다.",
        "담당자 응답 대기: 수 시간에서 수 분으로. 알림과 이전 대화가 자동 전달됩니다.",
        "이 숫자들은 공용 AI가 아닌, Alli처럼 사내 문서 기반 RAG 챗봇을 운영한 사례에서 나온 수치입니다.",
      ]},
      { heading: "할루시네이션 주의 [S-05] 00:14", lines: [
        "중요한 점 하나 먼저 말씀드립니다. Alli도 틀릴 수 있습니다.",
        "RAG 기반이어도 검색 소스가 없거나 문서가 부정확하면 AI는 그럴듯하게 지어냅니다.",
        "그래서 Alli가 출처 링크를 자동으로 표시해줍니다. 중요한 답변은 반드시 그 링크 클릭해서 원문 확인해주세요.",
        "특히 수치·날짜·합격 기준은 원본 문서와 대조 후 사용하세요. 이게 오늘 교육에서 제일 중요한 습관입니다.",
      ]},
      { heading: "왜 Qwen-2.5-72B인가 [S-06,07] 00:19", lines: [
        "원래 Azure OpenAI GPT-4o를 사용했는데, 오늘부터 Qwen-2.5-72B로 바뀌었습니다.",
        "가장 큰 이유는 데이터입니다. Qwen은 우리 사내 서버에 설치되어 있어서 어떤 데이터도 외부로 나가지 않습니다.",
        "두 번째는 비용. API 과금이 없으니 얼마나 써도 추가 비용이 없습니다.",
        "자격증 Q&A 같은 단순 도메인 답변 품질은 GPT-4o와 크게 차이가 없습니다.",
        "단, 아주 복잡한 추론이나 코드 생성은 GPT-4o가 낫습니다. 오늘 우리가 하는 Q&A 용도에는 최적입니다.",
      ]},
    ],
  },
  {
    label: "세션 2 (00:25–00:45)",
    title: "대시보드 투어 — 오늘 쓸 메뉴 3개",
    items: [
      { heading: "접속 확인 00:25", lines: [
        "지금 각자 app.allganize.ai 접속해서 교육용 프로젝트를 선택해주세요.",
        "화면이 뜨면 손 들어주세요. 안 뜨면 바로 말씀해주세요.",
      ]},
      { heading: "메뉴 투어 [S-08,09] 00:28", lines: [
        "오늘 쓸 메뉴는 딱 3개입니다. 지식베이스, 앱 관리, 대화. 이것만 기억하세요.",
        "지식베이스: 챗봇이 참조할 문서와 Q&A를 올리는 곳입니다.",
        "앱 관리: 챗봇 자체를 만드는 곳입니다. 플로우 빌더가 있습니다.",
        "대화: 실제 대화가 들어오면 여기서 확인하고 담당자가 수락합니다.",
        "나머지 메뉴는 오늘 몰라도 됩니다. 세 개만 집중합니다.",
      ]},
    ],
  },
  {
    label: "세션 3 (00:55–01:20)",
    title: "지식베이스 실습 — Q&A + 문서 업로드",
    items: [
      { heading: "Q&A 업로드 [S-11] 00:55", lines: [
        "지식베이스 → Q&A → 일괄 업로드를 클릭합니다.",
        "제가 지금 배포하는 cert-qa-sample.csv 파일을 업로드해주세요. 30건 들어있습니다.",
        "업로드 후 목록에서 30건이 맞는지 확인해주세요.",
        "해시태그 세 개 넣어주세요: #투자자문인력 #펀드투자상담사 #파생상품투자상담사",
      ]},
      { heading: "문서 업로드 [S-12] 01:07", lines: [
        "이번엔 지식베이스 → 문서 → 새 폴더를 만들겠습니다.",
        "폴더 이름: 자격증. 그 아래에 투자자문인력, 펀드투자상담사, 파생상품투자상담사 세 폴더를 만드세요.",
        "각 폴더에 해당 PDF를 올려주세요. 해시태그 동일하게, 접근 권한은 전체 직원으로 설정.",
        "제일 중요한 것: 문서 상태가 '처리 완료'가 되어야 챗봇이 참조할 수 있습니다. 1~2분 기다린 후 확인해주세요.",
      ]},
      { heading: "해시태그 안내 [S-13] 01:15", lines: [
        "해시태그를 왜 쓰냐고 물어보실 수 있습니다.",
        "해시태그 없이 하면 AI가 전체 지식베이스를 다 뒤집니다. 느리고 엉뚱한 답이 나올 수 있어요.",
        "해시태그로 범위를 좁히면 자격증 문서만 검색하게 되어서 빠르고 정확합니다.",
      ]},
    ],
  },
  {
    label: "세션 4 (01:20–02:00)",
    title: "자격증 Q&A 챗봇 만들기 핵심 실습",
    items: [
      { heading: "앱 생성 [S-14] 01:20", lines: [
        "앱 관리 → 새 앱 만들기 → 대화형 앱을 선택합니다.",
        "앱 이름: 자격증 Q&A 챗봇. 만들기 클릭하면 플로우 빌더 캔버스가 나타납니다.",
        "Start 노드에서 연결선을 드래그해서 첫 번째 노드를 추가합니다.",
        "지금부터 코딩 없이 AI 챗봇을 조립하는 겁니다.",
      ]},
      { heading: "메시지 노드 [S-15] 01:22", lines: [
        "메시지 보내기 노드를 추가합니다.",
        "내용: '안녕하세요, 인재개발실입니다. 금융자격증 관련 문의를 도와드리겠습니다.'",
        "이게 챗봇을 처음 열었을 때 자동으로 나타나는 첫 메시지입니다.",
      ]},
      { heading: "답변 생성 노드 [S-16] 01:25", lines: [
        "다음으로 답변 생성 노드를 추가합니다. 이게 오늘 핵심입니다.",
        "질문 입력: 멤버 입력을 선택합니다. 사용자가 직접 입력한 질문을 받겠다는 뜻입니다.",
        "기본 모델: Qwen-2.5-72B를 선택해주세요. 사내 폐쇄망 모델입니다.",
        "검색 소스: 문서에 체크하고 자격증 폴더를 지정해주세요. Q&A에도 체크. 인터넷 검색은 체크 해제.",
        "답변 변수 저장: @TEXT 라고 입력합니다. 다음 노드에서 이 변수를 씁니다.",
        "★ 폴더를 지정 안 하면 전체 문서를 다 뒤집어서 느려집니다. 반드시 자격증 폴더 지정하세요.",
      ]},
      { heading: "중간 테스트 [S-17] 01:40", lines: [
        "저장하고 테스트 버튼을 눌러주세요.",
        "'투자자문인력 시험 일정은 언제인가요?' 질문해보세요. 정상 답변이 나오면 성공입니다.",
        "답변 옆에 출처 링크가 보이시나요? 그걸 클릭해서 원문 내용이 맞는지 확인해보세요. 이게 할루시네이션 체크입니다.",
        "두 개 더 해보세요: 펀드투자상담사 합격 기준, 파생상품투자상담사 자격 갱신.",
        "축하합니다. 2개 노드만으로 이미 동작하는 AI 챗봇이 만들어졌습니다.",
      ]},
    ],
  },
  {
    label: "세션 5 (02:10–02:35)",
    title: "조건 분기 + 담당자 연결 실습",
    items: [
      { heading: "조건 분기 설명 [S-18] 02:10", lines: [
        "이제 안전장치를 만들겠습니다. AI가 모르면 담당자에게 자동으로 연결하는 기능입니다.",
        "원리는 간단합니다. AI 답변에 '없습니다'라는 단어가 포함되면 조건이 참이 돼서 담당자 연결 노드로 이동합니다.",
      ]},
      { heading: "조건 노드 [S-19] 02:12", lines: [
        "조건 추가 노드를 추가합니다.",
        "변수: @TEXT  /  연산자: contains  /  값: '없습니다'",
        "참이면 담당 멤버 연결 노드로, 거짓이면 종료로 연결합니다.",
      ]},
      { heading: "담당자 노드 [S-20] 02:17", lines: [
        "담당 멤버 연결 노드를 추가합니다.",
        "대기 메시지: '담당자 연결 중입니다. 잠시만 기다려주세요.'",
        "옆 동료를 담당 멤버로 지정해주세요. 이메일 알림과 이전 대화 전달을 활성화합니다.",
      ]},
      { heading: "2인 1조 체험 [S-21] 02:22", lines: [
        "지금부터 2인 1조 실습입니다. 역할을 나눠주세요.",
        "A 역할: '파생상품투자상담사 환불 규정 알려줘'라고 질문합니다.",
        "B 역할: 대시보드 → 대화 → 대기 중 탭 → 수락 버튼을 클릭합니다.",
        "수락하면 이전 대화 내역이 전부 보입니다. 거기서 이어서 채팅하면 됩니다.",
        "5분 후 역할을 바꿔서 다시 해보세요.",
      ]},
    ],
  },
  {
    label: "세션 6 (02:35–02:50)",
    title: "테스트 4종 + 피드백 학습 + 할루시네이션 대응",
    items: [
      { heading: "테스트 4종 [S-22] 02:35", lines: [
        "테스트를 4가지 해봅니다.",
        "①: 투자자문인력 시험 일정 → 정상 답변 + 출처 확인",
        "②: 펀드투자상담사 합격 기준 → 정상 확인",
        "③: 투자자문인력과 투자권유자문인력 차이 → 복합 질의 확인",
        "④: 파생상품투자상담사 환불 규정 → 담당자 연결 노드 실행 확인",
      ]},
      { heading: "할루시네이션 대응 [S-23] 02:42", lines: [
        "혹시 답변이 이상한 것 같으면요? 세 단계를 기억하세요.",
        "첫 번째: 출처 링크 클릭해서 원문과 비교합니다.",
        "두 번째: 불일치면 Q&A를 수정하거나 문서 내용을 보완합니다.",
        "세 번째: 피드백 버튼을 클릭하면 AI가 학습합니다.",
        "운영 초기 1~2주에 피드백을 많이 해주실수록 AI가 빨리 좋아집니다.",
      ]},
    ],
  },
  {
    label: "세션 7 (02:50–03:00)",
    title: "마무리 + Q&A",
    items: [
      { heading: "오늘 만든 것 정리 [S-26] 02:50", lines: [
        "오늘 여러분은 4개 노드 챗봇을 직접 만들었습니다.",
        "Qwen-2.5-72B 기반으로 사내 문서·Q&A를 참조하는 RAG 챗봇.",
        "AI가 모르면 자동으로 담당자에게 연결되는 안전장치.",
        "이 구조를 계속 유지하면서 Q&A와 문서만 추가하면 바로 운영할 수 있습니다.",
      ]},
      { heading: "3가지 기억 [S-28] 02:55", lines: [
        "하나: 출처 항상 확인. Alli도 틀릴 수 있습니다. 원문 클릭 습관 필수.",
        "둘: 피드백 적극 활용. 초기 1~2주 엄지 아래 클릭이 AI를 빠르게 개선합니다.",
        "셋: 막히면 담당자 연결. 시스템이 자동으로 사람을 연결해줍니다.",
        "오늘 수고하셨습니다. Q&A 받겠습니다.",
      ]},
    ],
  },
];

const ALLI_QNA = [
  ["Alli가 ChatGPT랑 뭐가 다른 건가요?",
    "핵심 차이는 두 가지입니다. 첫째, 답변 근거: ChatGPT는 인터넷 학습 데이터로 답하고 출처가 불명확합니다. Alli는 우리가 올린 사내 문서·Q&A를 근거로 답하고 출처 링크를 자동 표시합니다. 둘째, 실패 대응: ChatGPT는 모르면 지어냅니다. Alli는 조건 분기로 담당자에게 자동 연결합니다."],
  ["Qwen이 GPT-4o보다 답변이 떨어지지 않나요?",
    "자격증 Q&A·FAQ 같은 단순 도메인에서는 GPT-4o와 동등~근접 수준입니다. Qwen-2.5-72B는 다국어 벤치에서 상위권이며 한국어 처리가 우수합니다. 단, 매우 복잡한 추론이나 긴 코드 생성은 GPT-4o가 낫습니다. 오늘 우리가 하는 Q&A 챗봇 용도에는 최적 선택입니다."],
  ["AI가 엉뚱한 답을 할 때는 어떻게 하나요?",
    "3단계로 대응하세요. 1단계: 출처 링크 클릭 → 원문과 비교. 2단계: 불일치 발견 시 해당 Q&A 수정 또는 문서 보완. 3단계: 피드백 버튼(엄지 아래) 클릭 → AI 학습 반영. 운영 초기 1~2주 적극 피드백하면 정확도가 빠르게 향상됩니다."],
  ["출처 확인은 어떻게 하나요?",
    "답변 옆 또는 하단에 출처 패널이 자동으로 표시됩니다. 해당 링크 또는 파일명을 클릭하면 원본 문서나 Q&A 내용을 바로 확인할 수 있습니다. 수치·날짜·자격증 합격 기준 등 중요 정보는 반드시 이 원문을 직접 확인한 후 사용하세요."],
  ["제가 만든 챗봇을 부서 동료에게 공유하려면요?",
    "앱 관리에서 해당 앱의 설정 → 공유·임베드 메뉴를 사용하세요. 링크 형태로 내부 공유하거나, 사내 인트라넷·슬랙 등에 삽입할 수 있습니다. 접근 권한을 전체 직원 또는 특정 그룹으로 지정할 수 있습니다."],
  ["Q&A와 문서 중 어디에 먼저 올려야 하나요?",
    "Q&A 우선을 권장합니다. Q&A는 정확한 문장 매칭으로 빠르고 정확한 답변을 제공합니다. 문서 RAG는 Q&A에 없는 내용을 보완하는 역할입니다. 자주 묻는 질문 30~50건을 Q&A에 먼저 올리고, 그 다음 관련 문서를 추가하는 순서를 권장합니다."],
  ["담당자가 모두 퇴근 상태면 어떻게 되나요?",
    "담당자 연결 노드에서 이메일 알림이 자동 발송됩니다. 담당자가 자리로 돌아왔을 때 알림을 확인하고 대화를 수락할 수 있습니다. 야간·주말 대응이 필요하다면 자동 메시지 노드를 추가해 '업무 시간 외 문의는 다음 날 처리됩니다' 안내를 자동 발송하도록 설정하세요."],
  ["실수로 민감한 정보가 담긴 문서를 업로드하면 어떻게 하나요?",
    "즉시 지식베이스 → 문서에서 해당 파일을 삭제하세요. 삭제 후 AI가 해당 내용을 참조하지 않습니다. Qwen이 사내 폐쇄망에서 실행되므로 외부로 전송된 내용은 없습니다. 단, 업로드 시점부터 삭제 전까지 챗봇이 해당 내용을 답변에 활용했을 수 있으므로 IT팀 또는 컴플라이언스팀에 즉시 보고하세요."],
];

function DocC() {
  const s = makeStyles(C_MAIN, C_LIGHT, C_TEXT);
  return (
    <Document title="[C] Alli Works 3시간 교육 강의 대본" author="하나증권 인재개발">
      {/* 표지 */}
      <Page size="A4" style={s.page}>
        <View style={s.headerBlock}>
          <Text style={s.headerBadge}>하나증권 인재개발 | 강사용 대본</Text>
          <Text style={s.headerTitleLg}>Alli Works 3시간 교육{"\n"}강의 대본</Text>
          <Text style={s.headerSubLg}>7세션 · 초보자 대상 · Qwen-2.5-72B 반영 · Q&A 8개 포함</Text>
          <View style={s.badgeRow}>
            <Text style={s.badge}>3시간 전체</Text>
            <Text style={s.badge}>세션별 구분</Text>
            <Text style={s.badge}>Q&A 8개</Text>
          </View>
        </View>
        <Text style={s.sectionTitle}>사용 방법</Text>
        <Bullet text="[시간] 표시: 교육 시작 기준 누적 시간 (예: 01:25 = 1시간 25분 경과)" s={s} />
        <Bullet text="[S-번호]: 해당 PPT 슬라이드 번호 (B 문서 참조)" s={s} />
        <Bullet text="그대로 읽는 대본이 아닙니다. 흐름을 익혀서 자연스럽게 말하세요." s={s} />
        <Bullet text="초보자 대상 — 전문 용어는 쉬운 말로 바꿔서 설명하세요." s={s} />
        <Bullet text="시간 부족 시: 세션 6 피드백 설명 축약 가능. 세션 4 답변 노드 설정은 반드시 유지." s={s} />

        <Text style={s.sectionTitle}>세션별 목차</Text>
        {ALLI_SCRIPT.map((sec) => (
          <View key={sec.label} style={s.bulletRow}>
            <Text style={s.bulletDot}>▶</Text>
            <Text style={[s.bulletText, { fontWeight: 700 }]}>{sec.label} — {sec.title}</Text>
          </View>
        ))}
        <Footer label="하나증권 인재개발 · Alli Works 3시간 교육 강의 대본" page={1} s={s} />
      </Page>

      {/* 세션별 대본 */}
      {ALLI_SCRIPT.map((sec, si) => (
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
          {(si === 1 || si === 3) && (
            <View style={[s.hlBox, { marginTop: 6 }]}>
              <Text style={s.hlLabel}>휴식 10분</Text>
              <Text style={s.hlText}>시계 확인 후 정시에 재개. 다음 세션 슬라이드와 실습 파일 미리 준비.</Text>
            </View>
          )}
          <Footer label="하나증권 인재개발 · Alli Works 3시간 교육 강의 대본" page={si + 2} s={s} />
        </Page>
      ))}

      {/* Q&A 페이지 */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Q&A 예상 질문 8개 — 초보자 질문 중심</Text>
        {ALLI_QNA.map(([q, a], i) => (
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
        <Footer label="하나증권 인재개발 · Alli Works 3시간 교육 강의 대본" page={ALLI_SCRIPT.length + 2} s={s} />
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Download infrastructure
// ═══════════════════════════════════════════════════════════════════════════════

type AlliDocKey = "A" | "B" | "C";

const ALLI_DOC_META: Record<AlliDocKey, { label: string; filename: string; color: string; hoverColor: string }> = {
  A: { label: "[A] 실장님 보고용 기획서", filename: "A_Alli3시간교육_기획서.pdf",   color: "bg-amber-600",  hoverColor: "hover:bg-amber-700"  },
  B: { label: "[B] PPT 슬라이드 구성안",  filename: "B_Alli3시간교육_PPT구성안.pdf", color: "bg-violet-600", hoverColor: "hover:bg-violet-700" },
  C: { label: "[C] 강의 대본",             filename: "C_Alli3시간교육_강의대본.pdf",  color: "bg-slate-700",  hoverColor: "hover:bg-slate-800"  },
};

function makeAlliBlob(key: AlliDocKey): Promise<Blob> {
  const doc = key === "A" ? <DocA /> : key === "B" ? <DocB /> : <DocC />;
  return pdf(doc).toBlob();
}

function AlliPDFBtn({ docKey }: { docKey: AlliDocKey }) {
  const [generating, setGenerating] = useState(false);
  const meta = ALLI_DOC_META[docKey];

  const handle = async () => {
    setGenerating(true);
    try {
      const blob = await makeAlliBlob(docKey);
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

export function AlliPDFButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <AlliPDFBtn docKey="A" />
      <AlliPDFBtn docKey="B" />
      <AlliPDFBtn docKey="C" />
    </div>
  );
}

export async function generateAlliPDF(key: AlliDocKey): Promise<Blob> {
  return makeAlliBlob(key);
}

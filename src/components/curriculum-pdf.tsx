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

// Register Noto Sans KR for Korean support (including italic variants to avoid resolve errors)
Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: "/fonts/NotoSansKR-Regular.ttf", fontWeight: 400, fontStyle: "normal" },
    { src: "/fonts/NotoSansKR-Regular.ttf", fontWeight: 400, fontStyle: "italic" },
    { src: "/fonts/NotoSansKR-Bold.ttf", fontWeight: 700, fontStyle: "normal" },
    { src: "/fonts/NotoSansKR-Bold.ttf", fontWeight: 700, fontStyle: "italic" },
  ],
});

// Disable font hyphenation
Font.registerHyphenationCallback((word) => [word]);

const INDIGO = "#4F46E5";
const INDIGO_LIGHT = "#EEF2FF";
const VIOLET = "#7C3AED";
const VIOLET_LIGHT = "#F5F3FF";
const GRAY_900 = "#111827";
const GRAY_700 = "#374151";
const GRAY_500 = "#6B7280";
const GRAY_200 = "#E5E7EB";
const AMBER = "#D97706";
const AMBER_LIGHT = "#FFFBEB";
const EMERALD = "#059669";
const EMERALD_LIGHT = "#ECFDF5";
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    backgroundColor: WHITE,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 44,
    fontSize: 9,
    color: GRAY_700,
    lineHeight: 1.6,
  },

  // ── Cover-style header ──────────────────────────────────────
  headerBlock: {
    backgroundColor: INDIGO,
    borderRadius: 8,
    padding: 20,
    marginBottom: 18,
  },
  headerOrg: {
    fontSize: 9,
    color: "#A5B4FC",
    marginBottom: 4,
    fontWeight: 400,
  },
  headerTitle: {
    fontSize: 18,
    color: WHITE,
    fontWeight: 700,
    lineHeight: 1.3,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 9,
    color: "#C7D2FE",
    fontWeight: 400,
  },
  headerBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 8,
    color: WHITE,
  },

  // ── Timeline bar ───────────────────────────────────────────
  timelineRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 18,
  },
  timelineItem: {
    flex: 1,
    backgroundColor: INDIGO_LIGHT,
    borderRadius: 5,
    padding: 6,
    borderTopWidth: 2,
    borderTopColor: INDIGO,
  },
  timelineTime: {
    fontSize: 7,
    color: INDIGO,
    fontWeight: 700,
  },
  timelineLabel: {
    fontSize: 7.5,
    color: GRAY_700,
    fontWeight: 400,
    marginTop: 1,
  },

  // ── Section heading ────────────────────────────────────────
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: INDIGO,
    borderBottomWidth: 1,
    borderBottomColor: INDIGO,
    paddingBottom: 4,
    marginBottom: 10,
    marginTop: 16,
  },

  // ── Target/Pre-condition box ────────────────────────────────
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  infoCell: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: GRAY_200,
    padding: 8,
  },
  infoCellLabel: {
    fontSize: 7.5,
    color: GRAY_500,
    fontWeight: 700,
    marginBottom: 2,
  },
  infoCellValue: {
    fontSize: 8.5,
    color: GRAY_900,
    fontWeight: 400,
  },

  // ── Timetable ─────────────────────────────────────────────
  table: {
    marginBottom: 14,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: INDIGO,
    borderRadius: 4,
    padding: 0,
    marginBottom: 2,
  },
  tableHeader: {
    color: WHITE,
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: "#F9FAFB",
  },
  tableCell: {
    fontSize: 8.5,
    color: GRAY_700,
  },
  tableCellBold: {
    fontSize: 8.5,
    color: GRAY_900,
    fontWeight: 700,
  },

  // ── Session cards ─────────────────────────────────────────
  sessionCard: {
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 6,
    marginBottom: 10,
    overflow: "hidden",
  },
  sessionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: VIOLET_LIGHT,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 8,
  },
  sessionBadge: {
    backgroundColor: VIOLET,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 7.5,
    color: WHITE,
    fontWeight: 700,
  },
  sessionCardTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: VIOLET,
    flex: 1,
  },
  sessionCardTime: {
    fontSize: 8,
    color: GRAY_500,
  },
  sessionCardBody: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sessionGoal: {
    fontSize: 8.5,
    color: GRAY_700,
    marginBottom: 6,
    fontStyle: "italic",
  },

  // ── Sub-section inside session ─────────────────────────────
  subSection: {
    marginBottom: 7,
  },
  subSectionTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: GRAY_900,
    marginBottom: 3,
  },

  // ── Bullet list ────────────────────────────────────────────
  bulletRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 2,
  },
  bulletDot: {
    fontSize: 8,
    color: INDIGO,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 8.5,
    color: GRAY_700,
    flex: 1,
  },
  bulletBold: {
    fontSize: 8.5,
    color: GRAY_900,
    fontWeight: 700,
  },

  // ── Highlight boxes ────────────────────────────────────────
  mentorBox: {
    backgroundColor: AMBER_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: AMBER,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginVertical: 4,
  },
  mentorLabel: {
    fontSize: 7.5,
    color: AMBER,
    fontWeight: 700,
    marginBottom: 2,
  },
  mentorText: {
    fontSize: 8,
    color: "#92400E",
  },
  tipBox: {
    backgroundColor: EMERALD_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: EMERALD,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginVertical: 4,
  },
  tipLabel: {
    fontSize: 7.5,
    color: EMERALD,
    fontWeight: 700,
    marginBottom: 2,
  },
  tipText: {
    fontSize: 8,
    color: "#065F46",
  },

  // ── Settings table (for node config) ──────────────────────
  settingsTable: {
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 4,
    marginVertical: 4,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  settingsRowLast: {
    flexDirection: "row",
  },
  settingsKey: {
    width: "35%",
    backgroundColor: "#F9FAFB",
    fontSize: 8,
    fontWeight: 700,
    color: GRAY_700,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: GRAY_200,
  },
  settingsValue: {
    flex: 1,
    fontSize: 8,
    color: GRAY_700,
    paddingVertical: 4,
    paddingHorizontal: 7,
  },
  settingsValueBold: {
    flex: 1,
    fontSize: 8,
    fontWeight: 700,
    color: INDIGO,
    paddingVertical: 4,
    paddingHorizontal: 7,
  },

  // ── Checklist ─────────────────────────────────────────────
  checklistCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: GRAY_200,
    padding: 12,
    marginBottom: 14,
  },
  checkRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  checkBox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: GRAY_500,
    borderRadius: 2,
    marginTop: 1,
  },
  checkText: {
    fontSize: 8.5,
    color: GRAY_700,
    flex: 1,
  },

  // ── Footer ────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    paddingTop: 6,
  },
  footerLeft: {
    fontSize: 7.5,
    color: GRAY_500,
  },
  footerRight: {
    fontSize: 7.5,
    color: GRAY_500,
  },
});

// ── Reusable sub-components ──────────────────────────────────

function Bullet({ children, bold }: { children: string; bold?: boolean }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={bold ? styles.bulletBold : styles.bulletText}>{children}</Text>
    </View>
  );
}

function PageFooter({ pageNum }: { pageNum: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerLeft}>하나증권 인재개발실 · Alli Works 교육 강의안</Text>
      <Text style={styles.footerRight}>{pageNum}</Text>
    </View>
  );
}

// ── Main PDF Document ────────────────────────────────────────

function CurriculumDocument() {
  return (
    <Document title="Alli Works 3시간 교육 강의안" author="하나증권 인재개발실">

      {/* ===== PAGE 1: Cover + Overview ===== */}
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.headerOrg}>하나증권 인재개발실</Text>
          <Text style={styles.headerTitle}>Alli Works{"\n"}3시간 교육 강의안</Text>
          <Text style={styles.headerSubtitle}>자격증 Q&A 챗봇 실습 중심 · 이론 + 핸즈온</Text>
          <View style={styles.headerBadgeRow}>
            <Text style={styles.headerBadge}>총 180분</Text>
            <Text style={styles.headerBadge}>10~20명</Text>
            <Text style={styles.headerBadge}>7개 세션</Text>
            <Text style={styles.headerBadge}>Alli Works (alli.ai)</Text>
          </View>
        </View>

        {/* Session timeline */}
        <View style={styles.timelineRow}>
          {[
            ["00:00", "소개"],
            ["00:25", "대시보드"],
            ["00:55", "지식베이스"],
            ["01:20", "챗봇 제작"],
            ["02:10", "조건+담당자"],
            ["02:35", "테스트"],
            ["02:50", "마무리"],
          ].map(([t, l]) => (
            <View key={t} style={styles.timelineItem}>
              <Text style={styles.timelineTime}>{t}</Text>
              <Text style={styles.timelineLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Target / Prerequisites */}
        <Text style={styles.sectionTitle}>대상 및 전제 조건</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>대상</Text>
            <Text style={styles.infoCellValue}>하나증권 AI 도입 초기 실무 담당자 (비개발자 포함)</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>인원</Text>
            <Text style={styles.infoCellValue}>10~20명</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>사전 준비</Text>
            <Text style={styles.infoCellValue}>Alli Works 계정 발급, Azure OpenAI 연동, 교육용 프로젝트 생성</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>강사 준비물</Text>
            <Text style={styles.infoCellValue}>완성된 데모 앱 1개, cert-qa-sample.csv, 자격증 문서 3종</Text>
          </View>
        </View>

        {/* Timetable */}
        <Text style={styles.sectionTitle}>전체 타임테이블</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeader, { width: "25%" }]}>시간</Text>
            <Text style={[styles.tableHeader, { flex: 1 }]}>세션</Text>
            <Text style={[styles.tableHeader, { width: "18%" }]}>형식</Text>
            <Text style={[styles.tableHeader, { width: "10%" }]}>분</Text>
          </View>
          {[
            ["00:00~00:25", "1. Alli Works 소개 & 왜 Azure?", "이론", "25"],
            ["00:25~00:45", "2. 대시보드 둘러보기", "데모", "20"],
            ["00:45~00:55", "── 휴식 ──", "", "10"],
            ["00:55~01:20", "3. 지식베이스 실습", "핸즈온", "25"],
            ["01:20~02:00", "4. 자격증 Q&A 챗봇 만들기 (핵심)", "핸즈온", "40"],
            ["02:00~02:10", "── 휴식 ──", "", "10"],
            ["02:10~02:35", "5. 조건 분기 & 담당자 연결 실습", "핸즈온", "25"],
            ["02:35~02:50", "6. 테스트 & 피드백 학습", "핸즈온", "15"],
            ["02:50~03:00", "7. 마무리 & Q&A", "Q&A", "10"],
          ].map(([time, session, format, mins], i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { width: "25%" }]}>{time}</Text>
              <Text style={[session.includes("──") ? styles.tableCell : styles.tableCellBold, { flex: 1 }]}>
                {session}
              </Text>
              <Text style={[styles.tableCell, { width: "18%", color: format === "핸즈온" ? VIOLET : GRAY_500 }]}>
                {format}
              </Text>
              <Text style={[styles.tableCellBold, { width: "10%" }]}>{mins}</Text>
            </View>
          ))}
        </View>

        <PageFooter pageNum={1} />
      </Page>

      {/* ===== PAGE 2: Session 1 & 2 ===== */}
      <Page size="A4" style={styles.page}>

        {/* Session 1 */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionCardHeader}>
            <Text style={styles.sessionBadge}>세션 1</Text>
            <Text style={styles.sessionCardTitle}>Alli Works 소개 & 왜 Azure인가?</Text>
            <Text style={styles.sessionCardTime}>00:00~00:25 (25분)</Text>
          </View>
          <View style={styles.sessionCardBody}>
            <Text style={styles.sessionGoal}>목표: "이 도구가 뭔지, 왜 Azure를 쓰는지" 이해</Text>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>1-1. Alli Works란? (10분)</Text>
              <Bullet>Allganize의 기업용 AI 플랫폼</Bullet>
              <Bullet>핵심 가치: 사내 문서를 AI에 연결해 챗봇/에이전트/답변 앱을 코딩 없이 제작</Bullet>
              <Bullet>3가지 앱 타입: 대화형 앱(오늘 실습) / 에이전트형 앱(데모) / 답변형 앱(소개)</Bullet>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>1-2. 왜 Azure OpenAI인가? (8분)</Text>
              <View style={styles.mentorBox}>
                <Text style={styles.mentorLabel}>강사 멘트</Text>
                <Text style={styles.mentorText}>"GPT-4o 모델 자체는 OpenAI 직접 쓰든 Azure로 쓰든 동일한 성능입니다"</Text>
              </View>
              <Bullet bold>데이터 보안: 고객/직원 데이터가 OpenAI 학습에 사용되지 않음</Bullet>
              <Bullet bold>금융보안원 규정: Korea Central 리전 활용, 클라우드 이용 가이드라인 충족</Bullet>
              <Bullet bold>감사 추적: 엔터프라이즈급 로깅/모니터링으로 규제 대응</Bullet>
              <Bullet>기능 차이 없음: 인터넷 검색, RAG, 딥 리서치, 에이전트 모두 동일</Bullet>
              <Bullet>유일한 차이: 최신 모델 출시가 1~3개월 늦을 수 있음 (현재 GPT-4o는 동일)</Bullet>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>1-3. 오늘 만들 것 미리보기 (7분)</Text>
              <Bullet>완성된 "자격증 Q&A 챗봇" 라이브 데모 시연</Bullet>
              <Bullet>정상 답변: "투자자문인력 시험 일정은?" → AI 자동 답변</Bullet>
              <Bullet>실패 → 담당자 연결: "파생상품투자상담사 환불 규정" → 조건 분기 → 담당자 연결</Bullet>
              <Bullet>4개 노드 구성도: Start → 메시지 보내기 → 답변 생성 → 조건 추가 → [담당자/종료]</Bullet>
            </View>
          </View>
        </View>

        {/* Session 2 */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionCardHeader}>
            <Text style={styles.sessionBadge}>세션 2</Text>
            <Text style={styles.sessionCardTitle}>대시보드 둘러보기</Text>
            <Text style={styles.sessionCardTime}>00:25~00:45 (20분)</Text>
          </View>
          <View style={styles.sessionCardBody}>
            <Text style={styles.sessionGoal}>목표: Alli 대시보드 주요 메뉴를 눈으로 익히기</Text>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>2-1. 함께 접속 (5분)</Text>
              <Bullet>각자 app.allganize.ai 접속 → 교육용 프로젝트 선택</Bullet>
              <Bullet>화면 구조: 좌측 사이드바 / 중앙 대화 / 우측 출처 패널</Bullet>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>2-2. 주요 메뉴 훑기 (15분)</Text>
              <View style={styles.settingsTable}>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsKey}>앱 관리</Text>
                  <Text style={styles.settingsValue}>대화형/에이전트/답변형 앱 목록 → 세션 4에서 앱 생성</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsKey}>{"지식베이스 > 문서"}</Text>
                  <Text style={styles.settingsValue}>공용/개인 문서함, 폴더 구조 → 세션 3에서 업로드</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsKey}>{"지식베이스 > Q&A"}</Text>
                  <Text style={styles.settingsValue}>FAQ 등록/일괄 업로드 → 세션 3에서 CSV 업로드</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsKey}>대화</Text>
                  <Text style={styles.settingsValue}>실시간 채팅 관리 (대기/진행/완료) → 세션 5에서 담당자 수락</Text>
                </View>
                <View style={styles.settingsRowLast}>
                  <Text style={styles.settingsKey}>{"설정 > 멤버/그룹"}</Text>
                  <Text style={styles.settingsValue}>팀/담당자 관리 → 세션 5에서 담당자 지정</Text>
                </View>
              </View>
              <View style={styles.tipBox}>
                <Text style={styles.tipLabel}>포인트</Text>
                <Text style={styles.tipText}>"오늘 쓸 메뉴는 딱 3개: 지식베이스, 앱 관리, 대화"</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: GRAY_200, height: 1, marginVertical: 8 }} />
        <Text style={{ fontSize: 8.5, color: GRAY_500, textAlign: "center" }}>── 휴식 10분 (00:45~00:55) ──</Text>

        <PageFooter pageNum={2} />
      </Page>

      {/* ===== PAGE 3: Session 3 & 4 ===== */}
      <Page size="A4" style={styles.page}>

        {/* Session 3 */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionCardHeader}>
            <Text style={styles.sessionBadge}>세션 3</Text>
            <Text style={styles.sessionCardTitle}>지식베이스 실습</Text>
            <Text style={styles.sessionCardTime}>00:55~01:20 (25분)</Text>
          </View>
          <View style={styles.sessionCardBody}>
            <Text style={styles.sessionGoal}>목표: 챗봇이 참조할 데이터를 직접 올려보기</Text>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>{"3-1. Q&A 일괄 업로드 (10분)"}</Text>
              <Bullet bold>{"메뉴: 지식베이스 > Q&A > 일괄 업로드"}</Bullet>
              <Bullet>제공된 cert-qa-sample.csv 파일 업로드 (30건)</Bullet>
              <Bullet>CSV 형식: "질문","답변" 두 열로 구성</Bullet>
              <Bullet>해시태그 부여: #투자자문인력 #펀드투자상담사 #파생상품투자상담사</Bullet>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>3-2. 문서 업로드 (15분)</Text>
              <Bullet bold>{"메뉴: 지식베이스 > 문서 > 새 폴더 > 업로드"}</Bullet>
              <Bullet>{"폴더 구조: 자격증 > 투자자문인력, 펀드투자상담사, 파생상품투자상담사"}</Bullet>
              <Bullet>해시태그 부여, 접근 권한: "전체 직원" 설정</Bullet>
              <View style={styles.tipBox}>
                <Text style={styles.tipLabel}>체크포인트</Text>
                <Text style={styles.tipText}>문서 상태가 "처리 완료"인지 반드시 확인 (1~2분 소요)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Session 4 */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionCardHeader}>
            <Text style={styles.sessionBadge}>세션 4</Text>
            <Text style={styles.sessionCardTitle}>자격증 Q&A 챗봇 만들기 — 핵심 실습</Text>
            <Text style={styles.sessionCardTime}>01:20~02:00 (40분)</Text>
          </View>
          <View style={styles.sessionCardBody}>
            <Text style={styles.sessionGoal}>목표: 4개 노드로 동작하는 챗봇을 직접 완성</Text>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>4-1. 앱 생성 & 메시지 보내기 노드 (10분)</Text>
              <Bullet bold>{"앱 관리 > + 새 앱 만들기 > 대화형 앱"}</Bullet>
              <Bullet>앱 이름: 자격증 Q&A 챗봇</Bullet>
              <Bullet>플로우 빌더 진입 → Start 노드에서 연결선 드래그</Bullet>
              <Bullet>메시지 내용: "안녕하세요, 인재개발실입니다. 금융자격증 관련 문의를 도와드리겠습니다."</Bullet>
              <View style={styles.mentorBox}>
                <Text style={styles.mentorLabel}>강사 멘트</Text>
                <Text style={styles.mentorText}>"지금부터 우리가 만드는 건 진짜 AI 챗봇입니다. 코드 한 줄도 안 씁니다."</Text>
              </View>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>4-2. 답변 생성 노드 설정 — 가장 중요! (20분)</Text>
              <View style={styles.settingsTable}>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsKey}>질문 입력</Text>
                  <Text style={styles.settingsValue}>● 멤버 입력 (직접 질문)</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsKey}>기본 모델</Text>
                  <Text style={styles.settingsValueBold}>AZURE GPT-4o</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsKey}>에이전트</Text>
                  <Text style={styles.settingsValue}>기본 RAG</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsKey}>검색 소스</Text>
                  <Text style={styles.settingsValueBold}>☑ 문서 (자격증 폴더 지정), ☑ Q&A, ☐ 인터넷</Text>
                </View>
                <View style={styles.settingsRowLast}>
                  <Text style={styles.settingsKey}>답변 변수 저장</Text>
                  <Text style={styles.settingsValueBold}>@TEXT</Text>
                </View>
              </View>
              <View style={styles.tipBox}>
                <Text style={styles.tipLabel}>강사 팁</Text>
                <Text style={styles.tipText}>{"검색 소스 > 문서를 반드시 펼쳐서 '자격증' 폴더를 지정하세요. 안 하면 전체 문서를 뒤져서 느려집니다."}</Text>
              </View>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>4-3. 중간 테스트 (10분)</Text>
              <Bullet>"투자자문인력 시험 일정은 언제인가요?" → 정상 답변 확인</Bullet>
              <Bullet>"펀드투자상담사 합격 기준은?" → 정상 답변 확인</Bullet>
              <Bullet>"파생상품투자상담사 자격 갱신은 어떻게?" → 정상 답변 확인</Bullet>
              <View style={styles.mentorBox}>
                <Text style={styles.mentorLabel}>강사 멘트</Text>
                <Text style={styles.mentorText}>"2개 노드만으로 이미 동작하는 AI 챗봇이 만들어졌습니다. 이제 AI가 모를 때를 대비한 안전장치를 만듭니다."</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: GRAY_200, height: 1, marginVertical: 8 }} />
        <Text style={{ fontSize: 8.5, color: GRAY_500, textAlign: "center" }}>── 휴식 10분 (02:00~02:10) ──</Text>

        <PageFooter pageNum={3} />
      </Page>

      {/* ===== PAGE 4: Session 5, 6, 7 + Checklist ===== */}
      <Page size="A4" style={styles.page}>

        {/* Session 5 */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionCardHeader}>
            <Text style={styles.sessionBadge}>세션 5</Text>
            <Text style={styles.sessionCardTitle}>조건 분기 & 담당자 연결 실습</Text>
            <Text style={styles.sessionCardTime}>02:10~02:35 (25분)</Text>
          </View>
          <View style={styles.sessionCardBody}>
            <Text style={styles.sessionGoal}>목표: AI가 답변 실패하면 사람에게 자동 연결하는 안전장치 구축</Text>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>5-1. 조건 추가 노드 (10분)</Text>
              <View style={styles.settingsTable}>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsKey}>변수</Text>
                  <Text style={styles.settingsValueBold}>@TEXT</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsKey}>연산자</Text>
                  <Text style={styles.settingsValue}>contains</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsKey}>값</Text>
                  <Text style={styles.settingsValueBold}>"없습니다"</Text>
                </View>
                <View style={styles.settingsRowLast}>
                  <Text style={styles.settingsKey}>결과</Text>
                  <Text style={styles.settingsValue}>참 → 담당 멤버 연결 / 기타 → 정상 종료</Text>
                </View>
              </View>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>5-2. 담당 멤버 연결 노드 (10분)</Text>
              <Bullet>연결 방식: 내부 메시지 발송 후 담당 멤버와 채팅 연결</Bullet>
              <Bullet bold>담당 멤버: 교육생 2인 1조로 서로 지정 (실습)</Bullet>
              <Bullet>대기 메시지: "담당자 연결 중입니다. 잠시만 기다려주세요."</Bullet>
              <Bullet>이메일 알림 + 대화 내역 전달: 활성화</Bullet>
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>5-3. 담당자 역할 체험 — 2인 1조 실습 (5분)</Text>
              <Bullet bold>A역할(직원): "파생상품투자상담사 환불 규정 알려줘" 질문</Bullet>
              <Bullet bold>{"B역할(담당자): 대시보드 > 대화 > 대기 중 탭에서 [수락] 클릭"}</Bullet>
              <Bullet>이전 대화 전체 확인 후 실시간 채팅 → 역할 교대 반복</Bullet>
              <View style={styles.mentorBox}>
                <Text style={styles.mentorLabel}>강사 멘트</Text>
                <Text style={styles.mentorText}>"담당자는 별도 앱 없이 웹 브라우저로 수락하고 채팅할 수 있습니다. 야간/주말에는 자동 메시지가 나갑니다."</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Session 6 */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionCardHeader}>
            <Text style={styles.sessionBadge}>세션 6</Text>
            <Text style={styles.sessionCardTitle}>테스트 & 피드백 학습</Text>
            <Text style={styles.sessionCardTime}>02:35~02:50 (15분)</Text>
          </View>
          <View style={styles.sessionCardBody}>
            <View style={styles.settingsTable}>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsKey}>테스트 1</Text>
                <Text style={styles.settingsValue}>"투자자문인력 시험 일정은?" → 정상 답변 + 출처 문서</Text>
              </View>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsKey}>테스트 2</Text>
                <Text style={styles.settingsValue}>"펀드투자상담사 합격 기준은?" → 정상 답변</Text>
              </View>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsKey}>테스트 3</Text>
                <Text style={styles.settingsValue}>"투자자문인력과 투자권유자문인력의 차이는?" → 복합 질의</Text>
              </View>
              <View style={styles.settingsRowLast}>
                <Text style={styles.settingsKey}>실패 테스트</Text>
                <Text style={styles.settingsValue}>"파생상품투자상담사 환불 규정" → 담당자 연결 동작 확인</Text>
              </View>
            </View>
            <View style={styles.tipBox}>
              <Text style={styles.tipLabel}>강사 멘트</Text>
              <Text style={styles.tipText}>"피드백이 쌓이면 AI가 점점 똑똑해집니다. 운영 초기 1~2주 적극 피드백하면 정확도가 확 올라갑니다."</Text>
            </View>
          </View>
        </View>

        {/* Session 7 */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionCardHeader}>
            <Text style={styles.sessionBadge}>세션 7</Text>
            <Text style={styles.sessionCardTitle}>마무리 & Q&A</Text>
            <Text style={styles.sessionCardTime}>02:50~03:00 (10분)</Text>
          </View>
          <View style={styles.sessionCardBody}>
            <Bullet bold>오늘 만든 것: 4개 노드 · AI 자동 답변 + 실패 시 사람 연결 · Azure GPT-4o 보안 충족</Bullet>
            <Bullet>Q&A/문서 계속 추가 → 정확도 향상 / 담당자 답변 → Q&A 재등록 → 지식 선순환</Bullet>
            <Bullet>다음 단계: 에이전트형 앱 · 딥 리서치 · 컴플라이언스 체커</Bullet>
          </View>
        </View>

        {/* Checklist */}
        <Text style={styles.sectionTitle}>강사 준비 체크리스트</Text>
        <View style={styles.checklistCard}>
          {[
            "교육생 전원 Alli Works 계정 발급 및 접속 확인",
            "교육용 프로젝트에 Azure GPT-4o 모델 연동 확인",
            "완성된 자격증 Q&A 챗봇 데모 앱 1개 준비 (세션 1 데모용)",
            "cert-qa-sample.csv (30건) USB/공유폴더로 배포 준비",
            "자격증 문서 3종 (투자자문인력/펀드투자상담사/파생상품투자상담사) 배포 준비",
            "2인 1조 편성 (세션 5 담당자 체험용)",
            "Wi-Fi / 네트워크 사전 테스트",
            "빔프로젝터 또는 화면 공유 도구 준비",
          ].map((item, i) => (
            <View key={i} style={styles.checkRow}>
              <View style={styles.checkBox} />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>

        <PageFooter pageNum={4} />
      </Page>

    </Document>
  );
}

// ── Download button component ─────────────────────────────────

export function PDFDownloadButton() {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(<CurriculumDocument />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AlliWorks_3시간_교육_강의안.pdf";
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
      onClick={handleDownload}
      disabled={generating}
      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
    >
      {generating ? (
        <>
          <Loader2 size={15} className="animate-spin" />
          PDF 생성 중...
        </>
      ) : (
        <>
          <Download size={15} />
          PDF 다운로드
        </>
      )}
    </button>
  );
}

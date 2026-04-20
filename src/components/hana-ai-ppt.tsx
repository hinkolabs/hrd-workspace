"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

// ── Color palette ──────────────────────────────────────────────────────────────
const EMERALD  = "059669";
const EMERALD_D = "065F46";
const RED      = "DC2626";
const ORANGE   = "D97706";
const BLUE     = "2563EB";
const GRAY_900 = "111827";
const GRAY_700 = "374151";
const GRAY_500 = "6B7280";
const GRAY_50  = "F9FAFB";
const WHITE    = "FFFFFF";

// ── Section banner colors per period ──────────────────────────────────────────
const PERIOD_COLORS: Record<string, string> = {
  "1교시": RED,
  "2교시": ORANGE,
  "3교시": BLUE,
  "4교시": EMERALD,
  "5교시": GRAY_700,
  "표지": EMERALD_D,
  "공통": GRAY_900,
};

// ── Slide data ─────────────────────────────────────────────────────────────────
interface Slide {
  id: string;
  period: string;
  title: string;
  bullets: string[];
  tip?: string;
  accent?: string;
}

const SLIDES: Slide[] = [
  // ── Cover & Roadmap
  {
    id: "S-01", period: "표지",
    title: "증권사에서 안전하게 AI를 일에 끼워넣는 법",
    bullets: [
      "하나증권 신입사원 AI 리터러시 교육  |  2026",
      "ChatGPT · Claude · Gemini  무료 AI 실전 활용",
      "이론 20% · 실전 사례·실습 80%",
    ],
    tip: "하나증권 브랜드 컬러 적용. 임팩트 있는 단일 제목으로 승부.",
  },
  {
    id: "S-02", period: "공통",
    title: "오늘의 여정 — 5교시 타임라인",
    bullets: [
      "1교시: AI 왜 써야 하나 — 경쟁사·하나증권 전략 + AI 5대 작동원리 + Before/After",
      "2교시: 3대 레드라인 + 케이스 퀴즈 15문항",
      "3교시: ChatGPT·Claude·Gemini 무료 3종 라이브 비교 시연",
      "4교시: 부서별 활용 플레이북 (WM·IB·S&T·리서치·리테일·백오피스)",
      "5교시: 핸즈온 실습 2트랙 + 조별 발표 + Q&A",
    ],
    tip: "수평 타임라인 5단계, 이론 20% · 실전 80% 비율 표기.",
  },

  // ── 1교시: AI 왜 써야 하나
  {
    id: "S-03", period: "1교시",
    title: "경쟁사는 지금 어디까지 왔나",
    bullets: [
      "KB증권: M365 Copilot 전사 도입 · AI 혁신서비스 지정 업계 최다 7건",
      "미래에셋: 자체 sLLM 'AI Assistant 플랫폼' 전사 운영 · 로보어드바이저 1위",
      "NH투자: AI 전담조직 20명 · 차트분석 AI '차분이' (금융권 최초 이미지 인식)",
      "신한투자: AI솔루션부 신설 · '챗프로' 사내 업무 자동화 운영 중",
      "IBK투자: 금융특화 sLLM 'OLA-F' 내재화 · 직원 AI 실무 교육 2회 완료",
    ],
    tip: "카드 5개 좌→우 배치. 각 증권사 색상 구분.",
  },
  {
    id: "S-04", period: "1교시",
    title: "하나증권 2026년 4대 핵심전략",
    bullets: [
      "전략 1: 발행어음 기반 생산적 금융 확대 (모험자본)",
      "전략 2: 디지털자산(STO) 전환",
      "전략 3 ★: AI 중심 사업·업무 재설계 — 의사결정·실행 고도화  ← 오늘 교육의 근거",
      "전략 4: 부문별 혁신 — WM 초개인화 · IB ONE IB · S&T 아시아 진출",
      "함영주 회장: '다음 승부는 스테이블코인과 AI'",
    ],
    tip: "전략 3을 하나증권 초록 계열로 강조. 4분할 카드 레이아웃.",
  },
  {
    id: "S-05", period: "1교시",
    title: "하나증권 AI 실전 사례: 공포탐욕시그널",
    bullets: [
      "업계 최초 자체 AI 모델 기반 종목별 심리지수 (2025년 9월 출시)",
      "퀀트 알고리즘 + AI 모델: 가격변동성·모멘텀·52주 이격도·거래강도 6개 변수",
      "5단계 분류: 매우공포→공포→관망→탐욕→매우탐욕 / 0~100점 수치화",
      "공포 구간 매수 후 탐욕 구간 매도 시 평균 수익률 약 7% (내부 테스트)",
      "→ 하나증권이 AI를 '서비스'로 만들어냈다. 다음은 '업무 전반'",
    ],
    tip: "MTS 화면 목업 또는 그래프 이미지 삽입 권장.",
  },
  {
    id: "S-06", period: "1교시",
    title: "같은 업무, 다른 시간 (Before vs After)",
    bullets: [
      "일일 시황 요약: 60분 → 12분  (ChatGPT + DART 공시)",
      "영문 리포트 번역·요약: 90분 → 18분  (Claude 200K 컨텍스트)",
      "고객 안내 메일 초안: 30분 → 7분  (ChatGPT 구어체 초안)",
      "엑셀 함수·VBA 문제: 45분 → 5분  (Gemini/ChatGPT 코드 생성)",
      "→ 하루 평균 2~3시간 회수. 연간 500~700시간 절감",
    ],
    tip: "Before 컬럼 회색·숫자 크게, After 컬럼 초록·숫자 크게. 비교 효과 극대화.",
  },

  // ── 1교시 심화: AI 5대 작동원리
  {
    id: "S-08A", period: "1교시",
    title: "AI를 제대로 쓰는 5가지 작동원리 — 왜 지금인가",
    bullets: [
      "\"AI가 멍청하게 느껴지는 이유는 대부분 기대치를 잘못 잡았기 때문\"",
      "경쟁사 현황·4대 전략 도입부 직후 — 신입사원이 AI를 처음 쓰기 전 반드시 이해해야 할 5가지",
      "이 5가지가 2·3·4교시 모든 실습의 사고 틀이 됩니다",
      "출처: 홍정모 '왜 클로드는 기대처럼 동작하지 않을까' 실전 가이드 기반",
    ],
    tip: "빨간 계열 섹션 배너. '기대치'를 키워드로 강조.",
  },
  {
    id: "S-08B", period: "1교시",
    title: "① 확률적 사고 — AI는 주사위, 복권이 아니다",
    bullets: [
      "같은 질문을 해도 매번 답이 달라짐 — 결정론적 기계가 아닌 확률 모델",
      "'42 같은 단 하나의 정답'이 나온다고 기대하면 안 됨",
      "목표: '어떤 상황에서도 그럭저럭 좋은 답'이 나오도록 몰아가는 것이 실력",
      "닭달(재지시)이 곧 실력 — AI는 도망 안 감, 마음에 안 들면 다시 시키면 됨",
      "강사 멘트: \"AI는 복권이 아니라 주사위다. 한 번에 대박 기대 말고, 닭달해서 끌어가라\"",
    ],
    tip: "주사위 아이콘. 기대치 세팅 키워드 강조.",
    accent: RED,
  },
  {
    id: "S-08C", period: "1교시",
    title: "② 흉내 vs 판단 — AI는 패턴 흉내, 사람은 맥락·판단",
    bullets: [
      "AI가 잘하는 일: 여러 데이터의 공통 패턴을 살짝 바꿔 새 결과물로 적용",
      "AI가 못하는 일: 맥락 이해와 최종 판단",
      "장점(흉내)과 단점(판단 없음)을 헷갈려 반대로 쓰면 시간·에너지만 낭비",
      "가치는 결국 사람에게서 나옴 — AI는 보조, 판단은 내가",
      "역할 분리가 곧 AI 활용 실력의 핵심",
    ],
    tip: "사람과 AI 역할 분리 다이어그램 삽입 권장.",
    accent: ORANGE,
  },
  {
    id: "S-08D", period: "1교시",
    title: "③ 컨텍스트가 승부 — 모든 기능은 컨텍스트 관리",
    bullets: [
      "스킬·메모리·서브에이전트·훅 — 이름은 달라도 본질은 'AI에게 무엇을 읽히느냐'",
      "업무마다 다른 지시서를 따로 준비해야 품질이 올라감",
      "반복되는 요청(영어교정·요약 스타일 등)은 별도 문서로 빼서 필요할 때만 주입",
      "→ 컨텍스트를 잘 설계하면 같은 AI도 훨씬 잘 씀",
    ],
    tip: "컨텍스트 흐름 화살표 다이어그램. 엔지니어링 키워드.",
    accent: BLUE,
  },
  {
    id: "S-08E", period: "1교시",
    title: "④ 토큰=시간 · ⑤ 반자동 ≠ 전자동",
    bullets: [
      "④ 토큰으로 시간을 산다: AI는 빠르게 쓰지만 사람이 읽는 속도가 느려 '인간이 병목'",
      "핵심 정리·도표 스타일을 지시서로 고정하면 검토 시간이 급감",
      "토큰값은 더 나가지만 나의 시간·에너지를 아끼는 투자",
      "⑤ 반자동이지 전자동 아님: '시키면 알아서 다 해준다'는 기대 금지",
      "초안·조사·정리는 AI에게 / 방향·판단·검수·스타일 결정은 사람이",
    ],
    tip: "두 원리를 병행 배치. 생산성 + 업무 원칙 키워드.",
  },
  {
    id: "S-08F", period: "1교시",
    title: "🎯 증권사 적용 포인트 — 확률성 × 레드라인",
    bullets: [
      "AI가 확률적이라는 사실 = '틀린 숫자·없는 공시를 그럴듯하게 만들 수 있다'는 뜻",
      "그래서 2교시 3대 레드라인(MNPI·고객정보·발간 전 자료)과 검증 3단계가 필수",
      "확률성을 알아야 레드라인이 왜 중요한지 납득됨",
      "→ 2교시: 확률성 → 환각(hallucination) → 레드라인 검증 3단계의 필연성",
      "→ 3교시: ChatGPT·Claude·Gemini 동일 질문 동시 비교 = '주사위 3개 굴리기' 실습",
    ],
    tip: "2·3교시 연결 화살표. '주사위 3개' 이미지 활용.",
  },
  {
    id: "S-09", period: "1교시",
    title: "3색 신호등 — 오늘의 판단 기준",
    bullets: [
      "🔴 빨강 — 절대 금지: 어떤 AI에도 입력 불가. 위반 시 징계 + 법적 책임",
      "🟡 노랑 — 사내 승인 도구로만: 사내 AI 플랫폼 오픈 시 해당 도구 사용",
      "🟢 초록 — 무료 공용 AI 사용 가능: 결과물 검증 3단계 필수",
      "→ 이 신호등이 오늘 교육 전체의 판단 기준입니다",
    ],
    tip: "실제 신호등 이미지 or 3색 원형 아이콘. 핵심 메시지는 크게.",
  },

  // ── 2교시: 3대 레드라인
  {
    id: "S-10", period: "2교시",
    title: "이미 사고가 났습니다",
    bullets: [
      "삼성전자 직원, ChatGPT에 소스코드 붙여넣기 → OpenAI 서버 전송 → 전사 AI 금지",
      "미국 로펌 변호사, AI가 만든 허위 판례를 법원에 그대로 제출 → 법원 제재·징계",
      "국내 금융사 직원, 고객 거래내역 AI에 입력 → 정보보호법 위반 조사",
      "→ 증권사에서 같은 일이 생기면: 자본시장법 + 개인정보보호법 + 회사 징계 동시",
    ],
    tip: "빨간 배경 뉴스 카드 3개. 충격 효과.",
  },
  {
    id: "S-11", period: "2교시",
    title: "레드라인 ① MNPI (미공개 중요 정보)",
    bullets: [
      "정의: 공시 전 실적 / M&A 내용 / 유상증자 계획 / 목표주가 (발표 전)",
      "근거: 자본시장법 제174조 (내부자거래 금지)",
      "❌ '다음 주 공시할 당사 영업이익으로 시황 보고서 초안 써줘'",
      "✅ 공시 완료 후 DART 공시문 붙여넣기 → AI 요약",
      "기준: 공시 전이냐 후냐. 타이밍이 전부.",
    ],
    tip: "X/O 케이스 대비. 빨강/초록 배경으로 직관적 표현.",
  },
  {
    id: "S-12", period: "2교시",
    title: "레드라인 ② 고객 개인·금융 정보",
    bullets: [
      "정의: 고객 실명 / 계좌번호 / 잔고 / 거래내역 / 연락처 / 투자성향",
      "근거: 개인정보보호법 / 신용정보법 / 금융소비자보호법",
      "❌ '홍길동(계좌번호 1234-5678, 잔고 3억) 포트폴리오 추천해줘'",
      "✅ '50대, 자산 3억, 중위험 성향 고객 적합 포트폴리오 추천해줘'",
      "비식별화해도 공용 AI에는 노랑(🟡) 판단 — 사내 도구 우선",
    ],
    tip: "실명/익명 비교 카드. 비식별화도 완전 안전이 아님을 강조.",
  },
  {
    id: "S-13", period: "2교시",
    title: "레드라인 ③ 발간 전 리서치·딜 정보",
    bullets: [
      "정의: 미발간 리포트 초안 / 목표주가 / 딜 코드명 / IM 원문 / 실사 자료",
      "❌ '이 기업 초안 리포트 검토해줘' (발간 전 사내 문서)",
      "✅ 경쟁사 공식 발간 리포트 PDF 텍스트 붙여넣기 → AI 비교 분석",
      "AI 환각 주의: 수치·법령·날짜는 반드시 DART·한은·금감원 원출처 대조",
      "AI가 틀린 수치로 보고서 작성 → 책임은 서명한 직원 본인",
    ],
    tip: "발간 전 vs 발간 후 타임라인으로 시각화.",
  },
  {
    id: "S-14", period: "2교시",
    title: "30초 결정 트리",
    bullets: [
      "Q1: 공개된 정보인가? (DART공시·뉴스·공식보도자료) → YES → 🟢",
      "Q2: MNPI / 고객 개인정보 포함? → YES → 🔴 스톱",
      "Q3: 사내 기밀 자료? (감사보고서·인사자료·미서명계약서) → YES → 🔴 스톱",
      "Q4: 나머지 사내 정보? → 🟡 사내 승인 도구 오픈 후 사용",
      "→ 책상에 붙여두세요. 오늘 배포 카드에 있습니다",
    ],
    tip: "다이아몬드형 플로차트. 3색 그대로. 한눈에 보이도록.",
  },
  {
    id: "S-15", period: "2교시",
    title: "AI 출력 검증 3단계",
    bullets: [
      "STEP 1: 수치·날짜·법령 조항 → 원출처(DART·한은·금감원) 100% 대조",
      "STEP 2: 개인정보·MNPI 포함 여부 자가 체크 (신호등 기준)",
      "STEP 3: 외부 발송·보고 전 상급자 또는 동료 1인 확인",
      "→ 처음 3개월은 의식적으로. 이후엔 자동으로 됩니다",
    ],
    tip: "3단계 계단형 순서도. 각 스텝 강조색 다르게.",
  },

  // ── 3교시: 무료 AI 3종 시연
  {
    id: "S-16", period: "3교시",
    title: "ChatGPT · Claude · Gemini — 무료로 뭐가 되나",
    bullets: [
      "ChatGPT Free: GPT-4o mini 무료 · 범용 문서 작성·요약·번역 · 하루 메시지 제한",
      "Claude Free (Anthropic): Claude 3.5 무료 · 긴 문서 분석 강점 · 일일 사용량 제한",
      "Gemini Free (Google): Gemini 1.5 Flash 무료 · Google 검색 연동 · YouTube·Drive 연계",
      "→ 무료 한도 내에서도 업무 80%는 커버 가능",
      "→ 3종 모두 한국어 지원. 사용 전 데이터 학습 설정 OFF 확인",
    ],
    tip: "3종 비교표: 무료 한도·강점·약점·적합 업무. 아이콘 포함.",
  },
  {
    id: "S-17", period: "3교시",
    title: "업무 유형별 도구 선택 매트릭스",
    bullets: [
      "공시·뉴스 요약 → ChatGPT (범용, 빠름)",
      "100페이지+ 영문 리서치 번역·분석 → Claude (긴 컨텍스트 강점, 200K 토큰)",
      "최신 뉴스 실시간 검색·요약 → Gemini (Google 검색 연동)",
      "엑셀·Python·VBA 코드 생성 → ChatGPT or Gemini",
      "회의록·긴 회의 녹취 요약·구조화 → Claude (200K 컨텍스트 최강)",
    ],
    tip: "4열 매트릭스: 업무유형 / 추천도구 / 이유 / 주의사항. 색 구분.",
  },
  {
    id: "S-18", period: "3교시",
    title: "[라이브 시연 ①] 동일 공시 → 3종 AI 비교",
    bullets: [
      "시연 대상: DART 특정 기업 사업보고서 일부 (공개 문서)",
      "동일 프롬프트를 ChatGPT / Claude / Gemini에 동시 입력",
      "비교 포인트: 응답 속도 / 요약 품질 / 수치 정확도 / 형식",
      "→ ChatGPT: 간결 빠름 / Claude: 구조적 상세 / Gemini: 검색 연동 보완",
      "→ 어떤 도구가 무조건 좋은 게 아니라 '업무에 맞게' 선택",
    ],
    tip: "화면 3분할로 세 AI 동시 표시. 실시간 비교가 핵심.",
  },
  {
    id: "S-19", period: "3교시",
    title: "[라이브 시연 ②] 영문 리포트 번역 (Claude)",
    bullets: [
      "시연 대상: 공개 영문 글로벌 IB 리포트 10페이지 (공개 자료)",
      "Claude Free에 전문 붙여넣기 → '금융 용어 국내 표준으로, 표·숫자 원문 유지'",
      "→ GPT Free 무료 한도 초과 케이스 vs Claude Free 처리 가능 케이스 비교",
      "→ 긴 문서는 Claude가 유리. 단, 수치는 반드시 원본 대조",
    ],
    tip: "좌: 영문 원본 / 우: Claude 번역 결과. 직관적 대조.",
  },
  {
    id: "S-20", period: "3교시",
    title: "프롬프트 실전 템플릿 5패턴",
    bullets: [
      "요약: '다음 공시문을 증권사 신입 직원이 이해할 수 있게 5줄로 요약. 수치는 원문 그대로.'",
      "번역: '다음 영문 기사를 금융 용어는 국내 표준 용어로, 영문 병기하여 번역해줘.'",
      "회의록: '다음 회의록을 ①참석자 ②안건 ③결정사항 ④액션아이템(담당자·기한) 표로 정리.'",
      "분석: '두 기업의 공시 재무제표를 비교해 표로 정리. 수치 추정 금지, 공시 기준으로만.'",
      "코드: 'A열 날짜, B열 종가 기준 20일 이동평균을 C열에 계산하는 엑셀 수식 알려줘.'",
    ],
    tip: "프롬프트 텍스트 박스 형태로. 복사해서 바로 쓸 수 있는 느낌.",
  },

  // ── 4교시: 부서별 플레이북
  {
    id: "S-21", period: "4교시",
    title: "WM/PB — 고객 이름 빼면, 나머지는 AI가 처리",
    bullets: [
      "🟢 일일 시황: 한은 보도자료 → ChatGPT 요약 → 고객용 한 줄 (12분)",
      "🟢 고객 안내 메일: '50대 중위험 성향 채권 고객'으로 가상화 → ChatGPT 초안 (7분)",
      "🟢 상품 비교표: 공식 상품 브로셔 텍스트 → Gemini 표 정리 (10분)",
      "🟢 ETF 해외 자료 번역: Claude로 펀드 팩트시트 번역 (15분)",
      "🔴 고객 실명·계좌번호·포트폴리오 내역 → 어떤 AI에도 입력 금지",
    ],
  },
  {
    id: "S-22", period: "4교시",
    title: "IB / S&T / 리서치 — 공개 자료는 AI로",
    bullets: [
      "IB 🟢: 글로벌 M&A 영문 기사 한국어 요약 Claude (18분) / IM 목차 뼈대 ChatGPT",
      "IB 🔴: 딜 코드명·미공개 밸류에이션·실사 자료·LOI 원문 → 절대 금지",
      "S&T 🟢: Bloomberg·Reuters 뉴스 5개 → ChatGPT 요약 → 데일리 1페이지 (15분)",
      "S&T 🔴: 실시간 호가 데이터·포지션·주문 정보 → AI 입력 금지",
      "리서치 🟢: DART 사업보고서 재무지표 표 추출 → Claude (20분) / 공개 외신 번역",
    ],
  },
  {
    id: "S-23", period: "4교시",
    title: "리테일 / 백오피스 / IT — 즉시 활용 가능",
    bullets: [
      "🟢 리테일: 상품 FAQ 20개 → ChatGPT 10분 / 고객 안내문·민원 초안 → 컴플 검토 후 발송",
      "🟢 백오피스: 엑셀 VBA, 파이썬 디버깅, 법령 조문 요약 전부 초록",
      "🟢 IT: 코드 오류 메시지 → ChatGPT 원인·수정 / 파이썬 자동화 스크립트",
      "🔴 감사보고서·인사 자료·미서명 계약서·내부 규정 원문 → 공용 AI 금지",
      "소그룹 토론: '내 부서에서 AI로 가장 먼저 할 일은?' — 5분 토론 후 발표",
    ],
  },

  // ── 5교시: 핸즈온 2트랙
  {
    id: "S-28", period: "5교시",
    title: "핸즈온 실습 2트랙 안내",
    bullets: [
      "트랙 1: Claude Free로 회의록 요약 — 신입이 가장 자주 마주치는 반복 업무",
      "트랙 2: Alli Works로 개인 업무비서 챗봇 — 본인 문서로 나만의 AI 비서",
      "두 트랙 모두 공개 데이터 또는 본인 가이드 문서만 사용 (전부 🟢)",
      "시간: 25분 실습 → 5분 조별 발표 → 피드백",
    ],
    tip: "트랙 A/B 비교 박스. 각 단계와 소요 시간 표시.",
  },
  {
    id: "S-29", period: "5교시",
    title: "트랙 1: Claude Free 회의록 요약",
    bullets: [
      "배경: 신입이 가장 많이 추천받는 beginner 과제 — 회의록/긴 문서 요약 (Claude 200K 컨텍스트 최강)",
      "Step 1: 가상 팀 회의 녹취본(공개 샘플) Claude Free에 붙여넣기",
      "Step 2: 프롬프트 '①참석자 ②주요 안건 ③결정사항 ④액션아이템(담당자·기한) 표로 정리. 수치·발언 원문 왜곡 금지'",
      "Step 3: 검증 3단계 적용 (수치확인·개인정보확인·상급자 리뷰)",
      "산출물: 내 부서에서 내일 당장 쓸 '회의록 요약 프롬프트 템플릿 1개'",
    ],
    tip: "Claude 인터페이스 캡처 + 프롬프트 텍스트 박스 시각화.",
    accent: BLUE,
  },
  {
    id: "S-30", period: "5교시",
    title: "트랙 2: Alli Works 개인 업무비서 챗봇",
    bullets: [
      "아이디어: 매일 쌓이는 선배 조언·매뉴얼·용어집·FAQ → Alli 지식베이스에 축적 → 내 업무 비서",
      "Step 1: 개인 업무 가이드 문서 1~2개 작성 (선배 인수인계, 자주 쓰는 용어 정리)",
      "Step 2: Alli 지식베이스 업로드 (폴더·해시태그 정리)",
      "Step 3: 앱 생성 — 메시지 노드 → 답변 노드(Qwen-2.5-72B)",
      "Step 4: 조건 분기 '모르는 답 → 담당자 연결 노드' + 3문항 테스트 → 출처 확인",
    ],
    tip: "Alli Works 화면 캡처 + 노드 플로 다이어그램.",
    accent: EMERALD,
  },
  {
    id: "S-31", period: "5교시",
    title: "오늘의 3대 행동수칙 + AI 주행 면허 취득",
    bullets: [
      "1️⃣ 레드라인 3개 외우기: MNPI · 고객정보 · 발간 전 자료 — 이것만 지키면 절반 성공",
      "2️⃣ 초안은 초안이다: 검증 3단계 후 사용, 최종 책임은 내가",
      "3️⃣ 초록부터 적극적으로: 공시·뉴스·번역·코드·회의록 — 지금 당장 시작",
      "사내 AI 플랫폼 오픈 시 → 오늘 배운 습관 그대로 적용",
      "30일 팔로업 설문 드립니다 · 문의: 인재개발실",
    ],
    tip: "신호등 초록불 + '면허 취득' 임팩트 있게. 기념 분위기로 마무리.",
  },
];

// ── PPTX Generator ─────────────────────────────────────────────────────────────
async function generatePPTX(): Promise<Blob> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const prs = new PptxGenJS();

  prs.layout = "LAYOUT_16x9";
  prs.title = "하나증권 신입사원 AI 리터러시 교육";
  prs.author = "하나증권 인재개발";

  for (const sl of SLIDES) {
    const slide = prs.addSlide();
    const accent = sl.accent ?? PERIOD_COLORS[sl.period] ?? GRAY_900;

    // Background
    slide.background = { color: WHITE };

    // Top banner
    slide.addShape(prs.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 1.05,
      fill: { color: accent },
      line: { color: accent },
    });

    // Period badge (top-left)
    slide.addText(sl.period, {
      x: 0.3, y: 0.12, w: 1.4, h: 0.35,
      fontSize: 10, bold: true, color: WHITE,
      fill: { color: "FFFFFF20" },
      align: "center", valign: "middle",
    });

    // Slide ID (top-right)
    slide.addText(sl.id, {
      x: 11.6, y: 0.12, w: 1.4, h: 0.35,
      fontSize: 9, color: WHITE,
      align: "center", valign: "middle",
    });

    // Title
    slide.addText(sl.title, {
      x: 0.3, y: 0.13, w: 11.3, h: 0.75,
      fontSize: 22, bold: true, color: WHITE,
      align: "left", valign: "middle",
      wrap: true,
    });

    // Bullet points
    const bulletY = 1.15;
    const bulletH = (7.5 - bulletY - 0.5) / Math.max(sl.bullets.length, 1);
    sl.bullets.forEach((b, i) => {
      const isRedLine = b.startsWith("❌");
      const isGreen   = b.startsWith("✅") || b.startsWith("🟢");
      const isRed     = b.startsWith("🔴");
      const textColor = isRedLine ? RED : isGreen ? EMERALD : isRed ? RED : GRAY_900;

      slide.addText(b, {
        x: 0.5, y: bulletY + i * bulletH, w: 12.3, h: bulletH,
        fontSize: 15, color: textColor,
        bold: isRedLine || isGreen || isRed,
        bullet: { type: "number", style: "arabicPeriod" },
        valign: "middle",
        wrap: true,
        lineSpacingMultiple: 1.15,
      });
    });

    // Design tip (footer)
    if (sl.tip) {
      slide.addShape(prs.ShapeType.rect, {
        x: 0, y: 7.1, w: "100%", h: 0.4,
        fill: { color: GRAY_50 },
        line: { color: GRAY_50 },
      });
      slide.addText(`💡 디자인 힌트: ${sl.tip}`, {
        x: 0.3, y: 7.12, w: 12.7, h: 0.3,
        fontSize: 8, color: GRAY_500,
        italic: true,
      });
    }

    // Footer line
    slide.addShape(prs.ShapeType.line, {
      x: 0.3, y: 7.05, w: 12.7, h: 0,
      line: { color: "E5E7EB", width: 1 },
    });
    slide.addText("하나증권 인재개발 | AI 리터러시 교육", {
      x: 0.3, y: 7.07, w: 7, h: 0.2,
      fontSize: 7, color: GRAY_500,
    });
  }

  const buf = await prs.write({ outputType: "arraybuffer" }) as ArrayBuffer;
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}

// ── Download Button ─────────────────────────────────────────────────────────────
export function HanaPPTDownloadBtn() {
  const [generating, setGenerating] = useState(false);

  const handle = async () => {
    setGenerating(true);
    try {
      const blob = await generatePPTX();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "B_하나증권_AI교육_PPT슬라이드.pptx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PPT generation failed:", e);
      alert("PPT 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={generating}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
    >
      {generating ? (
        <><Loader2 size={12} className="animate-spin" />생성 중...</>
      ) : (
        <><Download size={12} />PPT 다운로드</>
      )}
    </button>
  );
}

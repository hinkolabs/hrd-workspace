import type { SlotDeck } from "@/lib/deck/types";
import { DeckViewer } from "@/components/deck/DeckViewer";

const DEMO_DECK: SlotDeck = {
  meta: {
    title: "AI 기반 인재개발 전략",
    theme: "hana",
    author: "인재개발실",
    date: "2026년 4월",
  },
  slides: [
    {
      component: "TitleSlide",
      props: {
        title: "AI 기반\n인재개발 전략",
        subtitle: "하나증권 HRD 2026",
        author: "인재개발실",
        date: "2026년 4월",
      },
    },
    {
      component: "AgendaSlide",
      props: {
        heading: "목차",
        items: [
          { number: 1, title: "현황 진단", desc: "국내외 AI 학습 트렌드 및 내부 역량 현황" },
          { number: 2, title: "핵심 전략", desc: "3대 교육 축 및 실행 로드맵" },
          { number: 3, title: "성과 지표", desc: "KPI 및 달성 목표" },
          { number: 4, title: "실행 계획", desc: "분기별 세부 추진 일정" },
        ],
      },
    },
    {
      component: "SectionDividerSlide",
      props: { sectionNumber: 1, title: "현황 진단", subtitle: "국내외 AI 학습 트렌드 및 내부 역량 현황" },
    },
    {
      component: "StatsSlide",
      props: {
        heading: "핵심 성과 지표",
        stats: [
          { value: "92%", label: "AI 도구 활용 필요성 인식", delta: "+12%p YoY", icon: "TrendingUp" },
          { value: "1,240명", label: "연간 교육 참여 인원", delta: "+18% vs 2025", icon: "Users" },
          { value: "4.6점", label: "교육 만족도 (5점 만점)", delta: "전년 대비 +0.3", icon: "Star" },
          { value: "68%", label: "현업 적용 전환율", delta: "목표 80%", icon: "Target" },
        ],
        emphasis: "2026년 목표: 전 직원 AI 리터러시 수준 80% 이상 달성",
      },
    },
    {
      component: "ComparisonSlide",
      props: {
        heading: "현재 vs 목표 상태",
        left: {
          label: "현재 (AS-IS)",
          points: [
            "연간 2회 집합교육 중심",
            "AI 도구 활용 가이드 부재",
            "부서별 교육 격차 큼",
            "성과 측정 체계 미비",
          ],
          emphasis: "산발적 · 수동적 학습",
        },
        right: {
          label: "목표 (TO-BE)",
          points: [
            "월별 마이크로러닝 + 집합교육 블렌딩",
            "직무별 AI 도구 활용 표준 가이드",
            "부서별 맞춤 교육과정 운영",
            "분기별 역량 진단 및 성과 트래킹",
          ],
          emphasis: "지속적 · 데이터 기반 학습",
        },
      },
    },
    {
      component: "ProcessSlide",
      props: {
        heading: "3단계 AI 역량 강화 로드맵",
        steps: [
          { number: 1, title: "기초 리터러시", description: "전 직원 AI 개념 및 ChatGPT/Copilot 기초 활용", icon: "BookOpen" },
          { number: 2, title: "직무 적용", description: "직무별 AI 도구 실습 및 업무 자동화 워크숍", icon: "Briefcase" },
          { number: 3, title: "심화·전파", description: "AI 챔피언 양성 및 팀 내 학습 리더 활동", icon: "Rocket" },
        ],
        emphasis: "1단계 → 2단계 → 3단계 순차 진행, 각 단계 3개월 소요",
      },
    },
    {
      component: "BulletsSlide",
      props: {
        heading: "핵심 실행 전략",
        bullets: [
          { icon: "Zap", text: "마이크로러닝 콘텐츠 월 4편 제작·배포", sub: "5분 이내 영상 + 퀴즈 형식, 모바일 최적화" },
          { icon: "Users", text: "AI 챔피언 네트워크 구축 (부서별 1인)", sub: "분기별 챔피언 워크숍 및 우수사례 공유회" },
          { icon: "BarChart2", text: "학습 데이터 기반 개인화 추천 시스템 도입", sub: "LMS 고도화, 개인별 역량 갭 분석 리포트" },
          { icon: "GraduationCap", text: "외부 파트너십을 통한 심화과정 확대", sub: "대학원 연계 AI 전문가 과정 연 2기 운영" },
        ],
        emphasis: "모든 전략은 분기 단위 성과 점검 후 조정",
      },
    },
    {
      component: "QuoteSlide",
      props: {
        quote: "AI는 인간을 대체하지 않는다. AI를 활용하는 인간이 활용하지 못하는 인간을 대체할 것이다.",
        source: "IBM AI 리더십 리포트 2025",
        context: "전 세계 3,000명 이상의 비즈니스 리더 대상 설문 결과",
      },
    },
    {
      component: "ImageSplitSlide",
      props: {
        heading: "학습 생태계 설계",
        bullets: [
          { icon: "Layers", text: "온·오프라인 블렌디드 러닝 체계 구축", sub: "LMS + 집합교육 + 현장 코칭 통합" },
          { icon: "Network", text: "사내 지식 공유 플랫폼 운영", sub: "AI 활용 사례 및 우수 콘텐츠 DB화" },
          { icon: "RefreshCw", text: "분기별 과정 업데이트 사이클", sub: "AI 트렌드 변화에 맞춰 콘텐츠 주기적 리프레시" },
        ],
        imageSide: "right",
      },
    },
    {
      component: "ClosingSlide",
      props: {
        message: "함께 성장하는 하나증권",
        contact: "hrd@hana.com | 02-3771-0000",
        author: "인재개발실",
      },
    },
  ],
};

export default function DemoPage() {
  return <DeckViewer deck={DEMO_DECK} />;
}

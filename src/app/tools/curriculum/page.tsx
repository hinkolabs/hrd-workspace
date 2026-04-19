"use client";

import { useState } from "react";
import {
  BookOpen,
  Download,
  Clock,
  Users,
  Loader2,
  Presentation,
  Shield,
  FileText,
  MonitorPlay,
  Cpu,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";

const AlliPDFButtons = dynamic(
  () => import("@/components/alli-pdfs").then((m) => m.AlliPDFButtons),
  {
    ssr: false,
    loading: () => (
      <div className="flex gap-2 flex-wrap">
        {["A", "B", "C"].map((k) => (
          <button
            key={k}
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-400 rounded-xl text-sm cursor-not-allowed"
          >
            <Loader2 size={14} className="animate-spin" />
            로딩 중...
          </button>
        ))}
      </div>
    ),
  }
);

const HanaAIPDFButtons = dynamic(
  () => import("@/components/hana-ai-pdfs").then((m) => m.HanaAIPDFButtons),
  {
    ssr: false,
    loading: () => (
      <div className="flex gap-2 flex-wrap">
        {["A", "B", "C"].map((k) => (
          <button
            key={k}
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-400 rounded-xl text-sm cursor-not-allowed"
          >
            <Loader2 size={14} className="animate-spin" />
            로딩 중...
          </button>
        ))}
      </div>
    ),
  }
);

// ── Tab types ──────────────────────────────────────────────────────────────────
type Tab = "alli" | "hana-ai";

// ═══════════════════════════════════════════════════════════════════════════════
// ALLY WORKS TAB — 3시간 교육 패키지 (A/B/C PDF 다운로드)
// ═══════════════════════════════════════════════════════════════════════════════

const ALLI_DOCS = [
  {
    key: "A" as const,
    icon: FileText,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    title: "A. 실장님 보고용 기획서",
    desc: "A4 1페이지. 왜 Alli인가(ChatGPT·Claude 비교) · 도입 효과 수치 · Qwen-2.5-72B 장단점 · 7세션 커리큘럼 · 기대 성과 지표를 한 장에 압축. 임원 보고·승인용.",
    pages: "1페이지",
    use: "실장님 보고용",
  },
  {
    key: "B" as const,
    icon: MonitorPlay,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-700",
    title: "B. PPT 슬라이드 구성안",
    desc: "슬라이드 28장. 왜 Alli인가 → 할루시네이션 주의 → Qwen 소개 → 대시보드 투어 → 지식베이스·챗봇 실습 → 조건 분기·담당자 연결 → 테스트·피드백 → 마무리. 슬라이드별 디자인 힌트 포함.",
    pages: "9페이지",
    use: "PPT 제작용",
  },
  {
    key: "C" as const,
    icon: Presentation,
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-700",
    title: "C. 강의 대본",
    desc: "7세션 전체 구어체 대본. 초보자 눈높이 설명 · 노드별 실습 안내 · 2인 1조 체험 스크립트 · Q&A 8개 (Qwen 품질·할루시네이션·출처확인·담당자 연결·민감정보 대응 포함).",
    pages: "9페이지",
    use: "강의 진행용",
  },
];

function AlliTab() {
  return (
    <>
      {/* Sub-header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 shrink-0">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
              <Presentation size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Alli Works 첫 사용 가이드 교육</h2>
              <p className="text-xs text-gray-400 mt-0.5">자격증 Q&A 챗봇 실습 · Qwen-2.5-72B · 초보자 대상 · 3시간 과정</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
              <Clock size={11} />3시간
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
              <Users size={11} />10~20명
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
              <BookOpen size={11} />7세션
            </span>
            <span className="flex items-center gap-1 text-xs text-violet-600 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full font-medium">
              <Cpu size={11} />Qwen-2.5-72B
            </span>
          </div>
        </div>

        {/* 7-session timeline */}
        <div className="max-w-4xl mx-auto mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {[
            { time: "00:00", label: "Alli 소개",    color: "bg-violet-500"  },
            { time: "00:25", label: "대시보드",      color: "bg-blue-500"    },
            { time: "00:55", label: "지식베이스",    color: "bg-teal-500"    },
            { time: "01:20", label: "챗봇 제작",     color: "bg-indigo-600"  },
            { time: "02:10", label: "조건+담당자",   color: "bg-amber-500"   },
            { time: "02:35", label: "테스트+피드백", color: "bg-emerald-500" },
            { time: "02:50", label: "마무리 Q&A",   color: "bg-gray-500"    },
          ].map((s) => (
            <div
              key={s.time}
              className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-2 py-1.5 shadow-sm"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${s.color} shrink-0`} />
              <div>
                <p className="text-[9px] text-gray-400">{s.time}</p>
                <p className="text-[10px] font-medium text-gray-700">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">

          {/* Why Alli + Qwen 배지 */}
          <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">왜 Alli Works + Qwen-2.5-72B인가</span>
              <span className="text-[10px] text-gray-400">사내 폐쇄망 RAG 기반 챗봇 플랫폼</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: "🔒", title: "데이터 보안", sub: "사내 폐쇄망 + Qwen 온프레미스\n외부 전송 0건", highlight: true  },
                { icon: "📎", title: "출처 있는 답변", sub: "사내 문서·Q&A RAG 기반\n원문 링크 자동 표시", highlight: false },
                { icon: "👤", title: "담당자 자동 연결", sub: "AI 실패 시 조건 분기로\n담당자에게 자동 에스컬레이션", highlight: false },
                { icon: "💰", title: "과금 없음", sub: "사용량 무관 고정 인프라\nAPI 추가 비용 없음", highlight: false },
              ].map((item) => (
                <div key={item.title} className={`rounded-lg p-2.5 ${item.highlight ? "bg-violet-600 text-white" : "bg-gray-50 border border-gray-100"}`}>
                  <p className="text-base mb-1">{item.icon}</p>
                  <p className={`text-[11px] font-bold leading-tight mb-1 ${item.highlight ? "text-white" : "text-gray-900"}`}>{item.title}</p>
                  <p className={`text-[9px] whitespace-pre-line leading-relaxed ${item.highlight ? "text-violet-100" : "text-gray-500"}`}>{item.sub}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-2.5 bg-gray-50 rounded-lg px-3 py-1.5">
              공용 AI(ChatGPT 등)가 <strong>&apos;그럴듯한 답&apos;</strong>을 만든다면, Alli는 <strong>사내 지식 기반의 출처 있는 답변</strong>을 만듭니다.
              Qwen-2.5-72B는 사내 서버에서 직접 실행되어 어떤 데이터도 외부로 전송되지 않습니다.
            </p>
          </div>

          {/* Intro + PDF downloads */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">교육 패키지 구성</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Alli Works 사내 도입 후 <strong className="text-gray-700">처음 접하는 직원 전원</strong>을 위한 3시간 첫 사용 가이드입니다.
                  자격증 Q&A 챗봇을 직접 만드는 핸즈온 중심 과정이며, 코딩 지식이 없어도 완성할 수 있습니다.
                  아래 3종 문서를 PDF로 다운로드해서 바로 활용하세요.
                </p>
              </div>
            </div>

            {/* Qwen quick facts */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "✅ 장점", desc: "데이터 외부 전송 없음 · 과금 없음 · 한국어 우수 · 커스터마이징 가능" },
                { label: "⚠️ 주의", desc: "복잡 추론은 GPT-4o 대비 약간 열세 · GPU 인프라 필요 · 직접 업데이트 관리" },
                { label: "🎯 용도", desc: "FAQ·Q&A 단순 도메인에서 GPT-4o와 동등~근접 품질 — 이 교육 용도에 최적" },
              ].map((c) => (
                <div key={c.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs font-bold text-gray-900 mb-0.5">{c.label}</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>

            {/* All PDF download buttons */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">전체 다운로드</p>
              <AlliPDFButtons />
            </div>
          </div>

          {/* Individual doc cards */}
          {ALLI_DOCS.map((doc) => {
            const Icon = doc.icon;
            return (
              <div key={doc.key} className={`bg-white rounded-2xl border ${doc.border} shadow-sm p-5`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl ${doc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={16} className={doc.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-gray-900">{doc.title}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${doc.badge}`}>
                          {doc.use}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {doc.pages}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{doc.desc}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 7-session curriculum overview */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">7세션 커리큘럼 개요</h3>
              <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">이론 20% · 핸즈온 실습 80%</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "세션 1 (25분)", title: "Alli 소개 + 왜 Qwen", desc: "ChatGPT·Claude vs Alli 차이점 → 도입 효과 수치 → 할루시네이션 주의 → Qwen-2.5-72B 장단점", color: "border-l-violet-500" },
                { label: "세션 2 (20분)", title: "대시보드 투어",        desc: "접속 확인 → 3개 핵심 메뉴(지식베이스·앱관리·대화) 눈으로 익히기 → 화면 구성 이해", color: "border-l-blue-400" },
                { label: "세션 3 (25분)", title: "지식베이스 실습",      desc: "Q&A CSV 30건 업로드 → 문서 PDF 업로드 → 폴더 구조 · 해시태그 설정 → 처리 완료 확인", color: "border-l-teal-400" },
                { label: "세션 4 (40분)", title: "챗봇 제작 핵심",       desc: "앱 생성 → 메시지 노드 → 답변 노드(Qwen-2.5-72B) → 중간 테스트 3문항 + 출처 확인", color: "border-l-indigo-500" },
                { label: "세션 5 (25분)", title: "조건 분기 + 담당자 연결", desc: "조건 추가 노드 설정(@TEXT contains '없습니다') → 담당자 연결 노드 → 2인 1조 역할 체험", color: "border-l-amber-400" },
                { label: "세션 6 (15분)", title: "테스트 4종 + 피드백",  desc: "정상 답변 3개 + 담당자 연결 1개 → 할루시네이션 대응 3단계 → 피드백 학습 선순환 → 초보자 실수 5가지", color: "border-l-emerald-400" },
                { label: "세션 7 (10분)", title: "마무리 + Q&A",          desc: "오늘 만든 것 정리 → 다음 단계 로드맵 → 3가지 기억 → Q&A 8개", color: "border-l-gray-400" },
              ].map((row) => (
                <div key={row.label} className={`border-l-4 ${row.color} bg-gray-50 rounded-r-lg px-3 py-2`}>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-gray-500 shrink-0">{row.label}</span>
                    <span className="text-xs font-semibold text-gray-900">{row.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{row.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANA AI LITERACY TAB — new training package with PDF downloads
// ═══════════════════════════════════════════════════════════════════════════════

const DOCS = [
  {
    key: "A" as const,
    icon: FileText,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    title: "A. 실장님 보고용 기획서",
    desc: "A4 1페이지. 경쟁사 AI 도입 현황표·하나증권 2026 4대전략·활용사례 중심 5교시 커리큘럼·성과 지표를 한 장에 압축. 임원 보고·승인용.",
    pages: "1페이지",
    use: "사내 보고용",
  },
  {
    key: "B" as const,
    icon: MonitorPlay,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-700",
    title: "B. PPT 슬라이드 구성안",
    desc: "슬라이드 30장. 경쟁사·하나증권 전략 도입부 → 3대 레드라인 케이스 → ChatGPT·Claude·Gemini 무료 3종 라이브 시연 → 6개 부서 플레이북. 슬라이드별 디자인 힌트 포함.",
    pages: "8페이지",
    use: "PPT 제작용",
  },
  {
    key: "C" as const,
    icon: Presentation,
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-700",
    title: "C. 강의 대본",
    desc: "5교시 전체 구어체 대본. 경쟁사 현황·하나증권 전략 스토리라인 + 무료 AI 3종 라이브 시연 대본 + 부서별 스토리텔링 + Q&A 8개 답변 준비.",
    pages: "7페이지",
    use: "강의 진행용",
  },
];

function HanaAITab() {
  return (
    <>
      {/* Sub-header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 shrink-0">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <Shield size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">하나증권 신입사원 AI 리터러시 교육</h2>
              <p className="text-xs text-gray-400 mt-0.5">증권사에서 안전하게 AI를 일에 끼워넣는 법 · 5시간 과정</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
              <Clock size={11} />5시간
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
              <Users size={11} />신입사원 전원
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
              <BookOpen size={11} />5교시
            </span>
          </div>
        </div>

        {/* 5-session timeline */}
        <div className="max-w-4xl mx-auto mt-3 grid grid-cols-5 gap-1.5">
          {[
            { num: "1교시", label: "전략·사례 도입", color: "bg-red-500"     },
            { num: "2교시", label: "3대 레드라인",    color: "bg-orange-500"  },
            { num: "3교시", label: "무료 AI 3종 시연",color: "bg-blue-500"    },
            { num: "4교시", label: "부서별 플레이북", color: "bg-emerald-500" },
            { num: "5교시", label: "핸즈온 + Q&A",   color: "bg-gray-500"   },
          ].map((s) => (
            <div
              key={s.num}
              className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-2 py-1.5 shadow-sm"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${s.color} shrink-0`} />
              <div>
                <p className="text-[9px] text-gray-400">{s.num}</p>
                <p className="text-[10px] font-medium text-gray-700">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">

          {/* 하나증권 2026 4대 전략 배지 */}
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">하나증권 2026 4대 핵심전략</span>
              <span className="text-[10px] text-gray-400">강성묵 대표 신년사 기반</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { num: "전략 1", title: "발행어음 기반\n생산적 금융", sub: "모험자본 확대", highlight: false },
                { num: "전략 2", title: "디지털자산\n전환(STO)", sub: "토큰증권 추진", highlight: false },
                { num: "전략 3 ★", title: "AI 중심\n업무 재설계", sub: "의사결정·실행 고도화", highlight: true },
                { num: "전략 4", title: "부문별 혁신", sub: "WM·IB·S&T 특화", highlight: false },
              ].map((st) => (
                <div key={st.num} className={`rounded-lg p-2.5 ${st.highlight ? "bg-emerald-600 text-white" : "bg-gray-50 border border-gray-100"}`}>
                  <p className={`text-[9px] font-bold mb-1 ${st.highlight ? "text-emerald-100" : "text-gray-400"}`}>{st.num}</p>
                  <p className={`text-[11px] font-bold leading-tight mb-1 whitespace-pre-line ${st.highlight ? "text-white" : "text-gray-900"}`}>{st.title}</p>
                  <p className={`text-[9px] ${st.highlight ? "text-emerald-100" : "text-gray-500"}`}>{st.sub}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-2.5 bg-gray-50 rounded-lg px-3 py-1.5">
              본 교육은 전략 3 직접 실행 과정입니다. 사내 AI 플랫폼 오픈 전까지 <strong>ChatGPT·Claude·Gemini 무료 AI 3종</strong>을 공개 정보에 한해 안전하게 활용하는 역량을 선제 확보합니다.
            </p>
          </div>

          {/* Intro card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Shield size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">교육 패키지 구성</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  KB·미래에셋·NH·신한·IBK는 이미 사내 AI 플랫폼 운영 중. 하나증권 신입사원도 지금 바로 시작할 수 있는
                  <strong className="text-gray-700"> ChatGPT·Claude·Gemini 무료 AI 3종 실전 활용법</strong> 교육입니다.
                  아래 3종 문서를 PDF로 다운로드해서 바로 활용하세요.
                </p>
              </div>
            </div>

            {/* 3-color traffic light summary */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "🔴 빨강 — 절대 금지", desc: "MNPI · 고객정보 · 발간 전 자료" },
                { label: "🟡 노랑 — 사내 도구만", desc: "사내 AI 플랫폼 오픈 후 사용" },
                { label: "🟢 초록 — 지금 바로 가능", desc: "공시·뉴스·번역·코드·초안" },
              ].map((c) => (
                <div key={c.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs font-bold text-gray-900 mb-0.5">{c.label}</p>
                  <p className="text-[11px] text-gray-500">{c.desc}</p>
                </div>
              ))}
            </div>

            {/* All PDF download buttons together */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">전체 다운로드</p>
              <HanaAIPDFButtons />
            </div>
          </div>

          {/* Individual doc cards */}
          {DOCS.map((doc) => {
            const Icon = doc.icon;
            return (
              <div
                key={doc.key}
                className={`bg-white rounded-2xl border ${doc.border} shadow-sm p-5`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl ${doc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={16} className={doc.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-gray-900">{doc.title}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${doc.badge}`}>
                          {doc.use}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {doc.pages}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{doc.desc}</p>
                    </div>
                  </div>

                  {/* Per-doc download button — dynamically imported */}
                  <div className="shrink-0">
                    <SinglePDFBtn docKey={doc.key} color={doc.color} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* 1교시 심화 설계 — AI 5대 작동원리 (홍정모 실전가이드 기반) */}
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">1교시 심화 · 15분 삽입</span>
                <h3 className="text-sm font-bold text-gray-900">AI를 제대로 쓰는 5가지 작동원리</h3>
              </div>
              <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                홍정모 &lsquo;왜 클로드는 기대처럼 동작하지 않을까&rsquo; 반영
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
              &ldquo;AI가 멍청하게 느껴지는 이유는 대부분 <strong>기대치를 잘못 잡았기 때문</strong>&rdquo;. 경쟁사 현황·4대 전략 도입부 직후,
              신입사원이 AI를 처음 쓰기 전에 반드시 이해해야 할 5가지를 주입합니다. 2·3·4교시 모든 실습의 사고 틀이 됩니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  num: "① 확률적 사고",
                  title: "AI는 결정론적 기계가 아닌 주사위",
                  body: "같은 질문에도 매번 답이 달라짐. &lsquo;42 같은 단 하나의 정답&rsquo;이 나온다고 기대 금지. &lsquo;어떤 상황에서도 그럭저럭 좋은 답&rsquo;이 나오도록 몰아가는 것이 실력. 마음에 안 들면 닭달(재지시)하면 됨 — AI는 도망 안 감.",
                  tag: "기대치 세팅",
                  accent: "bg-red-50 border-red-100 text-red-700",
                },
                {
                  num: "② 흉내 vs 판단",
                  title: "AI는 패턴 흉내, 사람은 맥락·판단",
                  body: "AI가 잘하는 일: 여러 데이터의 공통 패턴을 살짝 바꿔 적용. 못하는 일: 맥락 이해와 최종 판단. 장점(흉내)과 단점(판단 없음)을 헷갈려 반대로 쓰면 시간·에너지만 낭비. 가치는 결국 사람에게서 나옴.",
                  tag: "역할 분리",
                  accent: "bg-amber-50 border-amber-100 text-amber-700",
                },
                {
                  num: "③ 컨텍스트가 승부",
                  title: "모든 기능은 결국 컨텍스트 관리",
                  body: "스킬·메모리·서브에이전트·훅 — 이름은 달라도 본질은 &lsquo;AI에게 무엇을 읽히느냐&rsquo;. 업무마다 다른 지시서를 따로 준비하고, 반복되는 요청(영어교정·요약 스타일 등)은 별도 문서로 빼서 필요할 때만 주입.",
                  tag: "엔지니어링",
                  accent: "bg-blue-50 border-blue-100 text-blue-700",
                },
                {
                  num: "④ 토큰으로 시간을 산다",
                  title: "읽는 시간이 병목 — 시각화·요약 자동화",
                  body: "AI는 리포트를 빠르게 쓰지만, 사람이 읽고 검토하는 속도가 느려 &lsquo;인간이 병목&rsquo;. 핵심 정리·도표 스타일을 지시서로 고정하면 검토 시간이 급감. 토큰값은 더 나가지만 나의 시간·에너지를 아낌.",
                  tag: "생산성",
                  accent: "bg-emerald-50 border-emerald-100 text-emerald-700",
                },
                {
                  num: "⑤ 반자동이지 전자동 아님",
                  title: "품질을 높이는 도구지, 일 대신해주는 존재 X",
                  body: "&lsquo;시키면 알아서 다 해준다&rsquo;는 기대 금지. 초안·조사·정리는 AI에게, 방향·판단·검수·스타일 결정은 사람이. 이 구분이 흐려지면 &lsquo;왜 내가 하면 촌스럽지?&rsquo;의 악순환에 빠짐.",
                  tag: "업무 원칙",
                  accent: "bg-violet-50 border-violet-100 text-violet-700",
                },
                {
                  num: "🎯 증권사 적용 포인트",
                  title: "확률성 × 레드라인이 만나는 지점",
                  body: "AI가 확률적이라는 사실은 &lsquo;틀린 숫자·없는 공시를 그럴듯하게 만들 수 있다&rsquo;는 뜻. 그래서 2교시 3대 레드라인(MNPI·고객정보·발간 전 자료)과 검증 3단계가 필수. 확률성을 알아야 레드라인이 왜 중요한지 납득됨.",
                  tag: "2교시로 연결",
                  accent: "bg-gray-100 border-gray-200 text-gray-700",
                },
              ].map((p) => (
                <div key={p.num} className="border border-gray-100 rounded-xl p-3 bg-white">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-[11px] font-bold text-gray-900">{p.num}</span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${p.accent}`}>
                      {p.tag}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-gray-800 leading-tight mb-1">{p.title}</p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { k: "강의 멘트 포인트", v: "“AI는 복권이 아니라 주사위다. 한 번에 대박 기대 말고, 닭달해서 끌어가라”" },
                { k: "2교시 연결", v: "확률성 → 환각(hallucination) → 레드라인 검증 3단계의 필연성" },
                { k: "3교시 연결", v: "ChatGPT·Claude·Gemini 동일 질문 동시 비교 = ‘주사위 3개 굴리기’ 실습" },
              ].map((b) => (
                <div key={b.k} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="text-[9px] font-bold text-gray-500 mb-0.5">{b.k}</p>
                  <p className="text-[10px] text-gray-700 leading-relaxed">{b.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Content overview */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">5교시 커리큘럼 개요</h3>
              <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">이론 20% · 활용 사례·실습 80%</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "1교시 (50분)", title: "AI 왜 써야 하나 + 기대치 올바로 잡기", desc: "경쟁사 AI 격차 → 하나증권 4대전략 → AI 5대 작동원리(확률성·흉내vs판단·컨텍스트·토큰=시간·반자동) → 공포탐욕시그널 시연 → Before/After → 3색 신호등", color: "border-l-red-400" },
                { label: "2교시 (50분)", title: "3대 레드라인 + 케이스 퀴즈", desc: "MNPI·고객정보·발간 전 자료 실사고 사례 → 30초 결정 트리 → 케이스 퀴즈 15문항 → 검증 3단계", color: "border-l-orange-400" },
                { label: "3교시 (50분)", title: "ChatGPT·Claude·Gemini 무료 3종 라이브 시연", desc: "무료 한도·강점 비교표 → 업무별 도구 매트릭스 → 동일 공시 3종 동시 비교 시연 → 영문 리포트 번역 시연", color: "border-l-blue-400" },
                { label: "4교시 (50분)", title: "부서별 활용 플레이북", desc: "WM·IB·S&T·리서치·리테일·백오피스 × 실무 시나리오 + 권장 AI 도구 매칭 → 소그룹 토론·발표", color: "border-l-emerald-400" },
                { label: "5교시 (50분)", title: "핸즈온 실습 + 발표 + Q&A", desc: "부서별 과제 실습 (공개 데이터 100%) → 조별 베스트 프롬프트 발표 → 3대 행동수칙 → Q&A 8개", color: "border-l-gray-400" },
              ].map((row) => (
                <div key={row.label} className={`border-l-4 ${row.color} bg-gray-50 rounded-r-lg px-3 py-2`}>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-gray-500 shrink-0">{row.label}</span>
                    <span className="text-xs font-semibold text-gray-900">{row.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{row.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ── Per-card PDF download button ───────────────────────────────────────────────
const IndividualPDFBtn = dynamic(
  () =>
    import("@/components/hana-ai-pdfs").then((m) => {
      function Btn({ docKey }: { docKey: "A" | "B" | "C" }) {
        const [generating, setGenerating] = useState(false);
        const META = {
          A: { cls: "bg-emerald-600 hover:bg-emerald-700", file: "A_하나증권_AI교육_기획서.pdf"    },
          B: { cls: "bg-indigo-600 hover:bg-indigo-700",   file: "B_하나증권_AI교육_PPT구성안.pdf" },
          C: { cls: "bg-slate-700 hover:bg-slate-800",     file: "C_하나증권_AI교육_강의대본.pdf"  },
        } as const;
        const meta = META[docKey];

        const handle = async () => {
          setGenerating(true);
          try {
            const blob = await m.generatePDF(docKey);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = meta.file; a.click();
            URL.revokeObjectURL(url);
          } catch { alert("PDF 생성에 실패했습니다."); }
          finally { setGenerating(false); }
        };

        return (
          <button
            onClick={handle}
            disabled={generating}
            className={`flex items-center gap-1.5 px-3 py-1.5 ${meta.cls} disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer`}
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {generating ? "생성 중..." : "PDF 다운로드"}
          </button>
        );
      }
      return Btn;
    }),
  { ssr: false, loading: () => <div className="w-28 h-7 bg-gray-100 rounded-lg animate-pulse" /> }
);

function SinglePDFBtn({ docKey }: { docKey: "A" | "B" | "C"; color: string }) {
  return <IndividualPDFBtn docKey={docKey} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CurriculumPage() {
  const [tab, setTab] = useState<Tab>("alli");

  const tabs: { key: Tab; label: string; icon: React.ReactNode; active: string; inactive: string }[] = [
    {
      key: "alli",
      label: "Alli Works 강의안",
      icon: <Presentation size={14} />,
      active:   "bg-violet-600 text-white shadow-sm",
      inactive: "text-gray-600 hover:bg-gray-100",
    },
    {
      key: "hana-ai",
      label: "AI 리터러시 교육",
      icon: <Shield size={14} />,
      active:   "bg-emerald-600 text-white shadow-sm",
      inactive: "text-gray-600 hover:bg-gray-100",
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ── Top header with tab switcher ──────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
              <BookOpen size={13} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">교육 강의안</span>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === t.key ? t.active : t.inactive
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {tab === "alli"     && <AlliTab />}
        {tab === "hana-ai"  && <HanaAITab />}
      </div>
    </div>
  );
}

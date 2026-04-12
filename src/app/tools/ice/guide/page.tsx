"use client";

import Link from "next/link";
import { ChevronLeft, Zap, Shield, Wrench, CheckCircle2, Clock, AlertCircle, Plus } from "lucide-react";

const CRITERIA = [
  {
    abbr: "I",
    label: "Impact",
    subLabel: "임팩트",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    iconBg: "bg-rose-100",
    icon: <Zap size={20} className="text-rose-600" />,
    desc: "이 문제를 해결했을 때 업무에 얼마나 큰 효과가 있나요?",
    rows: [
      { score: "9~10", label: "주 5시간 이상 절감, 매출·리스크에 직접 영향" },
      { score: "7~8",  label: "주 2~4시간 절감, 오류율 대폭 감소" },
      { score: "4~6",  label: "주 1시간 이하 절감, 편의성 개선" },
      { score: "1~3",  label: "체감 효과 미미, 있으면 좋은 수준" },
    ],
  },
  {
    abbr: "C",
    label: "Confidence",
    subLabel: "확신도",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    iconBg: "bg-indigo-100",
    icon: <Shield size={20} className="text-indigo-600" />,
    desc: "이 문제가 실제로 존재하고 AI로 해결 가능하다고 얼마나 확신하나요?",
    rows: [
      { score: "9~10", label: "데이터·수치로 문제 존재 입증 가능" },
      { score: "7~8",  label: "팀원 과반이 동일 문제 경험" },
      { score: "4~6",  label: "일부만 경험, 빈도 불확실" },
      { score: "1~3",  label: "추측 수준, 근거 데이터 없음" },
    ],
  },
  {
    abbr: "E",
    label: "Ease",
    subLabel: "실현 용이성",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    iconBg: "bg-emerald-100",
    icon: <Wrench size={20} className="text-emerald-600" />,
    desc: "올거나이즈(Alli)로 구현하는 것이 얼마나 쉬운가요?",
    rows: [
      { score: "9~10", label: "문서 업로드 + Q&A 에이전트로 해결 (1~2시간)" },
      { score: "7~8",  label: "노드 3~5개 워크플로우로 해결 (반나절)" },
      { score: "4~6",  label: "외부 시스템 API 연동 필요 (1~2일)" },
      { score: "1~3",  label: "핵심 데이터가 외부 시스템에 있어 연동 난이도 높음" },
    ],
  },
];

const PRIORITY_GUIDE = [
  {
    range: "500점 이상", label: "즉시 실행", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",
    icon: <Zap size={14} className="text-emerald-600" />,
    desc: "워크숍 당일 프로토타입 제작 대상",
  },
  {
    range: "200~499점", label: "우선 검토", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200",
    icon: <CheckCircle2 size={14} className="text-indigo-600" />,
    desc: "다음 스프린트 후보 항목",
  },
  {
    range: "100~199점", label: "장기 과제", color: "text-amber-700", bg: "bg-amber-50 border-amber-200",
    icon: <Clock size={14} className="text-amber-600" />,
    desc: "추가 검토 후 로드맵에 편입",
  },
  {
    range: "100점 미만", label: "보류", color: "text-gray-500", bg: "bg-gray-50 border-gray-200",
    icon: <AlertCircle size={14} className="text-gray-400" />,
    desc: "이번 워크숍 범위 외로 분리",
  },
];

const FLOW_STEPS = [
  { step: "사전 준비\n(1~2주 전)", items: ["Pain Point 설문 링크 생성", "참가자 20명에게 설문 배포", "응답 수집 및 모니터링"] },
  { step: "Session 1\n(60분)", items: ["ICE 채점 기준 설명 (5분)", "Pain Point 목록 공유 (10분)", "팀별 I·C·E 점수 부여 (30분)", "상위 항목 합의 선정 (15분)"] },
  { step: "Session 2\n(60분)", items: ["선정된 항목 프로토타입 설계", "올거나이즈 구현 실습", "팀별 결과 발표 및 피드백"] },
  { step: "결과 활용", items: ["ICE Score 결과 CSV 저장", "Quick Win 항목 즉시 개발 착수", "로드맵에 중장기 과제 편입"] },
];

export default function ICEGuidePage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/tools/ice" className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ICE 프레임워크 가이드</h1>
            <p className="text-sm text-gray-500 mt-0.5">AI 에이전트 개발 우선순위 선정 방법론</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-8 max-w-3xl mx-auto w-full">

        {/* 1. What is ICE */}
        <section className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-2xl p-6">
          <h2 className="text-base font-bold text-indigo-900 mb-3">ICE 프레임워크란?</h2>
          <p className="text-sm text-indigo-800 leading-relaxed mb-4">
            ICE는 여러 아이디어나 Pain Point 중 <strong>어떤 것을 먼저 만들 것인가</strong>를 팀이
            주관적 느낌이 아닌 <strong>숫자 근거</strong>로 합의하게 해주는 우선순위 결정 도구입니다.
          </p>
          <div className="bg-white/70 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-3 text-2xl font-black">
              <span className="text-rose-600 bg-rose-50 px-4 py-2 rounded-xl border border-rose-200">I</span>
              <span className="text-gray-400 text-base font-bold">×</span>
              <span className="text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-200">C</span>
              <span className="text-gray-400 text-base font-bold">×</span>
              <span className="text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">E</span>
              <span className="text-gray-400 text-base font-bold">=</span>
              <span className="text-gray-800 bg-gray-100 px-4 py-2 rounded-xl border border-gray-200">ICE Score</span>
            </div>
            <p className="text-xs text-gray-500 mt-3">각 항목을 1~10점으로 평가 · 최대 1,000점</p>
          </div>
        </section>

        {/* 2. Criteria cards */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">채점 기준</h2>
          <div className="space-y-4">
            {CRITERIA.map((c) => (
              <div key={c.abbr} className={`${c.bg} border ${c.border} rounded-2xl p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center`}>
                    {c.icon}
                  </div>
                  <div>
                    <div className={`text-base font-bold ${c.color}`}>{c.abbr} · {c.label}</div>
                    <div className="text-xs text-gray-500">{c.subLabel}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3 leading-relaxed">{c.desc}</p>
                <div className="bg-white/70 rounded-xl overflow-hidden">
                  {c.rows.map((row) => (
                    <div key={row.score} className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 last:border-0">
                      <span className={`text-xs font-bold ${c.color} w-12 shrink-0`}>{row.score}점</span>
                      <span className="text-xs text-gray-600">{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Example */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">채점 예시</h2>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 grid grid-cols-12 text-[11px] font-semibold text-gray-500 gap-2">
              <span className="col-span-5">Pain Point</span>
              <span className="col-span-1 text-center">I</span>
              <span className="col-span-1 text-center">C</span>
              <span className="col-span-1 text-center">E</span>
              <span className="col-span-2 text-center font-bold">ICE</span>
              <span className="col-span-2 text-center">판정</span>
            </div>
            {[
              { text: "사규/규정집 질문 자동 응답", i: 8, c: 9, e: 9, priority: "즉시 실행", pc: "text-emerald-600" },
              { text: "신입사원 온보딩 Q&A 봇", i: 7, c: 8, e: 9, priority: "즉시 실행", pc: "text-emerald-600" },
              { text: "리서치 보고서 요약 자동화", i: 9, c: 7, e: 7, priority: "우선 검토", pc: "text-indigo-600" },
              { text: "고객 계약서 핵심 조항 추출", i: 8, c: 8, e: 5, priority: "우선 검토", pc: "text-indigo-600" },
              { text: "ERP 데이터 자동 리포팅", i: 9, c: 6, e: 2, priority: "보류", pc: "text-gray-400" },
            ].map((row) => (
              <div key={row.text} className="px-4 py-2.5 grid grid-cols-12 items-center border-b border-gray-100 last:border-0 gap-2 hover:bg-gray-50 transition-colors">
                <span className="col-span-5 text-xs text-gray-700">{row.text}</span>
                <span className="col-span-1 text-center text-xs font-bold text-rose-600">{row.i}</span>
                <span className="col-span-1 text-center text-xs font-bold text-indigo-600">{row.c}</span>
                <span className="col-span-1 text-center text-xs font-bold text-emerald-600">{row.e}</span>
                <span className="col-span-2 text-center text-sm font-extrabold text-gray-800">{row.i * row.c * row.e}</span>
                <span className={`col-span-2 text-center text-[10px] font-semibold ${row.pc}`}>{row.priority}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Priority guide */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">점수 해석 가이드</h2>
          <div className="grid grid-cols-2 gap-3">
            {PRIORITY_GUIDE.map((p) => (
              <div key={p.label} className={`${p.bg} border rounded-xl p-4`}>
                <div className={`flex items-center gap-1.5 mb-1 ${p.color} font-bold text-sm`}>
                  {p.icon}
                  {p.label}
                </div>
                <p className="text-xs text-gray-500 font-medium">{p.range}</p>
                <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Flow */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">워크숍 활용 흐름</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FLOW_STEPS.map((f, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700 whitespace-pre-line leading-tight">{f.step}</span>
                </div>
                <ul className="space-y-1">
                  {f.items.map((item) => (
                    <li key={item} className="flex items-start gap-1 text-[11px] text-gray-600">
                      <span className="text-indigo-400 mt-0.5 shrink-0">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Quadrant explanation */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">Impact × Ease 사분면 매트릭스</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { q: "Quick Win ★", desc: "Impact 높음 + Ease 높음", note: "워크숍에서 당일 제작", bg: "bg-emerald-50 border-emerald-200" },
                { q: "전략 과제", desc: "Impact 높음 + Ease 낮음", note: "중장기 로드맵 편입", bg: "bg-indigo-50 border-indigo-200" },
                { q: "패스", desc: "Impact 낮음 + Ease 높음", note: "우선순위 낮음", bg: "bg-gray-50 border-gray-200" },
                { q: "장기 검토", desc: "Impact 낮음 + Ease 낮음", note: "현재는 보류", bg: "bg-amber-50 border-amber-200" },
              ].map((cell) => (
                <div key={cell.q} className={`${cell.bg} border rounded-xl p-3`}>
                  <p className="text-xs font-bold text-gray-700">{cell.q}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{cell.desc}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{cell.note}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              ICE Score가 높더라도 Ease가 낮은 항목(전략 과제)은 당장 워크숍에서 만들기 어렵습니다.
              <strong className="text-gray-700"> Quick Win 영역</strong>을 워크숍 첫 번째 구현 대상으로 선정하고,
              전략 과제는 별도 프로젝트로 추진하는 것을 권장합니다.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="flex gap-3 pb-4">
          <Link href="/tools/ice" className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors">
            <ChevronLeft size={15} />
            대시보드로
          </Link>
          <Link href="/tools/ice/new" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
            <Plus size={15} />
            새 ICE 만들기
          </Link>
        </div>
      </div>
    </div>
  );
}

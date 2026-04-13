"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Clock,
  Users,
  ChevronRight,
  Loader2,
  BookOpen,
  Zap,
  ArrowRight,
  ExternalLink,
  Layers,
  Bot,
  MessageSquare,
  FileText,
} from "lucide-react";

type Scenario = {
  scenario_key: string;
  title: string;
  department: string;
  pain_point: string;
  alli_app_type: string;
  alli_nodes: string[];
  difficulty: string;
  duration_minutes: number;
  ice_impact: number;
  ice_confidence: number;
  ice_ease: number;
  sort_order: number;
  workflow_steps: { step: number; title: string }[];
};

const DEPT_TABS = [
  { key: "all", label: "전체", icon: Layers },
  { key: "WM", label: "WM", icon: Users },
  { key: "IB", label: "IB", icon: Zap },
  { key: "S&T", label: "S&T", icon: BookOpen },
  { key: "경영지원", label: "경영지원", icon: FileText },
];

const DEPT_COLORS: Record<string, string> = {
  WM: "bg-blue-500",
  IB: "bg-purple-500",
  "S&T": "bg-orange-500",
  경영지원: "bg-teal-500",
};

const APP_TYPE_META: Record<string, { label: string; icon: typeof Bot; color: string; bg: string }> = {
  interactive: { label: "대화형", icon: MessageSquare, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  agent: { label: "에이전트형", icon: Bot, color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  answer: { label: "답변형", icon: FileText, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
};

const DIFFICULTY_META: Record<string, { label: string; color: string; bg: string }> = {
  beginner: { label: "초급", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  intermediate: { label: "중급", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  advanced: { label: "고급", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

export default function TrainingDashboard() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("all");

  useEffect(() => {
    fetch("/api/tools/training")
      .then((r) => r.json())
      .then((d) => setScenarios(d.scenarios ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    deptFilter === "all"
      ? scenarios
      : scenarios.filter((s) => s.department === deptFilter);

  const appTypeCounts = scenarios.reduce(
    (acc, s) => {
      acc[s.alli_app_type] = (acc[s.alli_app_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap size={18} className="text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900">
                Alli Works 실습 가이드북
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              부서별 업무 시나리오를 Alli Works에서 직접 구축하며 익히는 핸즈온
              가이드
            </p>
          </div>
          <a
            href="https://docs.allganize.ai/allganize-alli-works"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors"
          >
            <ExternalLink size={14} />
            Alli 유저가이드
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
        {/* Curriculum Overview */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BookOpen size={14} className="text-indigo-500" />
            커리큘럼 개요
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  1
                </span>
                <h4 className="text-xs font-bold text-blue-800">
                  1회차 (기획/설계) — 4시간
                </h4>
              </div>
              <div className="space-y-1.5 ml-8">
                {[
                  {
                    session: "Session 1",
                    title: "Pain Point 발굴 및 과제 정의",
                    detail:
                      "현업 Pain Point 도출 + ICE 프레임워크로 핵심 문제 선별",
                    time: "60'",
                  },
                  {
                    session: "Session 2",
                    title: "에이전트 로직 설계 및 PRD 작성",
                    detail:
                      "AI 에이전트 사고 방식 설계, 데이터 소스 정의, 워크플로우 다이어그램",
                    time: "60'",
                  },
                  {
                    session: "Session 3",
                    title: "올거나이즈(Alli) 실무 마스터링",
                    detail:
                      "LLM App Builder 인터페이스, 주요 노드 활용법, RAG 설정 및 문서 업로드",
                    time: "60'",
                  },
                ].map((s) => (
                  <div key={s.session} className="flex items-start gap-2">
                    <span className="text-[10px] text-blue-500 font-mono shrink-0 mt-0.5">
                      {s.time}
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-blue-800">
                        {s.title}
                      </p>
                      <p className="text-[10px] text-blue-600">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                  2
                </span>
                <h4 className="text-xs font-bold text-purple-800">
                  2회차 (구축/검증) — 3시간
                </h4>
              </div>
              <div className="space-y-1.5 ml-8">
                {[
                  {
                    session: "Session 4",
                    title: "AI 에이전트 프로토타이핑 및 고도화",
                    detail:
                      "1회차 설계 로직을 Alli Works에서 직접 구현 실습",
                    time: "120'",
                  },
                  {
                    session: "Session 5",
                    title: "프로토타입 시연 및 피드백",
                    detail: "결과물 공유 및 현업 적용 가능성 검토",
                    time: "60'",
                  },
                ].map((s) => (
                  <div key={s.session} className="flex items-start gap-2">
                    <span className="text-[10px] text-purple-500 font-mono shrink-0 mt-0.5">
                      {s.time}
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-purple-800">
                        {s.title}
                      </p>
                      <p className="text-[10px] text-purple-600">
                        {s.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* App Type Summary */}
        <div className="grid grid-cols-3 gap-3">
          {(["interactive", "agent", "answer"] as const).map((type) => {
            const meta = APP_TYPE_META[type];
            const Icon = meta.icon;
            return (
              <div
                key={type}
                className={`border rounded-xl p-3 ${meta.bg}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={meta.color} />
                  <span className={`text-xs font-semibold ${meta.color}`}>
                    {meta.label} 앱
                  </span>
                </div>
                <div className={`text-2xl font-extrabold ${meta.color}`}>
                  {appTypeCounts[type] || 0}
                </div>
                <div className="text-[10px] text-gray-500">시나리오</div>
              </div>
            );
          })}
        </div>

        {/* Department Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {DEPT_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setDeptFilter(tab.key)}
                className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                  deptFilter === tab.key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
          <div className="ml-auto text-xs text-gray-400">
            {filtered.length}개 시나리오
          </div>
        </div>

        {/* Scenario Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 flex flex-col items-center gap-3 text-gray-400">
            <GraduationCap size={32} className="text-gray-300" />
            <p className="text-sm font-medium">해당 부서의 시나리오가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const appMeta = APP_TYPE_META[s.alli_app_type] ?? APP_TYPE_META.interactive;
              const diffMeta = DIFFICULTY_META[s.difficulty] ?? DIFFICULTY_META.intermediate;
              const deptColor = DEPT_COLORS[s.department] ?? "bg-gray-500";
              const iceTotal = s.ice_impact + s.ice_confidence + s.ice_ease;
              const AppIcon = appMeta.icon;

              return (
                <Link
                  key={s.scenario_key}
                  href={`/tools/training/${s.scenario_key}`}
                  className="block bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl ${deptColor} flex items-center justify-center shrink-0`}
                    >
                      <span className="text-xs font-bold text-white">
                        {s.department}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                          {s.title}
                        </h3>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${appMeta.bg} ${appMeta.color}`}
                        >
                          <AppIcon size={10} />
                          {appMeta.label}
                        </span>
                        <span
                          className={`shrink-0 inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${diffMeta.bg} ${diffMeta.color}`}
                        >
                          {diffMeta.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                        {s.pain_point}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {s.duration_minutes}분
                        </span>
                        <span className="font-medium text-indigo-500">
                          ICE {iceTotal}점
                        </span>
                        <span className="text-gray-400">
                          {s.workflow_steps.length}단계
                        </span>
                        <div className="flex items-center gap-1">
                          {s.alli_nodes.slice(0, 3).map((n) => (
                            <span
                              key={n}
                              className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px]"
                            >
                              {n}
                            </span>
                          ))}
                          {s.alli_nodes.length > 3 && (
                            <span className="text-[9px] text-gray-400">
                              +{s.alli_nodes.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-gray-300 group-hover:text-indigo-400 transition-colors mt-2 shrink-0"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ICE + Alli Docs Link */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/tools/ice"
            className="flex-1 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 hover:border-indigo-300 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-indigo-900">
                  ICE 프레임워크 평가
                </h3>
                <p className="text-xs text-indigo-600 mt-0.5">
                  시나리오별 Impact/Confidence/Ease 점수로 우선순위 확인
                </p>
              </div>
              <ArrowRight
                size={16}
                className="text-indigo-400 group-hover:text-indigo-600 transition-colors"
              />
            </div>
          </Link>
          <a
            href="https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/conversation-app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 hover:border-emerald-300 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-emerald-900">
                  Alli Works 노드 레퍼런스
                </h3>
                <p className="text-xs text-emerald-600 mt-0.5">
                  대화형 앱 빌더의 전체 노드 목록 및 사용법
                </p>
              </div>
              <ExternalLink
                size={16}
                className="text-emerald-400 group-hover:text-emerald-600 transition-colors"
              />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

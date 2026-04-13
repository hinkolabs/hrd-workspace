"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  Users,
  Loader2,
  CheckCircle2,
  BookOpen,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Bot,
  MessageSquare,
  FileText,
  MapPin,
  Zap,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

type WorkflowStep = {
  step: number;
  title: string;
  where: string;
  action: string;
  detail: string;
  nodes?: string[];
  docRef?: string;
  sampleFile?: string;
  sampleLabel?: string;
};

type Scenario = {
  scenario_key: string;
  title: string;
  department: string;
  pain_point: string;
  expected_outcome: string;
  alli_app_type: string;
  alli_nodes: string[];
  difficulty: string;
  duration_minutes: number;
  ice_impact: number;
  ice_confidence: number;
  ice_ease: number;
  prep_documents: string[];
  workflow_steps: WorkflowStep[];
  workflow_diagram: string[];
  eval_criteria: string[];
  reference_links: { label: string; url: string }[];
};

const DEPT_COLORS: Record<string, string> = {
  WM: "bg-blue-500",
  IB: "bg-purple-500",
  "S&T": "bg-orange-500",
  경영지원: "bg-teal-500",
};

const APP_TYPE_META: Record<
  string,
  { label: string; icon: typeof Bot; color: string; bg: string }
> = {
  interactive: {
    label: "대화형 앱",
    icon: MessageSquare,
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  agent: {
    label: "에이전트형 앱",
    icon: Bot,
    color: "text-violet-700",
    bg: "bg-violet-50",
  },
  answer: {
    label: "답변형 앱",
    icon: FileText,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
};

const DIFFICULTY_META: Record<string, { label: string; color: string; bg: string }> = {
  beginner: { label: "초급", color: "text-emerald-700", bg: "bg-emerald-50" },
  intermediate: { label: "중급", color: "text-amber-700", bg: "bg-amber-50" },
  advanced: { label: "고급", color: "text-red-700", bg: "bg-red-50" },
};

export default function TrainingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scenarioKey = params.id as string;

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const [checks, setChecks] = useState<boolean[]>([]);

  useEffect(() => {
    fetch(`/api/tools/training/${scenarioKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.scenario) {
          setScenario(d.scenario);
          setChecks(new Array(d.scenario.eval_criteria.length).fill(false));
        }
      })
      .finally(() => setLoading(false));
  }, [scenarioKey]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">시나리오를 찾을 수 없습니다</p>
          <button
            onClick={() => router.push("/tools/training")}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const appMeta = APP_TYPE_META[scenario.alli_app_type] ?? APP_TYPE_META.interactive;
  const diffMeta = DIFFICULTY_META[scenario.difficulty] ?? DIFFICULTY_META.intermediate;
  const deptColor = DEPT_COLORS[scenario.department] ?? "bg-gray-500";
  const iceTotal = scenario.ice_impact + scenario.ice_confidence + scenario.ice_ease;
  const AppIcon = appMeta.icon;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/tools/training")}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold text-white ${deptColor}`}
              >
                {scenario.department}
              </span>
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {scenario.title}
              </h1>
              <span
                className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${appMeta.bg} ${appMeta.color}`}
              >
                <AppIcon size={10} />
                {appMeta.label}
              </span>
              <span
                className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${diffMeta.bg} ${diffMeta.color}`}
              >
                {diffMeta.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {scenario.duration_minutes}분
              </span>
              <span className="font-medium text-indigo-500">
                ICE {iceTotal}점 (I:{scenario.ice_impact} C:
                {scenario.ice_confidence} E:{scenario.ice_ease})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content — single column scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Pain Point & Expected Outcome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-red-500" />
                <h3 className="text-xs font-bold text-red-800">
                  Pain Point (해결할 문제)
                </h3>
              </div>
              <p className="text-xs text-red-700 leading-relaxed">
                {scenario.pain_point}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-emerald-500" />
                <h3 className="text-xs font-bold text-emerald-800">
                  Expected Outcome (기대 효과)
                </h3>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                {scenario.expected_outcome}
              </p>
            </div>
          </div>

          {/* Workflow Diagram */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Zap size={14} className="text-indigo-500" />
              Alli Works 워크플로우
            </h3>
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
              {scenario.workflow_diagram.map((node, idx) => (
                <div key={idx} className="flex items-center shrink-0">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-center min-w-[100px]">
                    <p className="text-[10px] font-semibold text-indigo-800 whitespace-nowrap">
                      {node}
                    </p>
                  </div>
                  {idx < scenario.workflow_diagram.length - 1 && (
                    <ArrowRight
                      size={14}
                      className="text-indigo-300 mx-1 shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-400">사용 노드:</span>
              {scenario.alli_nodes.map((n) => (
                <span
                  key={n}
                  className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-medium"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>

          {/* Step-by-Step Implementation Guide */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpen size={14} className="text-indigo-500" />
              단계별 구현 가이드
            </h3>
            <div className="space-y-2">
              {scenario.workflow_steps.map((ws, idx) => {
                const isExpanded = expandedStep === idx;
                return (
                  <div
                    key={ws.step}
                    className={`border rounded-xl transition-all ${
                      isExpanded
                        ? "border-indigo-200 bg-indigo-50/30"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <button
                      onClick={() =>
                        setExpandedStep(isExpanded ? null : idx)
                      }
                      className="w-full text-left p-4 flex items-start gap-3"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          isExpanded
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {ws.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            isExpanded ? "text-indigo-700" : "text-gray-800"
                          }`}
                        >
                          {ws.title}
                        </p>
                        {!isExpanded && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {ws.action}
                          </p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp
                          size={16}
                          className="text-indigo-400 shrink-0 mt-1"
                        />
                      ) : (
                        <ChevronDown
                          size={16}
                          className="text-gray-300 shrink-0 mt-1"
                        />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 ml-10 space-y-3">
                        {/* Where */}
                        <div className="flex items-start gap-2">
                          <MapPin
                            size={12}
                            className="text-gray-400 mt-0.5 shrink-0"
                          />
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium">
                              WHERE (Alli Works 위치)
                            </p>
                            <p className="text-xs text-gray-700 font-mono bg-gray-50 px-2 py-1 rounded mt-0.5">
                              {ws.where}
                            </p>
                          </div>
                        </div>

                        {/* Action */}
                        <div className="flex items-start gap-2">
                          <Zap
                            size={12}
                            className="text-indigo-400 mt-0.5 shrink-0"
                          />
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium">
                              ACTION (수행 작업)
                            </p>
                            <p className="text-xs text-gray-800 font-medium mt-0.5">
                              {ws.action}
                            </p>
                          </div>
                        </div>

                        {/* Detail */}
                        <div className="bg-white border border-gray-100 rounded-lg p-3">
                          <p className="text-[10px] text-gray-400 font-medium mb-1">
                            DETAIL (상세 설명)
                          </p>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {ws.detail}
                          </p>
                        </div>

                        {/* Nodes used */}
                        {ws.nodes && ws.nodes.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-gray-400">
                              사용 노드:
                            </span>
                            {ws.nodes.map((n) => (
                              <span
                                key={n}
                                className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-medium"
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          {ws.docRef && (
                            <a
                              href={ws.docRef}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg"
                            >
                              <ExternalLink size={10} />
                              Alli 유저가이드 참조
                            </a>
                          )}

                          {ws.sampleFile && (
                            <a
                              href={ws.sampleFile}
                              download
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                            >
                              <Download size={10} />
                              {ws.sampleLabel ?? "샘플 파일 다운로드"}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prep Documents */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-800 mb-3">
              사전 준비물
            </h3>
            <ul className="space-y-1.5">
              {scenario.prep_documents.map((d, i) => (
                <li
                  key={i}
                  className="text-xs text-gray-600 flex items-start gap-2"
                >
                  <FileText
                    size={12}
                    className="text-gray-400 mt-0.5 shrink-0"
                  />
                  {d}
                </li>
              ))}
            </ul>
          </div>

          {/* Eval Checklist */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-800">
                구현 체크리스트
              </h3>
              <span className="text-[10px] text-gray-400">
                {checks.filter(Boolean).length}/{checks.length} 완료
              </span>
            </div>
            <div className="space-y-2">
              {scenario.eval_criteria.map((c, i) => (
                <label
                  key={i}
                  className="flex items-start gap-2.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={checks[i] ?? false}
                    onChange={() =>
                      setChecks((prev) =>
                        prev.map((v, j) => (j === i ? !v : v)),
                      )
                    }
                    className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span
                    className={`text-xs transition-colors ${
                      checks[i]
                        ? "text-indigo-600 line-through"
                        : "text-gray-700 group-hover:text-gray-900"
                    }`}
                  >
                    {c}
                  </span>
                  {checks[i] && (
                    <CheckCircle2
                      size={12}
                      className="text-indigo-500 shrink-0 mt-0.5"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Reference Links */}
          {scenario.reference_links.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-800 mb-3">
                Alli Works 참고 문서
              </h3>
              <div className="space-y-1.5">
                {scenario.reference_links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink size={11} className="shrink-0" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

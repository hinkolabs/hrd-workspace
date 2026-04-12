"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClipboardList, Loader2, Copy, Check, Trash2, FileText,
  ChevronRight, Calendar, BarChart2, TrendingUp, FolderKanban,
  StickyNote, CheckSquare, AlertCircle, Info,
} from "lucide-react";

type Stats = { totalTodos: number; done: number; inProgress: number; pending: number; memos: number };

type PreviewData = {
  period: { start: string; end: string };
  todos: {
    total: number; done: number; inProgress: number; pending: number;
    items: { title: string; status: string; priority: string; due_date: string | null }[];
  };
  memos: { total: number; items: { title: string }[] };
} | null;

type SavedReport = {
  id: string;
  title: string;
  period: string;
  report_type?: string;
  stats: Stats | null;
  created_at: string;
};

type ReportDetail = SavedReport & { content: string };

const REPORT_TYPES = [
  { value: "weekly_work",    label: "주간 업무",    icon: ClipboardList, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { value: "monthly_work",   label: "월간 업무",    icon: Calendar,       color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "performance",    label: "성과 분석",    icon: BarChart2,      color: "text-green-600 bg-green-50 border-green-200" },
  { value: "project_status", label: "프로젝트 현황", icon: FolderKanban,  color: "text-orange-600 bg-orange-50 border-orange-200" },
] as const;

const PERIOD_PRESETS = [
  { value: "weekly",      label: "7일",   days: 7 },
  { value: "biweekly",   label: "14일",  days: 14 },
  { value: "monthly",    label: "30일",  days: 30 },
  { value: "quarterly",  label: "90일",  days: 90 },
];

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  weekly_work:    { label: "주간",   cls: "bg-indigo-100 text-indigo-600" },
  monthly_work:   { label: "월간",   cls: "bg-blue-100 text-blue-600" },
  performance:    { label: "성과",   cls: "bg-green-100 text-green-600" },
  project_status: { label: "현황",   cls: "bg-orange-100 text-orange-600" },
};

function today() {
  return new Date().toISOString().split("T")[0];
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export default function ReportPage() {
  const [reportType, setReportType] = useState<string>("weekly_work");
  const [periodMode, setPeriodMode] = useState<"preset" | "custom">("preset");
  const [period, setPeriod] = useState("weekly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // 날짜 초기화는 클라이언트에서만 (hydration 방지)
  useEffect(() => {
    setStartDate(daysAgo(7));
    setEndDate(today());
  }, []);

  // 기간 변경 시 데이터 미리보기 자동 갱신 (debounce 500ms)
  const fetchPreview = useCallback(async (pMode: string, pPeriod: string, pStart: string, pEnd: string) => {
    if (!pStart || !pEnd) return;
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams(
        pMode === "preset"
          ? { period: pPeriod }
          : { period: "custom", startDate: pStart, endDate: pEnd }
      );
      const res = await fetch(`/api/tools/report/preview?${params}`);
      if (res.ok) setPreview(await res.json());
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      fetchPreview(periodMode, period, startDate, endDate);
    }, 400);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [periodMode, period, startDate, endDate, fetchPreview]);

  const [preview, setPreview] = useState<PreviewData>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/tools/report");
      if (res.ok) setSavedReports(await res.json());
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // 프리셋 변경 시 날짜도 동기화
  function handlePresetChange(val: string) {
    setPeriod(val);
    const preset = PERIOD_PRESETS.find((p) => p.value === val);
    if (preset) {
      setStartDate(daysAgo(preset.days));
      setEndDate(today());
    }
  }

  async function generate() {
    setLoading(true);
    setError("");
    setSelectedReport(null);
    try {
      const body: Record<string, string> = { reportType };
      if (periodMode === "preset") {
        body.period = period;
      } else {
        body.period = "custom";
        body.startDate = startDate;
        body.endDate = endDate;
      }

      const res = await fetch("/api/tools/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setSelectedReport({
        id: data.id || "",
        title: data.title,
        period: body.period,
        report_type: data.report_type,
        stats: data.stats,
        created_at: new Date().toISOString(),
        content: data.report,
      });
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  }

  async function loadReport(id: string) {
    if (selectedReport?.id === id) return;
    try {
      const res = await fetch(`/api/tools/report/${id}`);
      if (res.ok) setSelectedReport(await res.json());
    } catch {
      setError("보고서를 불러올 수 없습니다.");
    }
  }

  async function deleteReport(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("이 보고서를 삭제할까요?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tools/report/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setSavedReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedReport?.id === id) setSelectedReport(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  }

  function copyReport() {
    if (!selectedReport?.content) return;
    navigator.clipboard.writeText(selectedReport.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedType = REPORT_TYPES.find((t) => t.value === reportType);

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-xl font-bold text-gray-900">업무 보고서 자동 생성</h1>
        <p className="text-sm text-gray-500 mt-0.5">보고서 유형과 기간을 선택하면 AI가 자동으로 작성합니다</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽: 옵션 + 저장된 보고서 목록 */}
        <div className="w-72 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">

          {/* 옵션 패널 */}
          <div className="p-3 border-b border-gray-200 bg-white space-y-3">

            {/* 보고서 유형 */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">보고서 유형</p>
              <div className="grid grid-cols-2 gap-1.5">
                {REPORT_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setReportType(value)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                      reportType === value
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 기간 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">기간</p>
                <div className="flex rounded-md overflow-hidden border border-gray-200 text-[10px]">
                  <button
                    onClick={() => setPeriodMode("preset")}
                    className={`px-2 py-0.5 font-medium transition-colors ${periodMode === "preset" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                  >
                    프리셋
                  </button>
                  <button
                    onClick={() => setPeriodMode("custom")}
                    className={`px-2 py-0.5 font-medium transition-colors ${periodMode === "custom" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                  >
                    직접입력
                  </button>
                </div>
              </div>

              {periodMode === "preset" ? (
                <div className="grid grid-cols-4 gap-1">
                  {PERIOD_PRESETS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handlePresetChange(opt.value)}
                      className={`py-1.5 text-xs rounded-lg font-medium transition-colors ${
                        period === opt.value
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 w-7 shrink-0">시작</span>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 w-7 shrink-0">종료</span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      max={today()}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 데이터 미리보기 */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-2.5 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-500 flex items-center gap-1">
                  <Info size={10} />
                  분석 데이터 미리보기
                </span>
                {previewLoading && <Loader2 size={10} className="animate-spin text-gray-400" />}
              </div>

              {preview ? (
                <div className="p-2.5 space-y-2">
                  {/* 데이터 출처 안내 */}
                  <p className="text-[9px] text-gray-400 leading-relaxed">
                    <span className="font-medium text-gray-500">칸반 할일</span>과 <span className="font-medium text-gray-500">메모 게시판</span> 데이터를 기반으로 보고서를 생성합니다.
                  </p>

                  {/* 할일 현황 */}
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <CheckSquare size={10} className="text-indigo-500" />
                      <span className="text-[10px] font-medium text-gray-600">
                        할일 {preview.todos.total}건
                      </span>
                      {preview.todos.total === 0 && (
                        <span className="text-[9px] text-amber-500 flex items-center gap-0.5">
                          <AlertCircle size={9} /> 데이터 없음
                        </span>
                      )}
                    </div>
                    {preview.todos.total > 0 && (
                      <div className="flex gap-1.5 text-[9px]">
                        <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">완료 {preview.todos.done}</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">진행 {preview.todos.inProgress}</span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">대기 {preview.todos.pending}</span>
                      </div>
                    )}
                    {preview.todos.items.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {preview.todos.items.slice(0, 4).map((t, i) => (
                          <li key={i} className="text-[9px] text-gray-400 truncate flex items-center gap-1">
                            <span className={`shrink-0 w-1 h-1 rounded-full ${
                              t.status === "done" ? "bg-green-400" :
                              t.status === "in_progress" ? "bg-blue-400" : "bg-gray-300"
                            }`} />
                            {t.title}
                          </li>
                        ))}
                        {preview.todos.items.length > 4 && (
                          <li className="text-[9px] text-gray-400">외 {preview.todos.items.length - 4}건 더...</li>
                        )}
                      </ul>
                    )}
                  </div>

                  {/* 메모 현황 */}
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <StickyNote size={10} className="text-yellow-500" />
                      <span className="text-[10px] font-medium text-gray-600">
                        메모 {preview.memos.total}건
                      </span>
                      {preview.memos.total === 0 && (
                        <span className="text-[9px] text-amber-500 flex items-center gap-0.5">
                          <AlertCircle size={9} /> 데이터 없음
                        </span>
                      )}
                    </div>
                    {preview.memos.items.length > 0 && (
                      <ul className="mt-0.5 space-y-0.5">
                        {preview.memos.items.slice(0, 3).map((m, i) => (
                          <li key={i} className="text-[9px] text-gray-400 truncate flex items-center gap-1">
                            <span className="shrink-0 w-1 h-1 rounded-full bg-yellow-300" />
                            {m.title}
                          </li>
                        ))}
                        {preview.memos.items.length > 3 && (
                          <li className="text-[9px] text-gray-400">외 {preview.memos.items.length - 3}건 더...</li>
                        )}
                      </ul>
                    )}
                  </div>

                  {(preview.todos.total === 0 && preview.memos.total === 0) && (
                    <p className="text-[9px] text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-start gap-1">
                      <AlertCircle size={9} className="mt-0.5 shrink-0" />
                      선택 기간에 데이터가 없습니다. 기간을 늘리거나 칸반·메모에 데이터를 추가하세요.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-2.5 text-[9px] text-gray-400 text-center">
                  {previewLoading ? "데이터 확인 중..." : "기간을 선택하세요"}
                </div>
              )}
            </div>

            {/* 선택 요약 + 생성 버튼 */}
            {selectedType && (
              <div className={`text-[10px] px-2.5 py-1.5 rounded-lg border ${selectedType.color} flex items-center gap-1.5`}>
                <selectedType.icon size={11} />
                <span className="font-medium">{selectedType.label}</span>
                <span className="text-gray-400">·</span>
                <span>
                  {periodMode === "preset"
                    ? `최근 ${PERIOD_PRESETS.find((p) => p.value === period)?.label}`
                    : `${startDate} ~ ${endDate}`}
                </span>
              </div>
            )}

            <button
              onClick={generate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
              {loading ? "생성 중..." : "보고서 생성"}
            </button>
          </div>

          {/* 저장된 보고서 목록 */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                저장된 보고서 ({savedReports.length})
              </span>
            </div>

            {listLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-gray-400" />
              </div>
            ) : savedReports.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400">
                생성된 보고서가 없습니다
              </div>
            ) : (
              <ul className="px-2 pb-3 space-y-1">
                {savedReports.map((r) => {
                  const badge = r.report_type ? TYPE_BADGE[r.report_type] : null;
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => loadReport(r.id)}
                        className={`w-full text-left px-2.5 py-2.5 rounded-lg transition-colors group flex items-start gap-2 ${
                          selectedReport?.id === r.id
                            ? "bg-indigo-50 border border-indigo-200"
                            : "hover:bg-white border border-transparent"
                        }`}
                      >
                        <FileText
                          size={13}
                          className={`mt-0.5 shrink-0 ${selectedReport?.id === r.id ? "text-indigo-500" : "text-gray-400"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            {badge && (
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${badge.cls}`}>
                                {badge.label}
                              </span>
                            )}
                            <p className={`text-xs font-medium truncate leading-tight ${selectedReport?.id === r.id ? "text-indigo-700" : "text-gray-700"}`}>
                              {r.title}
                            </p>
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {new Date(r.created_at).toLocaleDateString("ko-KR", {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                          {r.stats && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              완료 {r.stats.done} · 진행 {r.stats.inProgress} · 대기 {r.stats.pending}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => deleteReport(r.id, e)}
                          disabled={deletingId === r.id}
                          className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 text-gray-400 hover:text-red-500 transition-all"
                          title="삭제"
                        >
                          {deletingId === r.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* 오른쪽: 보고서 뷰어 */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
          )}

          {!selectedReport && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ClipboardList size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">보고서를 생성하거나 목록에서 선택하세요</p>
              <p className="text-xs mt-1 text-gray-300 flex items-center gap-1">
                왼쪽에서 유형·기간 선택 <ChevronRight size={11} /> 생성 버튼 클릭
              </p>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Loader2 size={32} className="animate-spin mb-3 text-indigo-400" />
              <p className="text-sm font-medium">AI가 보고서를 작성하고 있습니다...</p>
              <p className="text-xs mt-1 text-gray-300">
                {selectedType?.label} · {periodMode === "preset"
                  ? `최근 ${PERIOD_PRESETS.find((p) => p.value === period)?.label}`
                  : `${startDate} ~ ${endDate}`}
              </p>
            </div>
          )}

          {selectedReport && !loading && (
            <>
              {/* 통계 */}
              {selectedReport.stats && (
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {[
                    { label: "전체 할일", value: selectedReport.stats.totalTodos, color: "text-gray-900" },
                    { label: "완료", value: selectedReport.stats.done, color: "text-green-600" },
                    { label: "진행중", value: selectedReport.stats.inProgress, color: "text-blue-600" },
                    { label: "대기", value: selectedReport.stats.pending, color: "text-gray-500" },
                    { label: "메모", value: selectedReport.stats.memos, color: "text-indigo-600" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 보고서 본문 */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedReport.report_type && TYPE_BADGE[selectedReport.report_type] && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPE_BADGE[selectedReport.report_type].cls}`}>
                          {TYPE_BADGE[selectedReport.report_type].label}
                        </span>
                      )}
                      <h2 className="font-semibold text-gray-900 text-sm">{selectedReport.title}</h2>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(selectedReport.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyReport}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      {copied ? "복사됨!" : "복사"}
                    </button>
                    {selectedReport.id && (
                      <button
                        onClick={(e) => deleteReport(selectedReport.id, e)}
                        disabled={deletingId === selectedReport.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {deletingId === selectedReport.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                        삭제
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-5 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedReport.content}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

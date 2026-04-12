"use client";

import { useState, useEffect, useCallback } from "react";
import {
  History, StickyNote, CheckSquare, PlusCircle, Pencil, Trash2,
  RefreshCw, Filter, User, Clock, FileText, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";
import type { ActivityLog } from "@/lib/supabase";

/* ────────── 타입 ────────── */
type ConvertRecord = {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  summary: string | null;
  user_display_name: string | null;
  user_id: string | null;
  created_at: string;
};

type TabType = "activity" | "convert";

/* ────────── 활동 로그 상수 ────────── */
const ACTION_LABEL: Record<ActivityLog["action"], string> = {
  create: "작성", update: "수정", delete: "삭제",
};
const ACTION_STYLE: Record<ActivityLog["action"], string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
};
const ACTION_ICON: Record<ActivityLog["action"], React.ReactNode> = {
  create: <PlusCircle size={12} />,
  update: <Pencil size={12} />,
  delete: <Trash2 size={12} />,
};
const ENTITY_LABEL: Record<ActivityLog["entity_type"], string> = {
  memo: "메모", todo: "할일",
};
const ENTITY_ICON: Record<ActivityLog["entity_type"], React.ReactNode> = {
  memo: <StickyNote size={13} className="text-yellow-500" />,
  todo: <CheckSquare size={13} className="text-indigo-500" />,
};

type FilterType   = "all" | "memo" | "todo";
type FilterAction = "all" | "create" | "update" | "delete";

/* ────────── 공통 유틸 ────────── */
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}
function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 마크다운 볼드·목록 간단 렌더링 */
function SummaryText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="text-sm text-gray-700 space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## "))
          return <p key={i} className="font-bold text-gray-900 mt-2 first:mt-0">{line.slice(3)}</p>;
        if (line.startsWith("# "))
          return <p key={i} className="font-bold text-gray-900 text-base mt-2 first:mt-0">{line.slice(2)}</p>;
        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} className="flex gap-2">
              <span className="text-indigo-400 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: boldify(line.slice(2)) }} />
            </div>
          );
        if (/^\d+\.\s/.test(line))
          return (
            <div key={i} className="flex gap-2">
              <span className="text-indigo-500 font-semibold shrink-0 min-w-[18px]">{line.match(/^\d+/)?.[0]}.</span>
              <span dangerouslySetInnerHTML={{ __html: boldify(line.replace(/^\d+\.\s/, "")) }} />
            </div>
          );
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i} dangerouslySetInnerHTML={{ __html: boldify(line) }} />;
      })}
    </div>
  );
}
function boldify(t: string) {
  return t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/* ────────── 메인 페이지 ────────── */
export default function HistoryPage() {
  const [tab, setTab] = useState<TabType>("activity");

  /* 활동 로그 */
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [filterType, setFilterType]     = useState<FilterType>("all");
  const [filterAction, setFilterAction] = useState<FilterAction>("all");
  const [search, setSearch] = useState("");

  /* 문서변환 히스토리 */
  const [converts, setConverts]       = useState<ConvertRecord[]>([]);
  const [convertsLoading, setConvertsLoading] = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [convertSearch, setConvertSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    const params = new URLSearchParams({ limit: "300" });
    if (filterType !== "all") params.set("entity_type", filterType);
    const res = await fetch(`/api/activity-logs?${params}`);
    if (res.ok) setLogs(await res.json());
    setLogsLoading(false);
  }, [filterType]);

  const fetchConverts = useCallback(async () => {
    setConvertsLoading(true);
    const res = await fetch("/api/convert-history?limit=200");
    if (res.ok) setConverts(await res.json());
    setConvertsLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchConverts(); }, [fetchConverts]);

  /* 필터된 활동 로그 */
  const filteredLogs = logs.filter((log) => {
    if (filterAction !== "all" && log.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.entity_title?.toLowerCase().includes(q) ||
        log.user_display_name?.toLowerCase().includes(q) ||
        log.detail?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  /* 필터된 변환 히스토리 */
  const filteredConverts = converts.filter((c) => {
    if (!convertSearch) return true;
    const q = convertSearch.toLowerCase();
    return (
      c.file_name.toLowerCase().includes(q) ||
      c.user_display_name?.toLowerCase().includes(q) ||
      c.summary?.toLowerCase().includes(q)
    );
  });

  const logStats = {
    total: logs.length,
    memos:   logs.filter((l) => l.entity_type === "memo").length,
    todos:   logs.filter((l) => l.entity_type === "todo").length,
    creates: logs.filter((l) => l.action === "create").length,
    updates: logs.filter((l) => l.action === "update").length,
    deletes: logs.filter((l) => l.action === "delete").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <History size={18} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">활동 히스토리</h1>
              <p className="text-sm text-gray-500">메모·할일 이력 및 문서 변환 기록</p>
            </div>
          </div>
          <button
            onClick={() => { fetchLogs(); fetchConverts(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} className={(logsLoading || convertsLoading) ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          <button
            onClick={() => setTab("activity")}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              tab === "activity" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <History size={14} />
            메모·할일 활동
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "activity" ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500"}`}>
              {logs.length}
            </span>
          </button>
          <button
            onClick={() => setTab("convert")}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              tab === "convert" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FileText size={14} />
            문서 변환
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "convert" ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500"}`}>
              {converts.length}
            </span>
          </button>
        </div>

        {/* ── 탭 1: 활동 로그 ── */}
        {tab === "activity" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
              {[
                { label: "전체",  value: logStats.total,   color: "bg-gray-100 text-gray-700" },
                { label: "메모",  value: logStats.memos,   color: "bg-yellow-100 text-yellow-700" },
                { label: "할일",  value: logStats.todos,   color: "bg-indigo-100 text-indigo-700" },
                { label: "작성",  value: logStats.creates, color: "bg-green-100 text-green-700" },
                { label: "수정",  value: logStats.updates, color: "bg-blue-100 text-blue-700" },
                { label: "삭제",  value: logStats.deletes, color: "bg-red-100 text-red-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
              <Filter size={14} className="text-gray-400 shrink-0" />
              <div className="flex gap-1">
                {(["all", "memo", "todo"] as FilterType[]).map((t) => (
                  <button key={t} onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterType === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {t === "all" ? "전체" : ENTITY_LABEL[t]}
                  </button>
                ))}
              </div>
              <div className="w-px h-5 bg-gray-200" />
              <div className="flex gap-1">
                {(["all", "create", "update", "delete"] as FilterAction[]).map((a) => (
                  <button key={a} onClick={() => setFilterAction(a)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterAction === a ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {a === "all" ? "전체" : ACTION_LABEL[a]}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="제목 / 사용자 검색..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ml-auto text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {logsLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <RefreshCw size={20} className="animate-spin mr-2" />불러오는 중...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <History size={32} className="mb-3 opacity-30" />
                  <p className="text-sm">활동 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="mt-0.5 shrink-0">{ENTITY_ICON[log.entity_type]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_STYLE[log.action]}`}>
                            {ACTION_ICON[log.action]}{ACTION_LABEL[log.action]}
                          </span>
                          <span className="text-xs text-gray-500">{ENTITY_LABEL[log.entity_type]}</span>
                          <span className="text-sm font-medium text-gray-900 truncate">{log.entity_title ?? "(제목 없음)"}</span>
                        </div>
                        {log.detail && <p className="text-xs text-gray-500 mt-0.5">{log.detail}</p>}
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          {log.user_display_name && (
                            <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                              <User size={10} />{log.user_display_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={10} />{formatDateTime(log.created_at)}
                          </span>
                          <span className="text-xs text-gray-300">{timeAgo(log.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {filteredLogs.length > 0 && (
              <p className="text-center text-xs text-gray-400 mt-4">총 {filteredLogs.length}건의 활동 기록</p>
            )}
          </>
        )}

        {/* ── 탭 2: 문서 변환 히스토리 ── */}
        {tab === "convert" && (
          <>
            {/* 통계 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <div className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-gray-900">{converts.length}</p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">전체 변환</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-gray-900">{converts.filter((c) => c.summary).length}</p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">요약 완료</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(converts.map((c) => c.user_display_name).filter(Boolean)).size}
                </p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">사용자 수</span>
              </div>
            </div>

            {/* 검색 */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex items-center gap-3">
              <Filter size={14} className="text-gray-400 shrink-0" />
              <input type="text" placeholder="파일명 / 사용자 / 요약 내용 검색..." value={convertSearch}
                onChange={(e) => setConvertSearch(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {convertsLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <RefreshCw size={20} className="animate-spin mr-2" />불러오는 중...
                </div>
              ) : filteredConverts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <FileText size={32} className="mb-3 opacity-30" />
                  <p className="text-sm">변환 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredConverts.map((c) => (
                    <div key={c.id}>
                      <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="mt-0.5 shrink-0">
                          <FileText size={16} className="text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {c.file_type && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">
                                {c.file_type}
                              </span>
                            )}
                            <span className="text-sm font-medium text-gray-900 truncate">{c.file_name}</span>
                            {c.file_size && (
                              <span className="text-[10px] text-gray-400">{fmtSize(c.file_size)}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            {c.user_display_name && (
                              <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                                <User size={10} />{c.user_display_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock size={10} />{formatDateTime(c.created_at)}
                            </span>
                            <span className="text-xs text-gray-300">{timeAgo(c.created_at)}</span>
                          </div>
                        </div>
                        {c.summary && (
                          <button
                            onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                            className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                              expandedId === c.id
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <Sparkles size={11} />
                            AI 요약
                            {expandedId === c.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          </button>
                        )}
                      </div>

                      {/* 요약 펼치기 */}
                      {expandedId === c.id && c.summary && (
                        <div className="mx-5 mb-4 rounded-xl border border-indigo-100 bg-indigo-50 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-indigo-100 bg-indigo-100/60">
                            <Sparkles size={12} className="text-indigo-600" />
                            <span className="text-xs font-semibold text-indigo-800">AI 요약</span>
                          </div>
                          <div className="px-5 py-4">
                            <SummaryText text={c.summary} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {filteredConverts.length > 0 && (
              <p className="text-center text-xs text-gray-400 mt-4">총 {filteredConverts.length}건의 변환 기록</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

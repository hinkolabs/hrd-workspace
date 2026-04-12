"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, History, Loader2, Target,
  Trash2, CheckCircle2, Clock, BarChart2, MessageSquare,
} from "lucide-react";

type Session = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  response_count: number;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:      { label: "임시저장",  color: "text-gray-500",   bg: "bg-gray-100",    icon: <Clock size={11} /> },
  collecting: { label: "수집중",    color: "text-blue-600",   bg: "bg-blue-50",     icon: <MessageSquare size={11} /> },
  scoring:    { label: "채점중",    color: "text-amber-600",  bg: "bg-amber-50",    icon: <BarChart2 size={11} /> },
  completed:  { label: "완료",      color: "text-emerald-600",bg: "bg-emerald-50",  icon: <CheckCircle2 size={11} /> },
};

function sessionLink(s: Session) {
  if (s.status === "completed") return `/tools/ice/${s.id}/result`;
  if (s.status === "scoring")   return `/tools/ice/${s.id}/score`;
  return `/tools/ice/${s.id}/responses`;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "completed" | "active">("all");

  useEffect(() => {
    fetch("/api/tools/ice")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 세션을 삭제할까요?\n(설문 응답 및 채점 데이터도 함께 삭제됩니다)`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/tools/ice/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(null);
    }
  }

  const filtered = sessions.filter((s) => {
    if (filter === "completed") return s.status === "completed";
    if (filter === "active") return s.status !== "completed";
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/tools/ice" className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <History size={18} className="text-indigo-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">ICE 히스토리</h1>
              <p className="text-sm text-gray-500 mt-0.5">전체 ICE 세션 기록</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3">
          {([["all", "전체"], ["active", "진행 중"], ["completed", "완료"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === key
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> 불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Target size={32} className="text-gray-300" />
            <p className="text-sm font-medium">
              {filter === "all" ? "아직 생성된 ICE 세션이 없습니다" : "해당 세션이 없습니다"}
            </p>
            <Link href="/tools/ice/new" className="text-xs text-indigo-500 hover:text-indigo-700">
              새 ICE 만들기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl mx-auto">
            {filtered.map((s) => {
              const meta = STATUS_META[s.status] ?? STATUS_META.draft;
              return (
                <div
                  key={s.id}
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                          {meta.icon}{meta.label}
                        </span>
                        <span className="text-[10px] text-gray-400">응답 {s.response_count}명</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.title}</p>
                      {s.description && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{s.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                        <span>{new Date(s.created_at).toLocaleDateString("ko-KR")}</span>
                        {s.created_by && <span>· {s.created_by}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(s.id, s.title)}
                        disabled={deleting === s.id}
                        className="p-1.5 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors"
                        title="삭제"
                      >
                        {deleting === s.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                      <Link
                        href={sessionLink(s)}
                        className="flex items-center gap-1 text-xs text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50 transition-colors"
                      >
                        {s.status === "completed" ? "결과 보기" : "계속하기"}
                        <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

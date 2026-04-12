"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Target,
  Plus,
  BookOpen,
  History,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronRight,
  BarChart2,
  MessageSquare,
} from "lucide-react";

type SessionStatus = "draft" | "collecting" | "scoring" | "completed";

type IceSession = {
  id: string;
  title: string;
  description: string | null;
  status: SessionStatus;
  created_by: string | null;
  created_at: string;
  response_count: number;
};

const STATUS_META: Record<SessionStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:      { label: "임시저장",  color: "text-gray-500",   bg: "bg-gray-100",    icon: <Clock size={11} /> },
  collecting: { label: "수집중",    color: "text-blue-600",   bg: "bg-blue-50",     icon: <MessageSquare size={11} /> },
  scoring:    { label: "채점중",    color: "text-amber-600",  bg: "bg-amber-50",    icon: <BarChart2 size={11} /> },
  completed:  { label: "완료",      color: "text-emerald-600",bg: "bg-emerald-50",  icon: <CheckCircle2 size={11} /> },
};

export default function ICEDashboard() {
  const [sessions, setSessions] = useState<IceSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tools/ice")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .finally(() => setLoading(false));
  }, []);

  const active    = sessions.filter((s) => s.status === "collecting" || s.status === "scoring");
  const completed = sessions.filter((s) => s.status === "completed");
  const totalResponses = sessions.reduce((sum, s) => sum + s.response_count, 0);

  function sessionLink(s: IceSession) {
    if (s.status === "completed") return `/tools/ice/${s.id}/result`;
    if (s.status === "scoring")   return `/tools/ice/${s.id}/score`;
    if (s.status === "collecting") return `/tools/ice/${s.id}/responses`;
    return `/tools/ice/${s.id}/responses`;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Target size={18} className="text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900">ICE 우선순위 채점</h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Pain Point를 수집하고 Impact · Confidence · Ease 기준으로 AI 에이전트 개발 우선순위를 결정합니다
            </p>
          </div>
          <Link
            href="/tools/ice/guide"
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors"
          >
            <BookOpen size={14} />
            ICE 가이드
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "진행 중 세션", value: active.length, icon: <Clock size={16} className="text-blue-500" />, color: "text-blue-600" },
            { label: "수집된 응답",  value: totalResponses, icon: <Users size={16} className="text-indigo-500" />, color: "text-indigo-600" },
            { label: "완료된 세션", value: completed.length, icon: <CheckCircle2 size={16} className="text-emerald-500" />, color: "text-emerald-600" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
              <div className="flex items-center justify-center mb-2">{icon}</div>
              <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/tools/ice/new"
          className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base rounded-2xl shadow transition-colors"
        >
          <Plus size={18} />
          새 ICE 만들기
        </Link>

        {/* Session list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">최근 세션</h2>
            <Link href="/tools/ice/history" className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
              <History size={13} />
              전체 히스토리
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              불러오는 중...
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 flex flex-col items-center gap-3 text-gray-400">
              <Target size={32} className="text-gray-300" />
              <p className="text-sm font-medium">아직 생성된 ICE 세션이 없습니다</p>
              <p className="text-xs">위의 버튼을 눌러 첫 번째 ICE를 만들어보세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 8).map((s) => {
                const meta = STATUS_META[s.status];
                return (
                  <Link
                    key={s.id}
                    href={sessionLink(s)}
                    className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm hover:border-indigo-300 hover:shadow transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-indigo-700 transition-colors">
                        {s.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          응답 {s.response_count}명
                        </span>
                        {s.created_by && (
                          <span className="text-[10px] text-gray-400">· {s.created_by}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-gray-400">
                        {new Date(s.created_at).toLocaleDateString("ko-KR")}
                      </span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Users, BookOpen, TrendingUp, AlertCircle, Trophy, MessageSquare } from "lucide-react";
import { useCohort } from "@/lib/use-cohort";
import { useAuth } from "@/components/layout/app-shell";
import type { GrowthMember } from "@/lib/growth-types";

type Stats = {
  total_members: number;
  week_writers: number;
  week_participation_rate: number;
  month_journal_count: number;
  top_journals: Array<{ id: string; title: string; display_name: string; reaction_count: number; created_at: string }>;
  non_writers_this_week: Array<{ user_id: string; display_name: string }>;
};

type MentorThread = {
  id: string;
  trainee_id: string;
  mentor_id: string | null;
  trainee_name: string;
  mentor_name: string;
  last_message: string | null;
  last_message_at: string | null;
};

export default function AdminGrowthPage() {
  const { cohorts, activeCohort, setActiveCohort } = useCohort();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const [stats, setStats] = useState<Stats | null>(null);
  const [members, setMembers] = useState<GrowthMember[]>([]);
  const [threads, setThreads] = useState<MentorThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "threads">("overview");

  const fetchAll = useCallback(async () => {
    if (!activeCohort) return;
    setLoading(true);

    const [sRes, mRes] = await Promise.all([
      fetch(`/api/growth/stats?cohort_id=${activeCohort.id}`),
      fetch(`/api/growth/members?cohort_id=${activeCohort.id}`),
    ]);

    if (sRes.ok) setStats(await sRes.json());
    if (mRes.ok) setMembers(await mRes.json());

    // Fetch all threads for this cohort (admin sees all with ?all=true)
    const mentorRes = await fetch(`/api/growth/mentor?cohort_id=${activeCohort.id}&all=true`);
    if (mentorRes.ok) setThreads(await mentorRes.json());

    setLoading(false);
  }, [activeCohort]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const trainees = members.filter((m) => m.role === "trainee");
  const mentors = members.filter((m) => m.role === "mentor" || m.role === "admin");

  async function assignMentor(threadId: string, mentorId: string) {
    await fetch(`/api/growth/mentor/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentor_id: mentorId }),
    });
    fetchAll();
  }

  async function updateRole(memberId: string, role: string) {
    await fetch("/api/growth/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: memberId, role }),
    });
    fetchAll();
  }

  // Role gate: global admin only
  if (!authLoading && !isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle size={36} className="text-red-400" />
        <div>
          <p className="font-bold text-gray-800">접근 권한이 없습니다</p>
          <p className="text-sm text-gray-500 mt-1">커뮤니티 관리는 관리자만 이용할 수 있습니다.</p>
        </div>
        <Link href="/growth" className="text-sm text-indigo-600 underline">성장 피드로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">신입 성장 커뮤니티 관리</h1>
            <p className="text-xs text-gray-500 mt-0.5">기수 참여 현황, 멘토 배정, 하이라이트</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Cohort selector */}
            {cohorts.length > 1 && (
              <select
                value={activeCohort?.id ?? ""}
                onChange={(e) => {
                  const c = cohorts.find((c) => c.id === e.target.value);
                  if (c) setActiveCohort(c);
                }}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
              >
                {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button
              onClick={fetchAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
            >
              <RefreshCw size={12} /> 새로고침
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {([
            ["overview", "현황"],
            ["members", `멤버 (${trainees.length})`],
            ["threads", `멘토 대화 (${threads.length})`],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && activeTab === "overview" && stats && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard icon={<Users size={16} className="text-indigo-600" />} label="총 신입" value={`${stats.total_members}명`} color="bg-indigo-50" />
              <KpiCard
                icon={<TrendingUp size={16} className="text-emerald-600" />}
                label="이번 주 참여율"
                value={`${stats.week_participation_rate}%`}
                sub={`${stats.week_writers}명 작성`}
                color="bg-emerald-50"
              />
              <KpiCard icon={<BookOpen size={16} className="text-sky-600" />} label="이번 달 일기" value={`${stats.month_journal_count}건`} color="bg-sky-50" />
              <KpiCard
                icon={<AlertCircle size={16} className="text-amber-600" />}
                label="미작성자"
                value={`${stats.non_writers_this_week.length}명`}
                sub="이번 주"
                color="bg-amber-50"
                alert={stats.non_writers_this_week.length > 0}
              />
            </div>

            {/* Participation bar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">이번 주 참여 현황</h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${stats.week_participation_rate}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-indigo-600">{stats.week_participation_rate}%</span>
              </div>
              <p className="text-xs text-gray-500">{stats.week_writers}명 작성 / {stats.total_members}명 중</p>
            </div>

            {/* Non-writers */}
            {stats.non_writers_this_week.length > 0 && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
                <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <AlertCircle size={14} /> 이번 주 미작성자 ({stats.non_writers_this_week.length}명)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.non_writers_this_week.map((m) => (
                    <span key={m.user_id} className="text-xs bg-white text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                      {m.display_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top 3 journals */}
            {stats.top_journals.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Trophy size={14} className="text-amber-500" /> 인기 성장일기 Top 3 (30일)
                </h3>
                <div className="space-y-2">
                  {stats.top_journals.map((j, idx) => (
                    <Link key={j.id} href={`/growth/journal/${j.id}`} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 hover:bg-indigo-50 transition-colors group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base font-bold text-gray-300 w-5 text-center">{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 truncate group-hover:text-indigo-600">{j.title}</p>
                          <p className="text-[10px] text-gray-400">{j.display_name}</p>
                        </div>
                      </div>
                      <span className="text-xs text-rose-500 font-medium shrink-0 ml-2">❤️ {j.reaction_count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === "members" && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">이름</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs hidden sm:table-cell">부서</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">역할</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs hidden sm:table-cell">만다라트</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{m.display_name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">{m.dept ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={m.role}
                        onChange={(e) => updateRole(m.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                      >
                        <option value="trainee">신입</option>
                        <option value="mentor">멘토</option>
                        <option value="admin">관리자</option>
                      </select>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <Link href={`/growth/mandalart/${m.user_id}`} className="text-xs text-indigo-600 hover:underline">보기</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === "threads" && (
          <div className="space-y-3">
            {threads.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">멘토 스레드가 없습니다</p>
            ) : (
              threads.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{t.trainee_name}</span>
                      <span className="text-gray-400 text-xs mx-1">↔</span>
                      <span className="text-sm text-gray-600">{t.mentor_name}</span>
                    </div>
                    <Link href={`/growth/me/mentor`} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
                      <MessageSquare size={11} /> 대화
                    </Link>
                  </div>
                  {t.last_message && (
                    <p className="text-xs text-gray-500 truncate mb-2">{t.last_message}</p>
                  )}
                  {/* Mentor assignment */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">멘토 배정:</span>
                    <select
                      value={t.mentor_id ?? ""}
                      onChange={(e) => assignMentor(t.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="">미배정</option>
                      {mentors.map((m) => (
                        <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color, alert }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className={`${color} rounded-2xl p-4 ${alert ? "ring-2 ring-amber-300" : ""}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-600">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BookOpen, Grid3x3, MessageSquare, BarChart2, ChevronRight, Calendar } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import { useCohort } from "@/lib/use-cohort";
import type { GrowthJournal, GrowthRetro } from "@/lib/growth-types";

function getMonthRange(monthsBack = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MySpacePage() {
  const { user } = useAuth();
  const { activeCohort } = useCohort();
  const [myJournals, setMyJournals] = useState<GrowthJournal[]>([]);
  const [retros, setRetros] = useState<GrowthRetro[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMine = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Fetch without waiting for cohort — cohort_id is optional
    const cohortQ = activeCohort ? `&cohort_id=${activeCohort.id}` : "";
    const [jRes, rRes] = await Promise.all([
      fetch(`/api/growth/journals?user_id=${user.id}&limit=5${cohortQ}`),
      fetch(`/api/growth/retros?user_id=${user.id}${cohortQ}`),
    ]);
    if (jRes.ok) setMyJournals(await jRes.json());
    if (rRes.ok) setRetros(await rRes.json());
    setLoading(false);
  }, [user, activeCohort]);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  const thisMonth = getMonthRange(0);
  const lastMonth = getMonthRange(1);
  const thisMonthRetro = retros.find((r) => r.month === thisMonth);
  const lastMonthRetro = retros.find((r) => r.month === lastMonth);

  // Calculate activity days from first journal
  const firstJournal = myJournals.length > 0
    ? [...myJournals].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]
    : null;
  const activityDays = firstJournal
    ? Math.max(1, Math.floor((Date.now() - new Date(firstJournal.created_at).getTime()) / 86400000))
    : 0;

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile card */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
            {user.displayName.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold">{user.displayName}</h2>
            <p className="text-white/70 text-sm">신입 성장 커뮤니티</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold">{myJournals.length}</p>
            <p className="text-white/70 text-[11px]">최근 일기</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold">{retros.length}</p>
            <p className="text-white/70 text-[11px]">월간 회고</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold">{activityDays > 0 ? `${activityDays}일` : "-"}</p>
            <p className="text-white/70 text-[11px]">활동 일수</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <QuickCard
          href={`/growth/mandalart/${user.id}`}
          icon={<Grid3x3 size={20} className="text-indigo-600" />}
          title="내 만다라트"
          desc="목표 보드 편집"
          color="bg-indigo-50"
        />
        <QuickCard
          href="/growth/me/mentor"
          icon={<MessageSquare size={20} className="text-violet-600" />}
          title="멘토 대화"
          desc="HRD 담당자와 1:1"
          color="bg-violet-50"
        />
        <QuickCard
          href={`/growth/retro/${thisMonth}`}
          icon={<BarChart2 size={20} className="text-emerald-600" />}
          title="이번 달 회고"
          desc={thisMonthRetro ? "작성 완료 ✓" : "아직 미작성"}
          color="bg-emerald-50"
        />
        <QuickCard
          href="/growth/portfolio"
          icon={<BookOpen size={20} className="text-amber-600" />}
          title="내 포트폴리오"
          desc="1년 성장 PDF"
          color="bg-amber-50"
        />
      </div>

      {/* Recent journals */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">최근 성장일기</h3>
          <Link href="/growth" className="text-xs text-indigo-600 hover:underline">전체 보기</Link>
        </div>
        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : myJournals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">아직 작성한 일기가 없어요</p>
        ) : (
          <div className="space-y-2">
            {myJournals.map((j) => (
              <Link key={j.id} href={`/growth/journal/${j.id}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg px-1.5 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate group-hover:text-indigo-600 transition-colors">{j.title}</p>
                  <p className="text-[10px] text-gray-400">{new Date(j.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
                <span className="text-xs text-gray-400">{j.mood}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Retro summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">월간 회고</h3>
        </div>
        <div className="space-y-2">
          {[thisMonth, lastMonth].map((m) => {
            const retro = m === thisMonth ? thisMonthRetro : lastMonthRetro;
            const [y, mo] = m.split("-");
            return (
              <Link key={m} href={`/growth/retro/${m}`} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-indigo-50 transition-colors group">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400 group-hover:text-indigo-500" />
                  <span className="text-sm text-gray-700">{y}년 {parseInt(mo)}월</span>
                </div>
                <div className="flex items-center gap-2">
                  {retro ? (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">완료</span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">미작성</span>
                  )}
                  <ChevronRight size={12} className="text-gray-400 group-hover:text-indigo-500" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuickCard({ href, icon, title, desc, color }: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <Link href={href} className={`${color} rounded-2xl p-4 hover:opacity-90 transition-opacity`}>
      <div className="mb-2">{icon}</div>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </Link>
  );
}

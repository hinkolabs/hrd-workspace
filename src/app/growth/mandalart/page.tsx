"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/components/layout/app-shell";
import { useCohort } from "@/lib/use-cohort";
import type { GrowthMandalart } from "@/lib/growth-types";
import { Lock, Grid3x3, ChevronRight, Target, CheckSquare, BarChart2, Users } from "lucide-react";

type StatsData = {
  words: Array<{ text: string; weight: number; count: number }>;
  totals: {
    mandalarts: number;
    cells_filled: number;
    cells_done: number;
    todos: number;
    todos_done: number;
  };
};

const WORD_COLORS = [
  "text-violet-600", "text-sky-600", "text-emerald-600", "text-orange-500",
  "text-pink-600", "text-teal-600", "text-amber-600", "text-rose-600",
  "text-indigo-600", "text-cyan-600",
];

export default function MandalartDashboardPage() {
  const { user } = useAuth();
  const { activeCohort, loading: cohortLoading } = useCohort();
  const [mandalarts, setMandalarts] = useState<GrowthMandalart[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const cohortParam = activeCohort ? `?cohort_id=${activeCohort.id}` : "";
    const [mRes, sRes] = await Promise.all([
      fetch(`/api/growth/mandalarts${cohortParam}`),
      fetch(`/api/growth/mandalarts/stats${cohortParam}`),
    ]);
    if (mRes.ok) setMandalarts(await mRes.json());
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }, [activeCohort]);

  useEffect(() => {
    if (cohortLoading) return;
    fetchAll();
  }, [fetchAll, cohortLoading]);

  if (cohortLoading) {
    return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const totals = stats?.totals;
  const avgProgress = totals && totals.cells_filled > 0
    ? Math.round((totals.cells_done / totals.cells_filled) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">만다라트 대시보드</h2>
          <p className="text-xs text-gray-400">팀 전체 목표 현황과 서로의 인사이트를 확인하세요</p>
        </div>
        <Link
          href={`/growth/mandalart/${user?.id}`}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Grid3x3 size={14} /> 내 만다라트 편집
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Stats strip */}
          {totals && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={<Users size={16} className="text-indigo-500" />}
                label="참여 인원"
                value={totals.mandalarts}
                unit="명"
                color="bg-indigo-50"
              />
              <StatCard
                icon={<Target size={16} className="text-emerald-500" />}
                label="작성된 목표"
                value={totals.cells_filled}
                unit="개"
                color="bg-emerald-50"
              />
              <StatCard
                icon={<CheckSquare size={16} className="text-green-500" />}
                label="완료된 셀"
                value={totals.cells_done}
                unit={`/ ${totals.cells_filled}`}
                color="bg-green-50"
              />
              <StatCard
                icon={<BarChart2 size={16} className="text-amber-500" />}
                label="평균 진척도"
                value={avgProgress}
                unit="%"
                color="bg-amber-50"
              />
            </div>
          )}

          {/* Word Cloud */}
          {stats && stats.words.length > 0 && (
            <WordCloud words={stats.words} />
          )}

          {/* Checklist stats */}
          {totals && totals.todos > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-semibold text-indigo-700 mb-1">팀 전체 근거 체크리스트 진척도</p>
                <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${totals.todos > 0 ? Math.round(totals.todos_done / totals.todos * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-indigo-700">
                  {totals.todos > 0 ? Math.round(totals.todos_done / totals.todos * 100) : 0}%
                </p>
                <p className="text-[10px] text-indigo-500">{totals.todos_done}/{totals.todos} 완료</p>
              </div>
            </div>
          )}

          {/* Gallery grid */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">팀원 만다라트</h3>
            {mandalarts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Grid3x3 size={48} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">아직 만다라트가 없어요</p>
                <p className="text-xs mt-1">목표 보드를 만들어 공유해보세요!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mandalarts.map((m) => (
                  <MandalartCard key={m.id} mandalart={m} isOwner={m.user_id === user?.id} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, unit, color,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className={`${color} rounded-2xl px-4 py-3 flex items-center gap-3`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 font-medium truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">
          {value}<span className="text-xs font-normal text-gray-500 ml-0.5">{unit}</span>
        </p>
      </div>
    </div>
  );
}

function WordCloud({ words }: { words: Array<{ text: string; weight: number; count: number }> }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-gray-700 mb-3">팀 관심 키워드</p>
      <div className="flex flex-wrap gap-2 items-center justify-center max-h-[160px] overflow-hidden py-2">
        {words.map((w, i) => {
          const size = 0.65 + w.weight * 1.1;
          const opacity = 0.45 + w.weight * 0.55;
          return (
            <span
              key={w.text}
              className={`${WORD_COLORS[i % WORD_COLORS.length]} font-semibold select-none`}
              style={{ fontSize: `${size}rem`, opacity }}
              title={`${w.count}회 등장`}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MandalartCard({ mandalart, isOwner }: { mandalart: GrowthMandalart; isOwner: boolean }) {
  const cells = mandalart.cells ?? [];
  const centerCells = cells.filter((c) => c.block_idx === 4);
  const subGoals = [0, 1, 2, 3, 5, 6, 7, 8].map((bi) => {
    const centerCell = cells.find((c) => c.block_idx === bi && c.cell_idx === 4);
    return centerCell?.text ?? "";
  });

  // Progress: filled & done outer cells (exclude block4 center cells from outer blocks)
  const outerCells = cells.filter((c) => !(c.block_idx === 4 && c.cell_idx === 4));
  const filledCells = outerCells.filter((c) => c.text && c.text.trim().length > 0);
  const doneCells = outerCells.filter((c) => c.done);
  const progressPct = filledCells.length > 0 ? Math.round((doneCells.length / filledCells.length) * 100) : 0;

  return (
    <Link href={`/growth/mandalart/${mandalart.user_id}`}>
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
            {(mandalart.display_name ?? "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{mandalart.display_name}</p>
            <p className="text-[10px] text-gray-400">
              {new Date(mandalart.updated_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 업데이트
            </p>
          </div>
          {mandalart.visibility === "private" && <Lock size={12} className="text-gray-400 shrink-0" />}
          {isOwner && (
            <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-full">내 것</span>
          )}
        </div>

        {/* Core goal */}
        <p className="text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2 mb-3 text-center line-clamp-1">
          {mandalart.center_goal || (centerCells.find((c) => c.cell_idx === 4)?.text) || "목표 없음"}
        </p>

        {/* Sub-goals mini grid */}
        <div className="grid grid-cols-4 gap-1 mb-3">
          {subGoals.slice(0, 8).map((g, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-1.5 py-1 text-[10px] text-gray-600 line-clamp-1 text-center">
              {g || "·"}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {filledCells.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">진척도</span>
              <span className="text-[10px] font-semibold text-gray-600">
                {doneCells.length}/{filledCells.length} <span className="text-gray-400">완료</span>
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressPct === 100 ? "bg-green-500" : "bg-indigo-500"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-end text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
          자세히 보기 <ChevronRight size={10} className="ml-0.5" />
        </div>
      </div>
    </Link>
  );
}

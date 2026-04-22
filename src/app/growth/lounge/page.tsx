"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/layout/app-shell";
import { useCohort } from "@/lib/use-cohort";
import type { GrowthMandalart } from "@/lib/growth-types";
import { MandalartCard } from "@/components/growth/mandalart-card";
import { WordCloud, type WordItem } from "@/components/growth/word-cloud";
import { Sparkles, Grid3x3, ChevronRight } from "lucide-react";

type StatsData = {
  words: WordItem[];
  totals: {
    mandalarts: number;
    cells_filled: number;
    cells_done: number;
    todos: number;
    todos_done: number;
  };
};

export default function GrowthLoungePage() {
  const { user } = useAuth();
  const { activeCohort, loading: cohortLoading } = useCohort();
  const [mandalarts, setMandalarts] = useState<GrowthMandalart[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (cohortLoading || loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const words = stats?.words ?? [];
  const totals = stats?.totals;
  const previewMandalarts = mandalarts.slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-indigo-500" />
            <h1 className="text-lg font-bold text-gray-900">성장 라운지</h1>
          </div>
          <p className="text-sm text-gray-500">팀이 지금 가장 주목하는 것, 서로의 성장 기록을 만나보세요</p>
        </div>
        <Link
          href={`/growth/mandalart/${user?.id}`}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shrink-0"
        >
          <Grid3x3 size={14} /> 내 만다라트
        </Link>
      </div>

      {/* ── Word Cloud ─────────────────────────────────────────────────────── */}
      {words.length > 0 ? (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl border border-indigo-100 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-indigo-400" />
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">팀 인기 키워드</p>
            {totals && (
              <span className="ml-auto text-[11px] text-gray-400">
                만다라트 {totals.mandalarts}개 · 목표 {totals.cells_filled}개
              </span>
            )}
          </div>
          <WordCloud words={words} maxHeight={180} />
        </div>
      ) : (
        <div className="bg-indigo-50 rounded-2xl px-6 py-8 text-center">
          <Sparkles size={32} className="mx-auto mb-2 text-indigo-200" />
          <p className="text-sm text-indigo-400">아직 기록된 목표가 없어요. 만다라트를 작성하면 여기에 인기 키워드가 표시됩니다.</p>
        </div>
      )}

      {/* ── Mandalart Gallery preview ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-800">팀 만다라트 갤러리</h2>
            <p className="text-xs text-gray-400 mt-0.5">최신 업데이트 순</p>
          </div>
          <Link
            href="/growth/mandalart"
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            모두 보기 <ChevronRight size={12} />
          </Link>
        </div>

        {mandalarts.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
            <Grid3x3 size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-400">아직 공개된 만다라트가 없어요</p>
            <p className="text-xs text-gray-400 mt-1">첫 번째로 목표를 공유해보세요!</p>
            <Link
              href={`/growth/mandalart/${user?.id}`}
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Grid3x3 size={12} /> 만다라트 작성하기
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {previewMandalarts.map((m) => (
                <MandalartCard key={m.id} mandalart={m} isOwner={m.user_id === user?.id} />
              ))}
            </div>
            {mandalarts.length > 6 && (
              <div className="mt-4 text-center">
                <Link
                  href="/growth/mandalart"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-indigo-200 text-indigo-600 text-sm font-medium rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  나머지 {mandalarts.length - 6}개 더 보기 <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

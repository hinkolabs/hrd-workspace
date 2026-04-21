"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/layout/app-shell";
import { useCohort } from "@/lib/use-cohort";
import type { GrowthMandalart } from "@/lib/growth-types";
import { Lock, Grid3x3, ChevronRight } from "lucide-react";

export default function MandalartGalleryPage() {
  const { user } = useAuth();
  const { activeCohort, loading: cohortLoading } = useCohort();
  const [mandalarts, setMandalarts] = useState<GrowthMandalart[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMandalarts = useCallback(async () => {
    if (!activeCohort) return;
    setLoading(true);
    const res = await fetch(`/api/growth/mandalarts?cohort_id=${activeCohort.id}`);
    if (res.ok) setMandalarts(await res.json());
    setLoading(false);
  }, [activeCohort]);

  useEffect(() => { fetchMandalarts(); }, [fetchMandalarts]);

  if (cohortLoading) {
    return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">만다라트 갤러리</h2>
          <p className="text-xs text-gray-400">{activeCohort?.name ?? ""} · 기수 전체 목표 보드</p>
        </div>
        <Link
          href={`/growth/mandalart/${user?.id}`}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Grid3x3 size={14} /> 내 만다라트 편집
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : mandalarts.length === 0 ? (
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
  );
}

function MandalartCard({ mandalart, isOwner }: { mandalart: GrowthMandalart; isOwner: boolean }) {
  // Build mini preview: show center block cells
  const cells = mandalart.cells ?? [];
  const centerCells = cells.filter((c) => c.block_idx === 4);
  const subGoals = [0, 1, 2, 3, 5, 6, 7, 8].map((bi) => {
    const centerCell = cells.find((c) => c.block_idx === bi && c.cell_idx === 4);
    return centerCell?.text ?? "";
  });

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
        <div className="grid grid-cols-4 gap-1">
          {subGoals.slice(0, 8).map((g, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-1.5 py-1 text-[10px] text-gray-600 line-clamp-1 text-center">
              {g || "·"}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-end text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
          자세히 보기 <ChevronRight size={10} className="ml-0.5" />
        </div>
      </div>
    </Link>
  );
}

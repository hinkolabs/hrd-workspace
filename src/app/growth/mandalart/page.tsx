"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/layout/app-shell";
import { useCohort } from "@/lib/use-cohort";
import type { GrowthMandalart } from "@/lib/growth-types";
import { Grid3x3 } from "lucide-react";
import { MandalartCard } from "@/components/growth/mandalart-card";

export default function MandalartGalleryPage() {
  const { user } = useAuth();
  const { activeCohort, loading: cohortLoading } = useCohort();
  const [mandalarts, setMandalarts] = useState<GrowthMandalart[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMandalarts = useCallback(async () => {
    setLoading(true);
    const cohortParam = activeCohort ? `?cohort_id=${activeCohort.id}` : "";
    const res = await fetch(`/api/growth/mandalarts${cohortParam}`);
    if (res.ok) setMandalarts(await res.json());
    setLoading(false);
  }, [activeCohort]);

  useEffect(() => {
    if (cohortLoading) return;
    fetchMandalarts();
  }, [fetchMandalarts, cohortLoading]);

  if (cohortLoading) {
    return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">만다라트 갤러리</h2>
          <p className="text-xs text-gray-400">팀 전체 목표 보드 · 최신순</p>
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

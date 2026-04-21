"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import { useCohort } from "@/lib/use-cohort";
import MandalartEditor from "@/components/growth/mandalart-editor";
import type { GrowthMandalart } from "@/lib/growth-types";

export default function MandalartUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user } = useAuth();
  const { activeCohort, loading: cohortLoading } = useCohort();
  const [mandalart, setMandalart] = useState<GrowthMandalart | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const isOwner = user?.id === userId;

  useEffect(() => {
    // Wait for cohort loading to finish before fetching
    if (cohortLoading) return;

    const cohortParam = activeCohort ? `?cohort_id=${activeCohort.id}` : "";
    fetch(`/api/growth/mandalarts/${userId}${cohortParam}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { setMandalart(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId, activeCohort, cohortLoading]);

  const refreshMandalart = () => {
    const cohortParam = activeCohort ? `?cohort_id=${activeCohort.id}` : "";
    fetch(`/api/growth/mandalarts/${userId}${cohortParam}`)
      .then((r) => r.json())
      .then(setMandalart)
      .catch(() => {});
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/growth/mandalart" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={15} /> 갤러리로
        </Link>
        <div className="flex-1">
          <h2 className="text-base font-bold text-gray-900">
            {isOwner ? "내 만다라트" : `${mandalart?.display_name ?? ""}의 만다라트`}
          </h2>
          {!isOwner && mandalart?.visibility === "private" && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Lock size={10} /> 비공개 만다라트</p>
          )}
        </div>
      </div>

      {isOwner ? (
        <MandalartEditor
          initial={mandalart}
          userId={userId}
          cohortId={activeCohort?.id ?? ""}
          onSaved={refreshMandalart}
        />
      ) : mandalart ? (
        <MandalartReadOnly mandalart={mandalart} />
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">아직 만다라트가 없습니다.</p>
        </div>
      )}
    </div>
  );
}

function MandalartReadOnly({ mandalart }: { mandalart: GrowthMandalart }) {
  const cells = mandalart.cells ?? [];
  const getCell = (bi: number, ci: number) =>
    cells.find((c) => c.block_idx === bi && c.cell_idx === ci);

  const BLOCK_COLORS = [
    "bg-violet-50", "bg-sky-50", "bg-emerald-50", "bg-orange-50",
    "bg-white ring-2 ring-indigo-300",
    "bg-pink-50", "bg-teal-50", "bg-amber-50", "bg-rose-50",
  ];
  const CENTER_COLORS = [
    "bg-violet-200 text-violet-800", "bg-sky-200 text-sky-800",
    "bg-emerald-200 text-emerald-800", "bg-orange-200 text-orange-800",
    "bg-indigo-200 text-indigo-800",
    "bg-pink-200 text-pink-800", "bg-teal-200 text-teal-800",
    "bg-amber-200 text-amber-800", "bg-rose-200 text-rose-800",
  ];

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-3 gap-1 w-full max-w-3xl mx-auto">
        {Array.from({ length: 9 }).map((_, bi) => (
          <div key={bi} className={`grid grid-cols-3 gap-0.5 p-1.5 rounded-lg ${BLOCK_COLORS[bi]}`}>
            {Array.from({ length: 9 }).map((_, ci) => {
              const cell = getCell(bi, ci);
              const isCenter = ci === 4;
              return (
                <div
                  key={ci}
                  className={`aspect-square flex items-center justify-center text-center text-[9px] leading-tight p-0.5 rounded ${
                    isCenter ? `${CENTER_COLORS[bi]} font-semibold` : "bg-white/60 text-gray-700"
                  }`}
                >
                  {cell?.emoji && <span className="mr-0.5">{cell.emoji}</span>}
                  {cell?.text ?? ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

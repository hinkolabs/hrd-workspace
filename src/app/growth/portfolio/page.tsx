"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, BookOpen, Grid3x3, BarChart2 } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import { useCohort } from "@/lib/use-cohort";
import type { GrowthJournal, GrowthRetro, GrowthMandalart } from "@/lib/growth-types";
import dynamic from "next/dynamic";

// Lazy load the PDF component (server-side rendering not supported by @react-pdf/renderer)
const PortfolioPDF = dynamic(() => import("@/components/growth/portfolio-pdf"), { ssr: false });

export default function PortfolioPage() {
  const { user } = useAuth();
  const { activeCohort } = useCohort();
  const [journals, setJournals] = useState<GrowthJournal[]>([]);
  const [retros, setRetros] = useState<GrowthRetro[]>([]);
  const [mandalart, setMandalart] = useState<GrowthMandalart | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPDF, setShowPDF] = useState(false);

  const fetchData = useCallback(async () => {
    if (!activeCohort || !user) return;
    setLoading(true);

    const [jRes, rRes, mRes] = await Promise.all([
      fetch(`/api/growth/journals?cohort_id=${activeCohort.id}&user_id=${user.id}&limit=100`),
      fetch(`/api/growth/retros?cohort_id=${activeCohort.id}&user_id=${user.id}`),
      fetch(`/api/growth/mandalarts/${user.id}?cohort_id=${activeCohort.id}`),
    ]);

    if (jRes.ok) setJournals(await jRes.json());
    if (rRes.ok) setRetros(await rRes.json());
    if (mRes.ok) {
      const m = await mRes.json();
      setMandalart(m);
    }
    setLoading(false);
  }, [activeCohort, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pick top 5 journals by reaction count
  const topJournals = [...journals]
    .sort((a, b) => (b.reactions?.reduce((s, r) => s + r.count, 0) ?? 0) - (a.reactions?.reduce((s, r) => s + r.count, 0) ?? 0))
    .slice(0, 5);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">1년 성장 포트폴리오</h2>
          <p className="text-xs text-gray-400 mt-0.5">{user?.displayName} · {activeCohort?.name}</p>
        </div>
        <button
          onClick={() => setShowPDF(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Download size={14} /> PDF 다운로드
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <BookOpen size={20} className="text-indigo-500 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-gray-900">{journals.length}</p>
          <p className="text-xs text-gray-500">성장일기</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <BarChart2 size={20} className="text-emerald-500 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-gray-900">{retros.length}</p>
          <p className="text-xs text-gray-500">월간 회고</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <Grid3x3 size={20} className="text-violet-500 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-gray-900">{mandalart ? "1" : "0"}</p>
          <p className="text-xs text-gray-500">만다라트</p>
        </div>
      </div>

      {/* Mandalart preview */}
      {mandalart && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Grid3x3 size={14} className="text-violet-500" /> 핵심 목표
          </h3>
          <p className="text-base font-bold text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2">
            {mandalart.center_goal ?? "목표 없음"}
          </p>
        </div>
      )}

      {/* Top journals */}
      {topJournals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BookOpen size={14} className="text-indigo-500" /> 대표 일기 (인기순 Top 5)
          </h3>
          <div className="space-y-2">
            {topJournals.map((j, i) => (
              <div key={j.id} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0">
                <span className="text-base font-bold text-gray-200 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{j.title}</p>
                  <p className="text-[10px] text-gray-400">{new Date(j.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
                <span className="text-xs text-gray-400">{j.mood}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retros preview */}
      {retros.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BarChart2 size={14} className="text-emerald-500" /> 월간 회고 ({retros.length}개월)
          </h3>
          <div className="flex flex-wrap gap-2">
            {retros.map((r) => {
              const [y, mo] = r.month.split("-");
              return (
                <span key={r.id} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                  {y}년 {parseInt(mo)}월
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* PDF modal */}
      {showPDF && user && activeCohort && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">PDF 생성</h3>
            <PortfolioPDF
              user={user}
              cohort={activeCohort}
              mandalart={mandalart}
              journals={topJournals}
              retros={retros}
              onClose={() => setShowPDF(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

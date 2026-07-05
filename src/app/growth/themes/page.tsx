"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/layout/app-shell";
import type { GrowthThemeCategoryWithItems, GrowthThemeRankEntry } from "@/lib/growth-types";
import { ListChecks, Loader2, HelpCircle } from "lucide-react";

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <HelpCircle size={13} className="text-current opacity-50 group-hover:opacity-100 cursor-help transition-opacity" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 rounded-lg bg-gray-900 px-3 py-2 text-[11px] leading-snug text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center whitespace-pre-line">
        {text}
      </span>
    </span>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"];
const TOP3_BG = [
  "from-amber-50 to-yellow-50 border-amber-300",
  "from-slate-50 to-gray-50 border-slate-300",
  "from-orange-50 to-amber-50 border-orange-300",
];
const TOP3_BADGE = [
  "bg-amber-400 text-white shadow-amber-200",
  "bg-slate-400 text-white shadow-slate-200",
  "bg-orange-400 text-white shadow-orange-200",
];
const PALETTE = ["bg-[#0C7C59]", "bg-[#0A5F44]", "bg-[#14A07A]", "bg-[#0E8F69]", "bg-[#085C40]"];

/* ── 랭킹 + 항목 통합 뷰 ────────────────────────────────────────────────────── */
function CategoryView({
  cat,
  catIdx,
}: {
  cat: GrowthThemeCategoryWithItems;
  catIdx: number;
}) {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<GrowthThemeRankEntry[]>([]);
  const [loadingRank, setLoadingRank] = useState(true);

  useEffect(() => {
    setLoadingRank(true);
    fetch(`/api/growth/themes/${cat.id}/completions`)
      .then((r) => r.json())
      .then((d) => setRanking(Array.isArray(d) ? d : []))
      .finally(() => setLoadingRank(false));
  }, [cat.id]);

  const itemMap = Object.fromEntries(cat.items.map((i) => [i.id, i.name]));
  const totalMembers = cat.items[0]?.total_members ?? 0;
  const totalItems = cat.items.length;
  // 전항목 달성: 카테고리의 모든 항목을 완료한 사람만 "달성"으로 집계
  const achieverCount = loadingRank
    ? null
    : ranking.filter((r) => totalItems > 0 && r.completion_count >= totalItems).length;

  return (
    <div className="space-y-4">
      {/* Category summary */}
      <div className={`rounded-2xl p-5 text-white shadow-lg ${PALETTE[catIdx % PALETTE.length]}`}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0">
            {cat.icon_emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{cat.name}</h2>
            {cat.description && <p className="text-sm opacity-75 mt-0.5 truncate">{cat.description}</p>}
          </div>
          <div className="shrink-0 text-right flex flex-col items-end">
            {loadingRank ? (
              <Loader2 size={16} className="animate-spin opacity-70" />
            ) : (
              <>
                <div className="flex items-center gap-1 justify-end">
                  <p className="text-2xl font-black leading-none">
                    {achieverCount}
                    <span className="text-sm font-semibold opacity-70">명</span>
                  </p>
                  <Tooltip text={`담당자가 등록한 항목을 모두 완료한 팀원 수입니다.\n(내 만다라트에서 해당 항목을 체크해야 반영됩니다)`} />
                </div>
                <p className="text-xs opacity-70 mt-0.5">전체 {totalMembers}명 중 전항목 달성</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Items stats — always visible at top */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2 rounded-t-2xl">
          <ListChecks size={16} className="text-[#0C7C59]" />
          <h3 className="text-sm font-bold text-gray-800">자격증별 달성 현황</h3>
          <span className="ml-1 text-gray-400">
            <Tooltip text={`항목별로 완료한 팀원 수와 비율입니다.\n분모(전체 N명)는 전체 등록 팀원 수이며,\n분자는 해당 항목을 만다라트에서 체크 완료한 팀원 수입니다`} />
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-auto">{cat.items.length}종</span>
        </div>
        <div className="p-4 space-y-3">
          {cat.items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">등록된 항목이 없습니다</p>
          ) : (
            cat.items.map((item) => {
              const pct = totalMembers > 0 ? Math.round((item.completed_count / totalMembers) * 100) : 0;
              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate flex-1">{item.name}</p>
                    <div className="shrink-0 text-right">
                      <span className="text-base font-black text-[#0C7C59]">{item.completed_count}</span>
                      <span className="text-xs text-gray-400 font-normal"> / 전체 {totalMembers}명</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0C7C59] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#0C7C59] w-8 text-right shrink-0">{pct}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-gray-800">🏆 달성 순위</h3>
            <span className="text-gray-400">
              <Tooltip text={`담당자가 등록한 항목 기준으로 완료 개수 순위입니다.\n오른쪽 숫자(N개)는 등록 항목 중 완료한 개수입니다.\n전항목 완료 시 달성으로 집계됩니다`} />
            </span>
          </div>
          {!loadingRank && (
            <span className="text-xs text-gray-400">전체 {totalMembers}명 중 {achieverCount}명 전항목 달성</span>
          )}
        </div>

        {loadingRank ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> 집계 중...
          </div>
        ) : ranking.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <span className="text-4xl">🏆</span>
            <p className="text-sm font-medium">아직 달성한 팀원이 없습니다</p>
            <p className="text-xs">첫 번째 달성자가 되어보세요!</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Top 3 — bigger cards */}
            {ranking.slice(0, 3).map((entry, idx) => {
              const isMe = entry.user_id === user?.id;
              const completedNames = (entry.completed_items ?? []).map((id) => itemMap[id]).filter(Boolean);
              return (
                <div
                  key={entry.user_id}
                  className={`rounded-2xl border-2 bg-gradient-to-br ${TOP3_BG[idx]} p-4 transition-all
                    ${isMe ? "ring-2 ring-[#0C7C59]/40" : ""}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Medal badge */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-black shadow-md ${TOP3_BADGE[idx]} shrink-0`}>
                      {MEDAL[idx]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-gray-900">{entry.display_name}</p>
                        {isMe && (
                          <span className="text-[10px] font-bold text-[#0C7C59] bg-[#0C7C59]/10 px-2 py-0.5 rounded-full">나</span>
                        )}
                        {entry.dept && <span className="text-xs text-gray-400">{entry.dept}</span>}
                      </div>

                      {/* Completed item chips */}
                      {completedNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {completedNames.map((name) => (
                            <span key={name} className="text-xs px-2.5 py-1 bg-[#0C7C59]/12 text-[#0C7C59] rounded-full font-semibold border border-[#0C7C59]/20">
                              ✓ {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">항목 정보 없음</p>
                      )}
                    </div>

                    {/* Score */}
                    <div className="shrink-0">
                      <span className="text-2xl font-black text-[#0C7C59] leading-none">
                        {entry.completion_count}
                      </span>
                      <span className="text-xs text-gray-400 ml-0.5">개</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 4th+ — compact rows */}
            {ranking.slice(3).map((entry, idx) => {
              const isMe = entry.user_id === user?.id;
              const completedNames = (entry.completed_items ?? []).map((id) => itemMap[id]).filter(Boolean);
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
                    ${isMe
                      ? "bg-[#0C7C59]/6 border-[#0C7C59]/30 ring-1 ring-[#0C7C59]/20"
                      : "bg-gray-50 border-gray-200"
                    }`}
                >
                  <span className="w-6 text-center text-sm font-bold text-gray-400 shrink-0">{idx + 4}</span>
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {entry.display_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{entry.display_name}</p>
                      {isMe && <span className="text-[10px] text-[#0C7C59] font-bold">(나)</span>}
                      {entry.dept && <span className="text-xs text-gray-400">{entry.dept}</span>}
                    </div>
                    {completedNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {completedNames.map((name) => (
                          <span key={name} className="text-[10px] px-1.5 py-0.5 bg-[#0C7C59]/8 text-[#0C7C59] rounded-full font-medium">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-[#0C7C59]">
                      {entry.completion_count}<span className="text-xs text-gray-400 font-normal">개</span>
                    </p>
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

/* ── 메인 페이지 ─────────────────────────────────────────────────────────────── */
export default function ThemesPage() {
  const [categories, setCategories] = useState<GrowthThemeCategoryWithItems[]>([]);
  const [activeCatIdx, setActiveCatIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/growth/themes");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0C7C59] to-[#0A5F44] text-white px-6 pt-10 pb-8">
        <p className="text-xs font-semibold tracking-widest uppercase opacity-70 mb-2">신입 성장 커뮤니티</p>
        <h1 className="text-2xl font-bold mb-1">테마 달성 현황</h1>
        <p className="text-sm opacity-75">팀원들의 달성 현황을 확인하고 동기부여를 받아보세요</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" /> 불러오는 중...
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
            <ListChecks size={36} />
            <p className="text-base font-medium">아직 설정된 테마가 없습니다</p>
            <p className="text-sm">담당자가 테마를 설정하면 여기서 확인할 수 있어요</p>
          </div>
        ) : (
          <>
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((cat, idx) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCatIdx(idx)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shrink-0 transition-all border
                    ${activeCatIdx === idx
                      ? "bg-[#0C7C59] text-white border-[#0C7C59] shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#0C7C59]/50 hover:text-[#0C7C59]"
                    }`}
                >
                  <span>{cat.icon_emoji}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {categories[activeCatIdx] && (
              <CategoryView cat={categories[activeCatIdx]} catIdx={activeCatIdx} />
            )}
          </>
        )}

      </div>
    </div>
  );
}

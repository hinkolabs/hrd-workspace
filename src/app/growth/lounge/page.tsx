"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/layout/app-shell";
import type { GrowthMandalart } from "@/lib/growth-types";
import { MandalartCard } from "@/components/growth/mandalart-card";
import { WordCloud, type WordItem } from "@/components/growth/word-cloud";
import { Grid3x3, Trophy, Target, TrendingUp, Users, ChevronDown, BarChart3, Search, X, HelpCircle } from "lucide-react";

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

type SortKey = "progress-desc" | "progress-asc" | "name-asc" | "updated-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "progress-desc", label: "달성도 높은 순" },
  { value: "progress-asc", label: "달성도 낮은 순" },
  { value: "updated-desc", label: "최근 업데이트" },
  { value: "name-asc", label: "이름순" },
];

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function getProgress(m: GrowthMandalart): number {
  const cells = m.cells ?? [];
  const outerCells = cells.filter((c) => !(c.block_idx === 4 && c.cell_idx === 4));
  const filledCells = outerCells.filter((c) => c.text && c.text.trim().length > 0);
  const doneCells = outerCells.filter((c) => c.done);
  return filledCells.length > 0 ? Math.round((doneCells.length / filledCells.length) * 100) : 0;
}

/** 갤러리 노출: 중앙 목표 또는 셀 중 하나라도 작성된 경우만 */
function hasGalleryContent(m: GrowthMandalart): boolean {
  if (m.center_goal?.trim()) return true;
  return (m.cells ?? []).some((c) => c.text?.trim());
}

function sortMandalarts(list: GrowthMandalart[], key: SortKey): GrowthMandalart[] {
  return [...list].sort((a, b) => {
    switch (key) {
      case "progress-desc": return getProgress(b) - getProgress(a);
      case "progress-asc":  return getProgress(a) - getProgress(b);
      case "name-asc":      return (a.display_name ?? "").localeCompare(b.display_name ?? "", "ko");
      case "updated-desc":  return b.updated_at.localeCompare(a.updated_at);
    }
  });
}

const PROGRESS_TOOLTIP = "전체 달성률 = 팀 전체에서 작성된 행동원칙 셀 중 체크리스트를 모두 완료한 셀의 비율입니다.\n(개인 평균이 아닌 팀 전체 합산 기준)";

function InfoTooltip({ text, light = false }: { text: string; light?: boolean }) {
  return (
    <span className="relative group/tip inline-flex items-center shrink-0">
      <HelpCircle size={12} className={`cursor-help transition-colors ${light ? "text-white/40 group-hover/tip:text-white/70" : "text-gray-400 group-hover/tip:text-gray-600"}`} />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed shadow-lg whitespace-pre-line text-center">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

function LoungeSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-5 animate-pulse">
      <div className="h-40 rounded-2xl bg-gray-100" />
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 h-44 rounded-2xl bg-gray-100" />
        <div className="lg:col-span-3 h-44 rounded-2xl bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-56 rounded-2xl bg-gray-100" />)}
      </div>
    </div>
  );
}

const PAGE_SIZE = 12;

export default function GrowthLoungePage() {
  const { user } = useAuth();
  const [mandalarts, setMandalarts] = useState<GrowthMandalart[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("progress-desc");
  const [nameSearch, setNameSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("전체");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [mRes, sRes] = await Promise.all([
      fetch(`/api/growth/mandalarts`),
      fetch(`/api/growth/mandalarts/stats`),
    ]);
    if (mRes.ok) setMandalarts(await mRes.json());
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const galleryMandalarts = useMemo(
    () => mandalarts.filter(hasGalleryContent),
    [mandalarts],
  );

  const depts = useMemo(() => {
    const set = new Set<string>();
    galleryMandalarts.forEach((m) => { if (m.dept) set.add(m.dept); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [galleryMandalarts]);

  const sorted = useMemo(() => {
    setVisibleCount(PAGE_SIZE);
    let list = sortMandalarts(galleryMandalarts, sortKey);
    if (deptFilter !== "전체") list = list.filter((m) => m.dept === deptFilter);
    if (nameSearch.trim()) {
      const q = nameSearch.trim().toLowerCase();
      list = list.filter((m) => (m.display_name ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [galleryMandalarts, sortKey, deptFilter, nameSearch]);
  const top3 = useMemo(
    () => [...galleryMandalarts].sort((a, b) => getProgress(b) - getProgress(a)).slice(0, 3),
    [galleryMandalarts],
  );

  if (loading) return <LoungeSkeleton />;

  const words = stats?.words ?? [];
  const totals = stats?.totals;
  const donePct = totals?.cells_filled
    ? Math.round((totals.cells_done / totals.cells_filled) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-5">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#004544] text-white">
        {/* subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)",
          }}
        />
        {/* accent circle */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-hana-primary/20 blur-2xl" />

        <div className="relative px-7 py-6">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-white/40 uppercase mb-2">
                신입 성장 커뮤니티
              </p>
              <h1 className="text-[26px] font-bold leading-tight tracking-tight">성장 라운지</h1>
              <p className="text-sm text-white/55 mt-1.5 max-w-sm leading-relaxed">
                팀이 주목하는 목표와 서로의 성장 기록을 한눈에
              </p>
            </div>
            <Link
              href={`/growth/mandalart/${user?.id}`}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-hana-primary text-white text-sm font-semibold rounded-xl hover:bg-hana-dark transition-colors shadow-sm"
            >
              <Grid3x3 size={14} />
              내 만다라트
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { icon: <Users size={13} />, label: "참여 멤버", value: galleryMandalarts.length, tooltip: false },
              { icon: <Target size={13} />, label: "작성된 목표", value: totals?.cells_filled ?? 0, tooltip: false },
              { icon: <TrendingUp size={13} />, label: "달성 완료", value: totals?.cells_done ?? 0, tooltip: false },
              { icon: <Trophy size={13} />, label: "전체 달성률", value: `${donePct}%`, tooltip: true },
            ].map(({ icon, label, value, tooltip }) => (
              <div key={label} className="bg-white/[0.07] rounded-xl px-3.5 py-3 text-center border border-white/[0.08]">
                <div className="flex justify-center mb-1 text-white/40">{icon}</div>
                <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
                <p className="text-xs text-white/40 mt-1 flex items-center justify-center gap-1">
                  {label}
                  {tooltip && <InfoTooltip text={PROGRESS_TOOLTIP} light />}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Insights row ─────────────────────────────────────────────────────── */}
      {(top3.length >= 2 || words.length > 0) && (
        <div className="grid lg:grid-cols-5 gap-4">

          {/* TOP 3 */}
          {top3.length >= 2 && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={14} className="text-hana-primary" />
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-gray-700 tracking-wide">달성도 TOP {Math.min(top3.length, 3)}</p>
                  <InfoTooltip text={PROGRESS_TOOLTIP} />
                </div>
              </div>
              <div className="space-y-3">
                {top3.map((m, i) => {
                  const pct = getProgress(m);
                  return (
                    <Link
                      key={m.id}
                      href={`/growth/mandalart/${m.user_id}`}
                      className="flex items-center gap-3 group"
                    >
                      <span className="text-base w-5 text-center select-none shrink-0">{RANK_MEDALS[i]}</span>
                      <div className="w-7 h-7 rounded-full bg-hana-surface flex items-center justify-center text-xs font-bold text-hana-dark shrink-0">
                        {(m.display_name ?? "?").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-hana-primary transition-colors">
                          {m.display_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct === 100 ? "bg-green-400" : "bg-hana-primary"}`}
                              style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
                            />
                          </div>
                          <span className="text-xs font-bold tabular-nums text-gray-500 w-7 text-right shrink-0">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keywords */}
          <div className={`${top3.length >= 2 ? "lg:col-span-3" : "lg:col-span-5"} bg-white rounded-2xl border border-gray-100 p-5 shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-hana-primary" />
                <p className="text-xs font-bold text-gray-700 tracking-wide">팀 인기 키워드</p>
              </div>
              {totals && totals.cells_filled > 0 && (
                <span className="text-xs text-gray-400 tabular-nums">전체 달성 {donePct}%</span>
              )}
            </div>
            {words.length > 0 ? (
              <WordCloud words={words} compact />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <BarChart3 size={22} className="text-gray-200" />
                <p className="text-xs text-gray-400">만다라트를 작성하면 팀 키워드가 모여요</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Gallery ──────────────────────────────────────────────────────────── */}
      <div>
        {/* Gallery header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">팀 만다라트 갤러리</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {deptFilter !== "전체" || nameSearch.trim()
                ? `${sorted.length}명 검색됨 / 전체 ${galleryMandalarts.length}명`
                : `${galleryMandalarts.length}명의 성장 보드`}
            </p>
          </div>
          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 cursor-pointer hover:border-hana-border focus:outline-none focus:ring-1 focus:ring-hana-primary/30 transition-colors"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Search & filter bar */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* 이름 검색 */}
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              placeholder="이름으로 검색"
              className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:border-hana-primary focus:outline-none bg-white"
            />
            {nameSearch && (
              <button onClick={() => setNameSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* 본부 필터 */}
          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className={`appearance-none text-sm border rounded-xl pl-3 pr-8 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-hana-primary/30 transition-colors ${
                deptFilter !== "전체"
                  ? "border-hana-primary bg-hana-surface text-hana-primary font-medium"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              <option value="전체">전체 본부</option>
              {depts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* 필터 초기화 */}
          {(deptFilter !== "전체" || nameSearch.trim()) && (
            <button
              onClick={() => { setNameSearch(""); setDeptFilter("전체"); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors"
            >
              <X size={13} /> 초기화
            </button>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-hana-surface flex items-center justify-center mx-auto mb-4">
              {deptFilter !== "전체" || nameSearch.trim()
                ? <Search size={22} className="text-hana-primary/40" />
                : <Grid3x3 size={22} className="text-hana-primary/40" />}
            </div>
            {deptFilter !== "전체" || nameSearch.trim() ? (
              <>
                <p className="text-sm font-semibold text-gray-600">검색 결과가 없어요</p>
                <p className="text-xs text-gray-400 mt-1">다른 검색어나 본부를 선택해보세요</p>
                <button
                  onClick={() => { setNameSearch(""); setDeptFilter("전체"); }}
                  className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
                >
                  <X size={14} /> 필터 초기화
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-600">아직 공개된 만다라트가 없어요</p>
                <p className="text-xs text-gray-400 mt-1">첫 번째로 목표를 공유해보세요</p>
                <Link
                  href={`/growth/mandalart/${user?.id}`}
                  className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 bg-hana-primary text-white text-sm font-medium rounded-xl hover:bg-hana-dark transition-colors"
                >
                  <Grid3x3 size={14} /> 만다라트 작성하기
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sorted.slice(0, visibleCount).map((m) => {
                const progressRank = [...galleryMandalarts]
                  .sort((a, b) => getProgress(b) - getProgress(a))
                  .findIndex((x) => x.id === m.id) + 1;
                const showRank = sortKey === "progress-desc" && progressRank <= 3 && getProgress(m) > 0;
                return (
                  <MandalartCard
                    key={m.id}
                    mandalart={m}
                    isOwner={m.user_id === user?.id}
                    rank={showRank ? progressRank : undefined}
                  />
                );
              })}
            </div>

            {visibleCount < sorted.length && (
              <div className="mt-5 flex flex-col items-center gap-2">
                <button
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 hover:border-hana-primary/40 hover:text-hana-primary transition-colors shadow-sm"
                >
                  <ChevronDown size={15} />
                  더 보기 ({sorted.length - visibleCount}명 더)
                </button>
                <p className="text-xs text-gray-400">
                  {visibleCount} / {sorted.length}명 표시 중
                </p>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

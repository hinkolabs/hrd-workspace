"use client";

import Link from "next/link";
import { Lock, ChevronRight, Check, HelpCircle } from "lucide-react";
import type { GrowthMandalart } from "@/lib/growth-types";

const DEFAULT_SUBGOAL_ORDER = [0, 1, 2, 3, 5, 6, 7, 8];
const RANK_STYLES = [
  { badge: "🥇", ring: "ring-amber-300/60", bg: "from-amber-50 to-white" },
  { badge: "🥈", ring: "ring-slate-300/60", bg: "from-slate-50 to-white" },
  { badge: "🥉", ring: "ring-orange-200/60", bg: "from-orange-50/50 to-white" },
];

function getMandalartStats(mandalart: GrowthMandalart) {
  const cells = mandalart.cells ?? [];
  const outerCells = cells.filter((c) => !(c.block_idx === 4 && c.cell_idx === 4));
  const filledCells = outerCells.filter((c) => c.text && c.text.trim().length > 0);
  const doneCells = outerCells.filter((c) => c.done);
  const progressPct = filledCells.length > 0 ? Math.round((doneCells.length / filledCells.length) * 100) : 0;
  return { filledCells, doneCells, progressPct };
}

function getOrderedSubGoals(mandalart: GrowthMandalart) {
  const cells = mandalart.cells ?? [];
  const order = mandalart.subgoal_order ?? DEFAULT_SUBGOAL_ORDER;
  return order.slice(0, 8).map((cellIdx, i) => {
    const cell = cells.find((c) => c.block_idx === 4 && c.cell_idx === cellIdx);
    return { priority: i + 1, text: cell?.text?.trim() ?? "", done: cell?.done ?? false };
  });
}

function InfoTooltip({ text, position = "top" }: { text: string; position?: "top" | "left" }) {
  return (
    <span className="relative group/tip inline-flex items-center shrink-0">
      <HelpCircle size={12} className="text-gray-400 group-hover/tip:text-gray-600 cursor-help transition-colors" />
      <span className={`
        absolute z-50 w-56 px-2.5 py-2 bg-gray-900 text-white text-xs rounded-xl
        opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none
        shadow-lg leading-relaxed whitespace-normal
        ${position === "top"
          ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
          : "right-full top-1/2 -translate-y-1/2 mr-2"}
      `}>
        {text}
        <span className={`absolute border-4 border-transparent ${
          position === "top"
            ? "top-full left-1/2 -translate-x-1/2 border-t-gray-900"
            : "left-full top-1/2 -translate-y-1/2 border-l-gray-900"
        }`} />
      </span>
    </span>
  );
}

function ProgressRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const isDone = pct === 100;
  const color = isDone ? "#22c55e" : pct > 0 ? "#009591" : "#e2e8f0";

  return (
    <div className={`relative shrink-0 ${isDone ? "drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]" : ""}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth={isDone ? stroke + 1 : stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-[11px] font-bold ${isDone ? "text-green-600" : "text-gray-600"}`}>
        {isDone ? "✓" : `${pct}%`}
      </span>
    </div>
  );
}

export function MandalartCard({
  mandalart, isOwner, rank,
}: {
  mandalart: GrowthMandalart;
  isOwner: boolean;
  rank?: number;
}) {
  const orderedSubGoals = getOrderedSubGoals(mandalart);
  const { filledCells, doneCells, progressPct } = getMandalartStats(mandalart);
  const cells = mandalart.cells ?? [];
  const centerGoal =
    mandalart.center_goal || cells.find((c) => c.block_idx === 4 && c.cell_idx === 4)?.text || "목표 없음";
  const rankStyle = rank && rank <= 3 ? RANK_STYLES[rank - 1] : null;

  return (
    <Link href={`/growth/mandalart/${mandalart.user_id}`} className="block h-full">
      <div className={`h-full rounded-2xl border bg-white p-4 shadow-sm transition-all group flex flex-col hover:shadow-lg hover:-translate-y-0.5 ${
        progressPct === 100
          ? "bg-gradient-to-br from-green-50 to-white border-green-200 ring-1 ring-green-300/50 shadow-green-100"
          : rankStyle ? `bg-gradient-to-br ${rankStyle.bg} ring-1 ${rankStyle.ring}` : "border-gray-200/80 hover:border-hana-primary/30"
      }`}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-hana-surface flex items-center justify-center text-sm font-bold text-hana-primary">
              {(mandalart.display_name ?? "?").charAt(0)}
            </div>
            {rankStyle && (
              <span className="absolute -top-1.5 -right-1.5 text-sm leading-none select-none">{rankStyle.badge}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-gray-900 truncate">{mandalart.display_name}</p>
              {isOwner && (
                <span className="text-[11px] text-hana-primary font-semibold bg-hana-surface px-1.5 py-0.5 rounded-full shrink-0">나</span>
              )}
              {mandalart.visibility === "private" && <Lock size={12} className="text-gray-400 shrink-0" />}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(mandalart.updated_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 업데이트
            </p>
          </div>
          <ProgressRing pct={progressPct} />
        </div>

        {/* Center goal */}
        <div className="border-l-[3px] border-hana-primary pl-3 mb-3">
          <p className="text-sm font-bold text-gray-900 line-clamp-1 leading-snug">{centerGoal}</p>
        </div>

        {/* Sub-goals grid */}
        <div className="mb-3 flex-1">
          <p className="text-xs font-semibold text-gray-400 mb-1.5">서브목표 · 우선순위순</p>
          <div className="grid grid-cols-2 gap-1.5">
            {orderedSubGoals.map(({ priority, text, done }) => (
              <div
                key={priority}
                title={text || undefined}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 min-h-[30px] transition-colors ${
                  text
                    ? done
                      ? "bg-green-50 border border-green-200 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.15)]"
                      : "bg-hana-surface border border-hana-border/50"
                    : "bg-gray-50/80 border border-gray-100"
                }`}
              >
                <span className={`shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold leading-none ${
                  priority <= 3 ? "bg-hana-primary text-white"
                  : priority <= 5 ? "bg-hana-secondary/80 text-white"
                  : "bg-gray-200 text-gray-500"
                }`}>
                  {priority}
                </span>
                <span className={`text-xs truncate flex-1 leading-tight ${text ? "text-gray-700" : "text-gray-300"}`}>
                  {text || "—"}
                </span>
                {done && text && (
                  <span className="shrink-0 w-[14px] h-[14px] rounded-full bg-green-500 flex items-center justify-center">
                    <Check size={8} className="text-white" strokeWidth={3} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Progress footer */}
        <div className="mt-auto pt-2.5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              {progressPct === 100 ? (
                <span className="flex items-center gap-1 font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-[11px]">
                  🎉 목표 달성!
                </span>
              ) : (
                <>
                  {doneCells.length > 0 && <Check size={11} className="text-green-500" />}
                  <span>
                    {filledCells.length > 0 ? (
                      <><span className="font-semibold text-gray-700">{doneCells.length}</span>/{filledCells.length} 완료</>
                    ) : "시작을 기다리는 중"}
                  </span>
                </>
              )}
              <InfoTooltip
                text="달성도 = 작성된 행동원칙 셀 중 체크리스트를 모두 완료한 셀의 비율이에요. 셀을 클릭해 체크리스트를 추가하고 완료하면 달성도가 오릅니다."
                position="top"
              />
            </div>
            <span className="text-xs text-hana-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              보기 <ChevronRight size={11} />
            </span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${progressPct === 100 ? "bg-green-100" : "bg-gray-100"}`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                progressPct === 100
                  ? "bg-gradient-to-r from-green-400 to-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                  : "bg-gradient-to-r from-hana-primary to-hana-secondary"
              }`}
              style={{ width: filledCells.length > 0 ? `${progressPct}%` : "0%" }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

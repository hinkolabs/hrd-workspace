"use client";

import Link from "next/link";
import { Lock, ChevronRight } from "lucide-react";
import type { GrowthMandalart } from "@/lib/growth-types";

export function MandalartCard({ mandalart, isOwner }: { mandalart: GrowthMandalart; isOwner: boolean }) {
  const cells = mandalart.cells ?? [];
  const centerCells = cells.filter((c) => c.block_idx === 4);
  const subGoals = [0, 1, 2, 3, 5, 6, 7, 8].map((bi) => {
    const centerCell = cells.find((c) => c.block_idx === bi && c.cell_idx === 4);
    return centerCell?.text ?? "";
  });

  const outerCells = cells.filter((c) => !(c.block_idx === 4 && c.cell_idx === 4));
  const filledCells = outerCells.filter((c) => c.text && c.text.trim().length > 0);
  const doneCells = outerCells.filter((c) => c.done);
  const progressPct = filledCells.length > 0 ? Math.round((doneCells.length / filledCells.length) * 100) : 0;

  return (
    <Link href={`/growth/mandalart/${mandalart.user_id}`}>
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
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

        <p className="text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2 mb-3 text-center line-clamp-1">
          {mandalart.center_goal || (centerCells.find((c) => c.cell_idx === 4)?.text) || "목표 없음"}
        </p>

        <div className="grid grid-cols-4 gap-1 mb-3">
          {subGoals.slice(0, 8).map((g, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-1.5 py-1 text-[10px] text-gray-600 line-clamp-1 text-center">
              {g || "·"}
            </div>
          ))}
        </div>

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

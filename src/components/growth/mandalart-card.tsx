"use client";

import Link from "next/link";
import { Lock, ChevronRight } from "lucide-react";
import type { GrowthMandalart } from "@/lib/growth-types";

export function MandalartCard({ mandalart, isOwner }: { mandalart: GrowthMandalart; isOwner: boolean }) {
  const cells = mandalart.cells ?? [];
  // 미러 규칙: 외부 블록의 중심 셀 텍스트는 block4의 해당 인덱스 셀에 저장됨
  const subGoals = [0, 1, 2, 3, 5, 6, 7, 8].map((bi) => {
    const mirrorCell = cells.find((c) => c.block_idx === 4 && c.cell_idx === bi);
    return mirrorCell?.text ?? "";
  });

  const outerCells = cells.filter((c) => !(c.block_idx === 4 && c.cell_idx === 4));
  const filledCells = outerCells.filter((c) => c.text && c.text.trim().length > 0);
  const doneCells = outerCells.filter((c) => c.done);
  const progressPct = filledCells.length > 0 ? Math.round((doneCells.length / filledCells.length) * 100) : 0;

  return (
    <Link href={`/growth/mandalart/${mandalart.user_id}`} className="block h-full">
      <div className="h-full bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-base font-bold text-indigo-600 shrink-0">
            {(mandalart.display_name ?? "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{mandalart.display_name}</p>
            <p className="text-xs text-gray-400">
              {new Date(mandalart.updated_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 업데이트
            </p>
          </div>
          {mandalart.visibility === "private" && <Lock size={13} className="text-gray-400 shrink-0" />}
          {isOwner && (
            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">내 것</span>
          )}
        </div>

        {/* 핵심 목표 */}
        <p className="text-base font-bold text-indigo-700 bg-indigo-50 rounded-xl px-4 py-3 mb-4 text-center line-clamp-2 leading-snug">
          {mandalart.center_goal || cells.find((c) => c.block_idx === 4 && c.cell_idx === 4)?.text || "목표 없음"}
        </p>

        {/* 서브목표 8개 */}
        <div className="grid grid-cols-2 gap-1.5 mb-4 flex-1">
          {subGoals.slice(0, 8).map((g, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 line-clamp-1 min-h-[36px] flex items-center">
              {g || <span className="text-gray-300 text-xs">—</span>}
            </div>
          ))}
        </div>

        {/* 진척도 */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">진척도</span>
            <span className="text-xs font-semibold text-gray-600">
              {doneCells.length}/{filledCells.length > 0 ? filledCells.length : "—"} <span className="text-gray-400">완료</span>
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressPct === 100 ? "bg-green-500" : "bg-indigo-500"}`}
              style={{ width: filledCells.length > 0 ? `${progressPct}%` : "0%" }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
          자세히 보기 <ChevronRight size={12} className="ml-0.5" />
        </div>
      </div>
    </Link>
  );
}

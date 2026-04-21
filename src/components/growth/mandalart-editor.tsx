"use client";

import { useState, useRef, useCallback } from "react";
import { Download, Save, Globe, Lock } from "lucide-react";
import type { GrowthMandalartCell, GrowthMandalart } from "@/lib/growth-types";

// Block layout: 3x3 of blocks, each block is 3x3 cells
// Block indices: 0 1 2 / 3 4 5 / 6 7 8  (4 = center block = core goal)
//
// MIRROR RULE:
//   Center block (block 4) has 9 cells. Cell 4 = core goal.
//   The other 8 cells of block 4 are the sub-goals.
//   Each outer block's CENTER CELL (cell_idx=4) is DERIVED from
//   the center block's corresponding cell:
//
//     Block 0 center ← block4.cell[0]
//     Block 1 center ← block4.cell[1]
//     Block 2 center ← block4.cell[2]
//     Block 3 center ← block4.cell[3]
//     Block 5 center ← block4.cell[5]
//     Block 6 center ← block4.cell[6]
//     Block 7 center ← block4.cell[7]
//     Block 8 center ← block4.cell[8]
//
//   Writing to an outer block's center cell actually writes to block 4's
//   corresponding cell, keeping both in sync automatically.

const BLOCK_COLORS = [
  "bg-violet-50 border-violet-200",
  "bg-sky-50 border-sky-200",
  "bg-emerald-50 border-emerald-200",
  "bg-orange-50 border-orange-200",
  "bg-white border-indigo-300 shadow-md",  // center block
  "bg-pink-50 border-pink-200",
  "bg-teal-50 border-teal-200",
  "bg-amber-50 border-amber-200",
  "bg-rose-50 border-rose-200",
];

const BLOCK_CENTER_COLORS = [
  "bg-violet-200 font-bold text-violet-800",
  "bg-sky-200 font-bold text-sky-800",
  "bg-emerald-200 font-bold text-emerald-800",
  "bg-orange-200 font-bold text-orange-800",
  "bg-indigo-500 font-bold text-white",  // core goal cell
  "bg-pink-200 font-bold text-pink-800",
  "bg-teal-200 font-bold text-teal-800",
  "bg-amber-200 font-bold text-amber-800",
  "bg-rose-200 font-bold text-rose-800",
];

type CellKey = `${number}-${number}`;
type CellMap = Record<CellKey, GrowthMandalartCell>;

function buildCellMap(cells: GrowthMandalartCell[]): CellMap {
  const map: CellMap = {};
  cells.forEach((c) => { map[`${c.block_idx}-${c.cell_idx}`] = c; });
  return map;
}

function flattenCells(cellMap: CellMap): Array<{ block_idx: number; cell_idx: number; text: string; emoji: string; done: boolean }> {
  return Object.entries(cellMap).map(([key, c]) => {
    const [bi, ci] = key.split("-").map(Number);
    return { block_idx: bi, cell_idx: ci, text: c.text ?? "", emoji: c.emoji ?? "", done: c.done ?? false };
  });
}

export default function MandalartEditor({
  initial,
  userId,
  cohortId,
  onSaved,
}: {
  initial?: GrowthMandalart | null;
  userId: string;
  cohortId: string;
  onSaved?: () => void;
}) {
  const [cellMap, setCellMap] = useState<CellMap>(() =>
    buildCellMap(initial?.cells ?? [])
  );
  const [centerGoal, setCenterGoal] = useState(initial?.center_goal ?? "");
  const [visibility, setVisibility] = useState<"cohort" | "private">(initial?.visibility ?? "cohort");
  const [saving, setSaving] = useState(false);
  const [activeBlock, setActiveBlock] = useState<number | null>(null); // mobile: which block is zoomed
  const gridRef = useRef<HTMLDivElement>(null);

  // Resolve the canonical (blockIdx, cellIdx) for storage.
  // Outer block center cells mirror through the center block (block 4).
  const resolveKey = useCallback((blockIdx: number, cellIdx: number): [number, number] => {
    // Center cell of an outer block → stored as block 4's corresponding cell
    if (blockIdx !== 4 && cellIdx === 4) {
      return [4, blockIdx]; // e.g. block 0 center → block4 cell 0
    }
    return [blockIdx, cellIdx];
  }, []);

  const getCell = useCallback((blockIdx: number, cellIdx: number): GrowthMandalartCell => {
    const [rbi, rci] = resolveKey(blockIdx, cellIdx);
    const key: CellKey = `${rbi}-${rci}`;
    return cellMap[key] ?? { id: "", mandalart_id: "", block_idx: rbi, cell_idx: rci, text: "", emoji: "", done: false };
  }, [cellMap, resolveKey]);

  const setCell = useCallback((blockIdx: number, cellIdx: number, updates: Partial<GrowthMandalartCell>) => {
    const [rbi, rci] = resolveKey(blockIdx, cellIdx);
    const key: CellKey = `${rbi}-${rci}`;
    setCellMap((prev) => ({
      ...prev,
      [key]: { ...getCell(rbi, rci), ...updates },
    }));
  }, [getCell, resolveKey]);

  async function handleSave() {
    setSaving(true);
    const cells = flattenCells(cellMap);
    const res = await fetch(`/api/growth/mandalarts/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohort_id: cohortId, center_goal: centerGoal, visibility, cells }),
    });
    setSaving(false);
    if (res.ok) onSaved?.();
  }

  async function handleExport() {
    const { default: html2canvas } = await import("html2canvas");
    if (!gridRef.current) return;
    const canvas = await html2canvas(gridRef.current, { scale: 2, backgroundColor: "#ffffff" } as Parameters<typeof html2canvas>[1]);
    const link = document.createElement("a");
    link.download = "mandalart.png";
    link.href = canvas.toDataURL();
    link.click();
  }

  // Mobile: show block selector or zoomed block
  const isMobileView = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={centerGoal}
          onChange={(e) => setCenterGoal(e.target.value)}
          placeholder="핵심 목표 (예: 하나증권 최고 신입이 되자)"
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
        />
        <button
          onClick={() => setVisibility(visibility === "cohort" ? "private" : "cohort")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
            visibility === "cohort"
              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
              : "border-gray-300 bg-gray-50 text-gray-600"
          }`}
        >
          {visibility === "cohort" ? <Globe size={12} /> : <Lock size={12} />}
          {visibility === "cohort" ? "기수 공개" : "비공개"}
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download size={12} /> 이미지 저장
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Save size={12} /> {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* Mobile: block tabs */}
      <div className="sm:hidden">
        <div className="flex flex-wrap gap-2 mb-3">
          {Array.from({ length: 9 }, (_, bi) => (
            <button
              key={bi}
              onClick={() => setActiveBlock(activeBlock === bi ? null : bi)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                activeBlock === bi
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {bi === 4 ? "핵심" : `서브${bi < 4 ? bi + 1 : bi}`}
            </button>
          ))}
        </div>
        {activeBlock !== null && (
          <BlockGrid
            blockIdx={activeBlock}
            getCell={getCell}
            setCell={setCell}
            isCenter={activeBlock === 4}
          />
        )}
      </div>

      {/* Desktop: full 9x9 grid */}
      <div ref={gridRef} className="hidden sm:block">
        <div className="grid grid-cols-3 gap-1.5 p-3 bg-white rounded-2xl border border-gray-200 shadow-sm">
          {Array.from({ length: 9 }, (_, bi) => (
            <div
              key={bi}
              className={`grid grid-cols-3 gap-0.5 p-1 rounded-xl border ${BLOCK_COLORS[bi]}`}
            >
              {Array.from({ length: 9 }, (_, ci) => {
                const isCenter = ci === 4;
                const isCoreCell = bi === 4 && ci === 4;
                // Outer block center cells are mirrors of block4's cells — read-only display
                const isMirrorCell = bi !== 4 && ci === 4;
                const cell = getCell(bi, ci); // resolveKey already handles the read-through
                return (
                  <CellInput
                    key={ci}
                    cell={cell}
                    onChange={(updates) => setCell(bi, ci, updates)}
                    className={isCenter ? BLOCK_CENTER_COLORS[bi] : "bg-white/80 hover:bg-white"}
                    placeholder={
                      isCoreCell
                        ? centerGoal || "핵심 목표"
                        : isMirrorCell
                        ? `서브목표 ${bi < 4 ? bi + 1 : bi}`
                        : ""
                    }
                    smallText={!isCoreCell}
                    readOnly={isMirrorCell}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlockGrid({
  blockIdx,
  getCell,
  setCell,
  isCenter,
}: {
  blockIdx: number;
  getCell: (bi: number, ci: number) => GrowthMandalartCell;
  setCell: (bi: number, ci: number, updates: Partial<GrowthMandalartCell>) => void;
  isCenter: boolean;
}) {
  return (
    <div className={`grid grid-cols-3 gap-1 p-3 rounded-2xl border ${BLOCK_COLORS[blockIdx]}`}>
      {Array.from({ length: 9 }, (_, ci) => {
        const isCenterCell = ci === 4;
        // Outer block center = mirror from block 4 (read-only here)
        const isMirrorCell = !isCenter && isCenterCell;
        const cell = getCell(blockIdx, ci); // resolveKey handles read-through
        return (
          <CellInput
            key={ci}
            cell={cell}
            onChange={(updates) => setCell(blockIdx, ci, updates)}
            className={isCenterCell ? BLOCK_CENTER_COLORS[blockIdx] : "bg-white"}
            placeholder={isCenterCell ? (isCenter ? "핵심 목표" : `서브목표 ${blockIdx < 4 ? blockIdx + 1 : blockIdx}`) : ""}
            large
            readOnly={isMirrorCell}
          />
        );
      })}
    </div>
  );
}

function CellInput({
  cell,
  onChange,
  className,
  placeholder,
  smallText = false,
  large = false,
  readOnly = false,
}: {
  cell: GrowthMandalartCell;
  onChange: (updates: Partial<GrowthMandalartCell>) => void;
  className?: string;
  placeholder?: string;
  smallText?: boolean;
  large?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div
      className={`relative border border-gray-200/50 rounded-lg ${large ? "min-h-[64px]" : "min-h-[40px]"} ${className}`}
      title={readOnly ? "중앙 블록에서 편집하세요" : undefined}
    >
      <textarea
        value={cell.text}
        onChange={(e) => !readOnly && onChange({ text: e.target.value })}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`absolute inset-0 w-full h-full resize-none bg-transparent px-1.5 py-1 ${
          smallText ? "text-[10px]" : "text-xs"
        } leading-tight focus:outline-none placeholder:text-gray-300 ${readOnly ? "cursor-default" : ""}`}
      />
      {cell.done && (
        <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400" />
      )}
    </div>
  );
}

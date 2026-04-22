"use client";

import { useState, useRef, useCallback } from "react";
import { Download, Save, Globe, Lock, X, Plus, Check, Trash2, ChevronRight } from "lucide-react";
import type { GrowthMandalartCell, GrowthMandalartCellTodo, GrowthMandalart } from "@/lib/growth-types";

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
//     ...
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

const BLOCK_ACCENT_COLORS = [
  "text-violet-700 bg-violet-100",
  "text-sky-700 bg-sky-100",
  "text-emerald-700 bg-emerald-100",
  "text-orange-700 bg-orange-100",
  "text-indigo-700 bg-indigo-100",
  "text-pink-700 bg-pink-100",
  "text-teal-700 bg-teal-100",
  "text-amber-700 bg-amber-100",
  "text-rose-700 bg-rose-100",
];

type CellKey = `${number}-${number}`;
type TodoItem = { id: string; text: string; done: boolean; order_idx: number };
type CellMap = Record<CellKey, GrowthMandalartCell>;
type TodoMap = Record<CellKey, TodoItem[]>;

function buildCellMap(cells: GrowthMandalartCell[]): CellMap {
  const map: CellMap = {};
  cells.forEach((c) => { map[`${c.block_idx}-${c.cell_idx}`] = c; });
  return map;
}

function buildTodoMap(cells: GrowthMandalartCell[]): TodoMap {
  const map: TodoMap = {};
  cells.forEach((c) => {
    if (c.todos && c.todos.length > 0) {
      map[`${c.block_idx}-${c.cell_idx}`] = c.todos.map((t) => ({
        id: t.id,
        text: t.text,
        done: t.done,
        order_idx: t.order_idx,
      }));
    }
  });
  return map;
}

function flattenCells(cellMap: CellMap, todoMap: TodoMap): Array<{
  block_idx: number;
  cell_idx: number;
  text: string;
  emoji: string;
  done: boolean;
  todos: Array<{ text: string; done: boolean; order_idx: number }>;
}> {
  return Object.entries(cellMap).map(([key, c]) => {
    const [bi, ci] = key.split("-").map(Number);
    const todos = todoMap[key as CellKey] ?? [];
    return {
      block_idx: bi,
      cell_idx: ci,
      text: c.text ?? "",
      emoji: c.emoji ?? "",
      done: c.done ?? false,
      todos: todos.map((t, idx) => ({ text: t.text, done: t.done, order_idx: idx })),
    };
  });
}

// Dragged cell panel state
type DrawerState = {
  blockIdx: number;
  cellIdx: number;
} | null;

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
  const [todoMap, setTodoMap] = useState<TodoMap>(() =>
    buildTodoMap(initial?.cells ?? [])
  );
  const [centerGoal, setCenterGoal] = useState(initial?.center_goal ?? "");
  const [visibility, setVisibility] = useState<"cohort" | "private">(initial?.visibility ?? "cohort");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string>("");
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const resolveKey = useCallback((blockIdx: number, cellIdx: number): [number, number] => {
    if (blockIdx !== 4 && cellIdx === 4) {
      return [4, blockIdx];
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

  const getTodos = useCallback((blockIdx: number, cellIdx: number): TodoItem[] => {
    const [rbi, rci] = resolveKey(blockIdx, cellIdx);
    return todoMap[`${rbi}-${rci}`] ?? [];
  }, [todoMap, resolveKey]);

  const setTodos = useCallback((blockIdx: number, cellIdx: number, todos: TodoItem[]) => {
    const [rbi, rci] = resolveKey(blockIdx, cellIdx);
    const key: CellKey = `${rbi}-${rci}`;
    setTodoMap((prev) => ({ ...prev, [key]: todos }));
    // Auto-set done if all todos checked
    const autoDone = todos.length > 0 && todos.every((t) => t.done);
    setCellMap((prev) => {
      const existing = prev[key] ?? { id: "", mandalart_id: "", block_idx: rbi, cell_idx: rci, text: "", emoji: "", done: false };
      return { ...prev, [key]: { ...existing, done: autoDone } };
    });
  }, [resolveKey]);

  const openDrawer = useCallback((blockIdx: number, cellIdx: number) => {
    const [rbi, rci] = resolveKey(blockIdx, cellIdx);
    // Don't open drawer for mirror cells or core goal
    if (rbi === 4 && rci === 4) return;
    setDrawer({ blockIdx: rbi, cellIdx: rci });
  }, [resolveKey]);

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    setSaveError("");
    try {
      const cells = flattenCells(cellMap, todoMap);
      const res = await fetch(`/api/growth/mandalarts/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohort_id: cohortId || undefined, center_goal: centerGoal, visibility, cells }),
      });
      if (res.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 2500);
        onSaved?.();
      } else {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error ?? body?.stage ?? `HTTP ${res.status}`;
        setSaveError(msg);
        setSaveStatus("error");
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "네트워크 오류");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="flex flex-col gap-4 relative">
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
          {visibility === "cohort" ? "팀 공개" : "비공개"}
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

      {/* Save status toast */}
      {saveStatus === "success" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-medium">
          <Check size={12} className="shrink-0" /> 저장되었습니다
        </div>
      )}
      {saveStatus === "error" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <span className="font-semibold shrink-0">저장 실패:</span> {saveError}
        </div>
      )}

      <p className="text-[11px] text-gray-400">셀을 클릭하면 세부 근거 체크리스트를 작성할 수 있어요. 모두 완료하면 셀이 자동으로 완료 처리됩니다.</p>

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
            getTodos={getTodos}
            isCenter={activeBlock === 4}
            onCellClick={openDrawer}
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
                const isMirrorCell = bi !== 4 && ci === 4;
                const cell = getCell(bi, ci);
                const todos = getTodos(bi, ci);
                const progress = { done: todos.filter(t => t.done).length, total: todos.length };
                return (
                  <CellInput
                    key={ci}
                    cell={cell}
                    progress={progress}
                    onChange={(updates) => setCell(bi, ci, updates)}
                    onClick={() => !isMirrorCell && !isCoreCell && openDrawer(bi, ci)}
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
                    clickable={!isMirrorCell && !isCoreCell}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Cell Drawer */}
      {drawer && (
        <CellDrawer
          blockIdx={drawer.blockIdx}
          cellIdx={drawer.cellIdx}
          cell={getCell(drawer.blockIdx, drawer.cellIdx)}
          todos={getTodos(drawer.blockIdx, drawer.cellIdx)}
          blockColor={BLOCK_ACCENT_COLORS[drawer.blockIdx]}
          onCellChange={(updates) => setCell(drawer.blockIdx, drawer.cellIdx, updates)}
          onTodosChange={(todos) => setTodos(drawer.blockIdx, drawer.cellIdx, todos)}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

function BlockGrid({
  blockIdx,
  getCell,
  setCell,
  getTodos,
  isCenter,
  onCellClick,
}: {
  blockIdx: number;
  getCell: (bi: number, ci: number) => GrowthMandalartCell;
  setCell: (bi: number, ci: number, updates: Partial<GrowthMandalartCell>) => void;
  getTodos: (bi: number, ci: number) => TodoItem[];
  isCenter: boolean;
  onCellClick: (bi: number, ci: number) => void;
}) {
  return (
    <div className={`grid grid-cols-3 gap-1 p-3 rounded-2xl border ${BLOCK_COLORS[blockIdx]}`}>
      {Array.from({ length: 9 }, (_, ci) => {
        const isCenterCell = ci === 4;
        const isMirrorCell = !isCenter && isCenterCell;
        const isCoreCell = isCenter && isCenterCell;
        const cell = getCell(blockIdx, ci);
        const todos = getTodos(blockIdx, ci);
        const progress = { done: todos.filter(t => t.done).length, total: todos.length };
        return (
          <CellInput
            key={ci}
            cell={cell}
            progress={progress}
            onChange={(updates) => setCell(blockIdx, ci, updates)}
            onClick={() => !isMirrorCell && !isCoreCell && onCellClick(blockIdx, ci)}
            className={isCenterCell ? BLOCK_CENTER_COLORS[blockIdx] : "bg-white"}
            placeholder={isCenterCell ? (isCenter ? "핵심 목표" : `서브목표 ${blockIdx < 4 ? blockIdx + 1 : blockIdx}`) : ""}
            large
            readOnly={isMirrorCell}
            clickable={!isMirrorCell && !isCoreCell}
          />
        );
      })}
    </div>
  );
}

function CellInput({
  cell,
  progress,
  onChange,
  onClick,
  className,
  placeholder,
  smallText = false,
  large = false,
  readOnly = false,
  clickable = false,
}: {
  cell: GrowthMandalartCell;
  progress: { done: number; total: number };
  onChange: (updates: Partial<GrowthMandalartCell>) => void;
  onClick?: () => void;
  className?: string;
  placeholder?: string;
  smallText?: boolean;
  large?: boolean;
  readOnly?: boolean;
  clickable?: boolean;
}) {
  return (
    <div
      className={`relative border border-gray-200/50 rounded-lg ${large ? "min-h-[64px]" : "min-h-[40px]"} ${className} ${clickable ? "cursor-pointer group" : ""}`}
      title={readOnly ? "중앙 블록에서 편집하세요" : clickable ? "클릭하여 근거 체크리스트 작성" : undefined}
      onClick={clickable ? onClick : undefined}
    >
      <textarea
        value={cell.text}
        onChange={(e) => !readOnly && !clickable && onChange({ text: e.target.value })}
        readOnly={readOnly || clickable}
        placeholder={placeholder}
        className={`absolute inset-0 w-full h-full resize-none bg-transparent px-1.5 py-1 ${
          smallText ? "text-[10px]" : "text-xs"
        } leading-tight focus:outline-none placeholder:text-gray-300 ${readOnly || clickable ? "cursor-pointer" : ""}`}
      />
      {/* Progress badge */}
      {progress.total > 0 && !readOnly && (
        <div className={`absolute bottom-0.5 right-0.5 px-1 rounded text-[8px] font-bold leading-4 ${
          cell.done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
        }`}>
          {cell.done ? "✓" : `${progress.done}/${progress.total}`}
        </div>
      )}
      {/* Clickable hint */}
      {clickable && cell.text && (
        <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={8} className="text-gray-400" />
        </div>
      )}
    </div>
  );
}

function CellDrawer({
  blockIdx,
  cellIdx,
  cell,
  todos,
  blockColor,
  onCellChange,
  onTodosChange,
  onClose,
}: {
  blockIdx: number;
  cellIdx: number;
  cell: GrowthMandalartCell;
  todos: TodoItem[];
  blockColor: string;
  onCellChange: (updates: Partial<GrowthMandalartCell>) => void;
  onTodosChange: (todos: TodoItem[]) => void;
  onClose: () => void;
}) {
  const [newTodoText, setNewTodoText] = useState("");

  function addTodo() {
    if (!newTodoText.trim()) return;
    const newTodo: TodoItem = {
      id: `tmp-${Date.now()}`,
      text: newTodoText.trim(),
      done: false,
      order_idx: todos.length,
    };
    onTodosChange([...todos, newTodo]);
    setNewTodoText("");
  }

  function toggleTodo(id: string) {
    onTodosChange(todos.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  function removeTodo(id: string) {
    onTodosChange(todos.filter((t) => t.id !== id));
  }

  const allDone = todos.length > 0 && todos.every((t) => t.done);
  const donePct = todos.length > 0 ? Math.round((todos.filter(t => t.done).length / todos.length) * 100) : 0;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 ${blockColor} flex items-center justify-between`}>
          <div>
            <p className="text-[10px] font-medium opacity-70">블록 {blockIdx + 1} · 셀 {cellIdx + 1}</p>
            <p className="text-sm font-bold truncate">{cell.text || "세부 목표"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Cell text edit */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">세부 목표</label>
            <textarea
              value={cell.text}
              onChange={(e) => onCellChange({ text: e.target.value })}
              placeholder="이 셀의 목표를 입력하세요"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Checklist section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">근거 체크리스트</label>
              {todos.length > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allDone ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {todos.filter(t => t.done).length}/{todos.length} 완료
                </span>
              )}
            </div>

            {/* Progress bar */}
            {todos.length > 0 && (
              <div className="mb-3">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${allDone ? "bg-green-500" : "bg-indigo-500"}`}
                    style={{ width: `${donePct}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 text-right">{donePct}%</p>
              </div>
            )}

            {allDone && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                <Check size={14} className="text-green-600 shrink-0" />
                <p className="text-xs text-green-700 font-medium">모두 완료! 이 셀이 완료 처리됩니다.</p>
              </div>
            )}

            {/* Todo list */}
            <div className="flex flex-col gap-1.5 mb-3">
              {todos.map((t) => (
                <div key={t.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleTodo(t.id)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      t.done
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-gray-300 hover:border-indigo-400"
                    }`}
                  >
                    {t.done && <Check size={10} />}
                  </button>
                  <span className={`flex-1 text-sm ${t.done ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {t.text}
                  </span>
                  <button
                    onClick={() => removeTodo(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add todo input */}
            <div className="flex gap-2">
              <input
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTodo()}
                placeholder="근거 항목 추가 (Enter)"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
              />
              <button
                onClick={addTodo}
                disabled={!newTodoText.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm disabled:opacity-40 hover:bg-indigo-700 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              예: "관련 책 3권 읽기", "팀장님께 조언 구하기" 등 이 목표를 달성하기 위해 한 일들을 적어보세요
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </>
  );
}

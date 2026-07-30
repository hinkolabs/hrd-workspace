"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Save, Globe, Lock, X, Plus, Check, Trash2, ChevronRight, Info, Pencil, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import type { GrowthMandalartCell, GrowthMandalartCellTodo, GrowthMandalart, GrowthThemeCategoryWithItems, CycleType } from "@/lib/growth-types";

// ── Color constants (뷰어와 동일) ────────────────────────────────────────────
export const BLOCK_BG = [
  "bg-blue-100/70", "bg-emerald-100/70", "bg-violet-100/70",
  "bg-orange-100/70", "bg-hana-surface", "bg-rose-100/70",
  "bg-amber-100/70", "bg-teal-100/70", "bg-indigo-100/70",
];
export const BLOCK_BORDER = [
  "border-blue-200", "border-emerald-200", "border-violet-200",
  "border-orange-200", "border-hana-border", "border-rose-200",
  "border-amber-200", "border-teal-200", "border-indigo-200",
];
export const CENTER_CELL_COLOR = [
  "bg-blue-400 text-white shadow-sm", "bg-emerald-400 text-white shadow-sm", "bg-violet-400 text-white shadow-sm",
  "bg-orange-400 text-white shadow-sm", "bg-hana-primary text-white shadow-sm", "bg-rose-400 text-white shadow-sm",
  "bg-amber-400 text-white shadow-sm", "bg-teal-400 text-white shadow-sm", "bg-indigo-400 text-white shadow-sm",
];
const DRAWER_ACCENT = [
  "text-blue-700 bg-blue-50", "text-green-700 bg-green-50", "text-purple-700 bg-purple-50",
  "text-orange-700 bg-orange-50", "text-hana-primary bg-hana-surface", "text-pink-700 bg-pink-50",
  "text-yellow-700 bg-yellow-50", "text-teal-700 bg-teal-50", "text-indigo-700 bg-indigo-50",
];

const DEFAULT_SUBGOAL_ORDER = [0, 1, 2, 3, 5, 6, 7, 8];

function priorityRankStyle(rank: number): string {
  if (rank <= 3) return "bg-hana-primary text-white";
  if (rank <= 5) return "bg-hana-secondary/80 text-white";
  return "bg-gray-200 text-gray-600";
}

/** subgoal_order 배열 위치(0-based) → 중요도 1~8 */
function buildPriorityMap(order: number[]): Record<number, number> {
  const map: Record<number, number> = {};
  order.slice(0, 8).forEach((cellIdx, i) => { map[cellIdx] = i + 1; });
  return map;
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

type CellKey = `${number}-${number}`;
type TodoItem = { id: string; text: string; done: boolean; order_idx: number; cycle_type: CycleType; cycle_weekdays: number[] | null; cycle_count: number };
type CellMap = Record<CellKey, GrowthMandalartCell>;
type TodoMap = Record<CellKey, TodoItem[]>;
type DrawerState = { blockIdx: number; cellIdx: number } | null;

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
        id: t.id, text: t.text, done: t.done, order_idx: t.order_idx,
        cycle_type: (t as GrowthMandalartCellTodo).cycle_type ?? "none",
        cycle_weekdays: (t as GrowthMandalartCellTodo).cycle_weekdays ?? null,
        cycle_count: (t as GrowthMandalartCellTodo).cycle_count ?? 1,
      }));
    }
  });
  return map;
}
function flattenCells(cellMap: CellMap, todoMap: TodoMap) {
  return Object.entries(cellMap).map(([key, c]) => {
    const todos = todoMap[key as CellKey] ?? [];
    return {
      block_idx: c.block_idx, cell_idx: c.cell_idx,
      text: c.text ?? "", emoji: c.emoji ?? "", done: c.done ?? false,
      todos: todos.map((t, idx) => ({
        text: t.text, done: t.done, order_idx: idx,
        cycle_type: t.cycle_type, cycle_weekdays: t.cycle_weekdays, cycle_count: t.cycle_count,
      })),
    };
  });
}

export default function MandalartEditor({
  initial, userId, onSaved,
}: {
  initial?: GrowthMandalart | null;
  userId: string;
  onSaved?: () => void;
}) {
  const [cellMap, setCellMap] = useState<CellMap>(() => buildCellMap(initial?.cells ?? []));
  const [todoMap, setTodoMap] = useState<TodoMap>(() => buildTodoMap(initial?.cells ?? []));
  const [centerGoal, setCenterGoal] = useState(initial?.center_goal ?? "");
  const [subgoalOrder, setSubgoalOrder] = useState<number[]>(() => initial?.subgoal_order ?? DEFAULT_SUBGOAL_ORDER);
  const [visibility, setVisibility] = useState<"cohort" | "private">(initial?.visibility ?? "cohort");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [coreDrawerOpen, setCoreDrawerOpen] = useState(false);
  const [guideYoutubeUrl, setGuideYoutubeUrl] = useState<string | null>(null);
  const [guideYoutubeUrl2, setGuideYoutubeUrl2] = useState<string | null>(null);
  const [themes, setThemes] = useState<GrowthThemeCategoryWithItems[]>([]);

  useEffect(() => {
    fetch("/api/growth/guide-settings")
      .then((r) => r.json())
      .then((d) => {
        setGuideYoutubeUrl(d?.youtube_url ?? null);
        setGuideYoutubeUrl2(d?.youtube_url_2 ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/growth/themes")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setThemes(d); })
      .catch(() => {});
  }, []);

  const resolveKey = useCallback((bi: number, ci: number): [number, number] => {
    if (bi !== 4 && ci === 4) return [4, bi];
    return [bi, ci];
  }, []);

  const getCell = useCallback((bi: number, ci: number): GrowthMandalartCell => {
    const [rbi, rci] = resolveKey(bi, ci);
    return cellMap[`${rbi}-${rci}`] ?? { id: "", mandalart_id: "", block_idx: rbi, cell_idx: rci, text: "", emoji: "", done: false };
  }, [cellMap, resolveKey]);

  const setCell = useCallback((bi: number, ci: number, updates: Partial<GrowthMandalartCell>) => {
    const [rbi, rci] = resolveKey(bi, ci);
    const key: CellKey = `${rbi}-${rci}`;
    setCellMap((prev) => ({ ...prev, [key]: { ...( prev[key] ?? { id: "", mandalart_id: "", block_idx: rbi, cell_idx: rci, text: "", emoji: "", done: false }), ...updates } }));
  }, [resolveKey]);

  const getTodos = useCallback((bi: number, ci: number): TodoItem[] => {
    const [rbi, rci] = resolveKey(bi, ci);
    return todoMap[`${rbi}-${rci}`] ?? [];
  }, [todoMap, resolveKey]);

  const setTodos = useCallback((bi: number, ci: number, todos: TodoItem[]) => {
    const [rbi, rci] = resolveKey(bi, ci);
    const key: CellKey = `${rbi}-${rci}`;
    setTodoMap((prev) => ({ ...prev, [key]: todos }));
    const autoDone = todos.length > 0 && todos.every((t) => t.done);
    setCellMap((prev) => {
      const existing = prev[key] ?? { id: "", mandalart_id: "", block_idx: rbi, cell_idx: rci, text: "", emoji: "", done: false };
      return { ...prev, [key]: { ...existing, done: autoDone } };
    });
  }, [resolveKey]);

  async function handleSave() {
    setSaving(true); setSaveStatus("idle"); setSaveError("");
    try {
      const cells = flattenCells(cellMap, todoMap);
      const res = await fetch(`/api/growth/mandalarts/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ center_goal: centerGoal, visibility, subgoal_order: subgoalOrder, cells }),
      });
      if (res.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 2500);
        onSaved?.();
      } else {
        const body = await res.json().catch(() => ({}));
        setSaveError(body?.error ?? body?.stage ?? `HTTP ${res.status}`);
        setSaveStatus("error");
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "네트워크 오류");
      setSaveStatus("error");
    } finally { setSaving(false); }
  }

  const priorityMap = buildPriorityMap(subgoalOrder);

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Guide — 항상 표시 */}
      <GuidePanel youtubeUrl={guideYoutubeUrl} youtubeUrl2={guideYoutubeUrl2} />

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap max-w-3xl mx-auto w-full">
        <button
          onClick={() => setVisibility(visibility === "cohort" ? "private" : "cohort")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
            visibility === "cohort" ? "border-hana-border bg-hana-surface text-hana-primary" : "border-gray-300 bg-gray-50 text-gray-600"
          }`}
        >
          {visibility === "cohort" ? <Globe size={12} /> : <Lock size={12} />}
          {visibility === "cohort" ? "팀 공개" : "비공개"}
        </button>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <p className="text-[11px] sm:text-sm md:text-base font-bold text-red-600 leading-tight text-right">※ 작성 후 반드시 저장하세요</p>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-hana-primary text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:bg-hana-dark hover:shadow-lg disabled:opacity-50 transition-all shrink-0">
            <Save size={16} /> {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {saveStatus === "success" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-medium max-w-3xl mx-auto w-full">
          <Check size={12} className="shrink-0" /> 저장되었습니다
        </div>
      )}
      {saveStatus === "error" && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 max-w-3xl mx-auto w-full">
          <span className="font-semibold">저장 실패:</span> {saveError}
        </div>
      )}

      {/* Grid */}
      <div className="w-full min-w-0">
        <div className="grid grid-cols-3 gap-1 p-1.5 sm:gap-2 sm:p-3 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border border-gray-200 shadow-md w-full max-w-3xl mx-auto min-w-0">
          {Array.from({ length: 9 }, (_, bi) => {
            const outerCells = Array.from({ length: 9 }, (__, ci) => getCell(bi, ci)).filter((_, ci) => ci !== 4);
            const filledCount = outerCells.filter(c => c.text?.trim()).length;
            const doneCount = outerCells.filter(c => c.done).length;
            const blockAllDone = filledCount > 0 && doneCount === filledCount;
            // 외곽 블록 bi ↔ 중앙 블록 cell_idx = bi (미러)
            const blockPriority = bi !== 4 ? priorityMap[bi] : undefined;
            return (
              <div key={bi} className={`rounded-xl border-2 flex flex-col gap-0.5 p-0.5 sm:p-1.5 shadow-sm transition-all min-w-0 overflow-hidden ${
                blockAllDone && bi !== 4
                  ? "bg-gradient-to-br from-green-100 to-emerald-50 border-green-300 shadow-green-100"
                  : `${BLOCK_BG[bi]} ${BLOCK_BORDER[bi]}`
              }`}>
                {bi !== 4 ? (
                  <div className="flex items-center px-0.5 mb-0.5 gap-0.5 sm:gap-1 min-w-0 h-3.5 sm:h-4">
                    {blockPriority != null && (
                      <span className={`shrink-0 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold ${priorityRankStyle(blockPriority)}`}>
                        {blockPriority}
                      </span>
                    )}
                    {blockAllDone ? (
                      <span className="ml-auto text-[8px] sm:text-[10px] font-bold text-green-600 bg-green-100 px-1 sm:px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                        ✓ 완료
                      </span>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0 h-1 bg-white/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-current opacity-40 transition-all duration-500"
                            style={{ width: filledCount > 0 ? `${Math.round((doneCount / filledCount) * 100)}%` : "0%" }}
                          />
                        </div>
                        <span className="text-[8px] sm:text-[10px] text-gray-500 tabular-nums font-medium shrink-0">{doneCount}/{filledCount > 0 ? filledCount : "0"}</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="h-3.5 sm:h-4 mb-0.5" aria-hidden="true" />
                )}
                <div className="grid grid-cols-3 gap-px sm:gap-0.5 min-w-0">
                  {Array.from({ length: 9 }, (_, ci) => {
                    const isCenter = ci === 4;
                    const isCoreCell = bi === 4 && ci === 4;
                    const isMirrorCell = bi !== 4 && ci === 4;
                    const cell = getCell(bi, ci);
                    const todos = getTodos(bi, ci);
                    const doneTodos = todos.filter(t => t.done).length;
                    const hasTodos = todos.length > 0;
                    const displayText = isCoreCell ? (centerGoal || cell?.text || "") : (cell?.text ?? "");
                    const clickable = isCoreCell || (!isMirrorCell && !isCoreCell);
                    const creditBadge = creditBadgeForCell(cell?.text ?? "", themes, todos);
                    // 중앙 블록 세부목표 셀에만 셀 단위 중요도 표시 (외곽은 블록 헤더에만)
                    const cellPriority = bi === 4 && !isCoreCell ? priorityMap[ci] : undefined;

                    return (
                      <EditorCell
                        key={ci}
                        text={displayText}
                        emoji={cell.emoji}
                        done={cell.done}
                        hasTodos={hasTodos}
                        doneTodos={doneTodos}
                        todoTotal={todos.length}
                        badgeOverride={creditBadge}
                        priorityRank={cellPriority}
                        isCenter={isCenter}
                        isCoreCell={isCoreCell}
                        isMirrorCell={isMirrorCell}
                        centerColorClass={CENTER_CELL_COLOR[bi]}
                        placeholder={
                          isCoreCell ? "핵심목표 클릭하여 설정"
                          : isMirrorCell ? (getCell(4, bi).text || `서브목표 ${blockPriority ?? ""}`)
                          : ""
                        }
                        onClick={() => {
                          if (isCoreCell) { setCoreDrawerOpen(true); return; }
                          if (!isMirrorCell) setDrawer({ blockIdx: bi, cellIdx: ci });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center max-w-3xl mx-auto w-full">셀을 클릭하면 세부실천 과제를 추가하고 수정할 수 있어요</p>

      {/* Cell Drawer */}
      {drawer && (
        <CellDrawer
          blockIdx={drawer.blockIdx}
          cellIdx={drawer.cellIdx}
          cell={getCell(drawer.blockIdx, drawer.cellIdx)}
          todos={getTodos(drawer.blockIdx, drawer.cellIdx)}
          themes={themes}
          accentClass={DRAWER_ACCENT[drawer.blockIdx]}
          onCellChange={(u) => setCell(drawer.blockIdx, drawer.cellIdx, u)}
          onTodosChange={(t) => setTodos(drawer.blockIdx, drawer.cellIdx, t)}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* Core Goal Drawer */}
      {coreDrawerOpen && (
        <CoreGoalDrawer
          centerGoal={centerGoal}
          subgoalOrder={subgoalOrder}
          getSubgoalText={(idx) => getCell(4, idx).text ?? ""}
          onSave={(goal, subgoals, order) => {
            setCenterGoal(goal);
            setSubgoalOrder(order);
            subgoals.forEach((text, i) => {
              const cellIdx = order[i] ?? DEFAULT_SUBGOAL_ORDER[i];
              setCell(4, cellIdx, { text });
            });
            setCoreDrawerOpen(false);
          }}
          onClose={() => setCoreDrawerOpen(false)}
        />
      )}
    </div>
  );
}

// ── EditorCell: div 기반, 뷰어와 동일한 구조 ────────────────────────────────
function EditorCell({
  text, emoji, done, hasTodos, doneTodos, todoTotal, badgeOverride, priorityRank,
  isCenter, isCoreCell, isMirrorCell, centerColorClass, placeholder, onClick,
}: {
  text: string; emoji?: string; done: boolean;
  hasTodos: boolean; doneTodos: number; todoTotal: number;
  badgeOverride?: string | null;
  priorityRank?: number;
  isCenter: boolean; isCoreCell: boolean; isMirrorCell: boolean;
  centerColorClass: string; placeholder: string; onClick: () => void;
}) {
  const clickable = !isMirrorCell;
  const showBadge = !isCoreCell && !isMirrorCell && (hasTodos || !!badgeOverride);
  const badgeText = badgeOverride
    ? (done ? `✓ ${badgeOverride}` : badgeOverride)
    : (done ? "✓" : `${doneTodos}/${todoTotal}`);
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={[
        "relative aspect-square w-full min-w-0 overflow-hidden flex flex-col items-center justify-center text-center text-[8px] sm:text-[10px] md:text-xs leading-tight p-0.5 sm:p-1 rounded-md sm:rounded-lg transition-all select-none group",
        isCenter
          ? `font-bold ${centerColorClass} rounded-lg sm:rounded-xl`
          : done
          ? "bg-gradient-to-br from-green-100 to-emerald-50 text-green-800 border border-green-200 shadow-[0_0_8px_rgba(34,197,94,0.2)]"
          : text
          ? "bg-white text-gray-700 border border-gray-100 shadow-sm"
          : isMirrorCell
          ? "bg-white/40 text-gray-300"
          : "bg-white/50 border border-dashed border-gray-200 text-gray-300 hover:border-hana-primary/40 hover:bg-hana-surface/50",
        clickable ? "cursor-pointer sm:hover:scale-[1.04] hover:shadow-md active:scale-[0.97]" : "",
      ].filter(Boolean).join(" ")}
    >
      {priorityRank != null && !isCoreCell && (
        <span className={`absolute top-0 left-0 sm:top-0.5 sm:left-0.5 z-[1] w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] font-bold leading-none ${priorityRankStyle(priorityRank)}`}>
          {priorityRank}
        </span>
      )}
      {emoji && <span className="text-[9px] sm:text-[11px] mb-0.5 shrink-0">{emoji}</span>}
      {text ? (
        <span className="break-words line-clamp-2 sm:line-clamp-3 font-medium px-0.5 w-full min-w-0 overflow-hidden">{text}</span>
      ) : isCenter ? null : isMirrorCell ? (
        <span className="text-[7px] sm:text-[10px] opacity-50 leading-tight px-0.5 w-full min-w-0 overflow-hidden line-clamp-2">{placeholder}</span>
      ) : (
        <span className="text-[8px] sm:text-[10px] opacity-0 group-hover:opacity-60 transition-opacity leading-tight flex flex-col items-center gap-0.5">
          <Pencil size={9} />
          <span className="hidden sm:inline">입력</span>
        </span>
      )}
      {showBadge && (
        <span className={`absolute top-0 right-0 sm:top-0.5 sm:right-0.5 text-[6px] sm:text-[9px] font-bold px-0.5 sm:px-1 py-px sm:py-0.5 rounded-full leading-none max-w-[85%] truncate ${
          done
            ? "bg-green-500 text-white shadow-sm"
            : badgeOverride || doneTodos > 0
            ? "bg-hana-primary text-white"
            : "bg-gray-200 text-gray-500"
        }`}>
          {badgeText}
        </span>
      )}
      {isCoreCell && (
        <span className="absolute bottom-0.5 right-0.5 opacity-30 group-hover:opacity-60 transition-opacity hidden sm:block">
          <Pencil size={8} />
        </span>
      )}
    </div>
  );
}

// ── CoreGoalDrawer: 핵심목표 + 8개 세부목표 편집 ────────────────────────────
function CoreGoalDrawer({
  centerGoal, subgoalOrder, getSubgoalText, onSave, onClose,
}: {
  centerGoal: string;
  subgoalOrder: number[];
  getSubgoalText: (idx: number) => string;
  onSave: (goal: string, subgoals: string[], order: number[]) => void;
  onClose: () => void;
}) {
  const [goal, setGoal] = useState(centerGoal);
  const [order] = useState<number[]>(() =>
    (subgoalOrder?.length === 8 ? subgoalOrder : DEFAULT_SUBGOAL_ORDER)
  );
  const [subgoals, setSubgoals] = useState<string[]>(() =>
    order.map((idx) => getSubgoalText(idx))
  );
  const filledCount = subgoals.filter(s => s.trim()).length;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        <div className="px-5 py-4 bg-hana-primary text-white flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs font-medium opacity-70">핵심목표 & 세부목표 설정</p>
            <p className="text-sm font-bold">중앙 블록 편집</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* 핵심목표 */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">핵심목표</label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="예: 하나증권 최고의 신입이 되기"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-hana-primary focus:outline-none"
            />
          </div>

          {/* 세부목표 8개 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-700">세부목표</label>
              {filledCount > 0 && <span className="text-xs text-hana-primary font-medium">{filledCount}/8 입력됨</span>}
            </div>
            <div className="flex flex-col gap-2">
              {subgoals.map((sg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i < 3 ? "bg-hana-primary text-white" : i < 5 ? "bg-hana-secondary/80 text-white" : "bg-gray-200 text-gray-500"
                  }`}>{i + 1}</span>
                  <input
                    value={sg}
                    onChange={(e) => { const n = [...subgoals]; n[i] = e.target.value; setSubgoals(n); }}
                    placeholder={`세부목표 ${i + 1}`}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-hana-primary focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => onSave(goal, subgoals, order)}
            className="w-full py-2.5 bg-hana-primary text-white text-sm font-semibold rounded-xl hover:bg-hana-dark transition-colors"
          >
            적용
          </button>
        </div>
      </div>
    </>
  );
}

function themeItemNames(cat: GrowthThemeCategoryWithItems | undefined): Set<string> {
  return new Set((cat?.items ?? []).map((i) => i.name));
}

function themeItemNameList(cat: GrowthThemeCategoryWithItems | undefined): string[] {
  return (cat?.items ?? []).map((i) => i.name);
}

function isCreditTheme(name: string | undefined | null): boolean {
  return !!name && name.includes("학점");
}

/** 텍스트에서 'N학점' 표기 추출 */
function extractCreditLabel(text: string | undefined | null): string | null {
  if (!text?.trim()) return null;
  const t = text.trim();
  const withUnit = t.match(/(\d+)\s*학점/);
  if (withUnit) return `${withUnit[1]}학점`;
  if (/^\d+$/.test(t)) return `${t}학점`;
  const anyNum = t.match(/(\d+)/);
  if (anyNum) return `${anyNum[1]}학점`;
  return null;
}

/** 학점 테마: 사용자가 입력한 단일 학점 숫자를 뱃지로 (의무학점 설명은 사용하지 않음) */
function creditBadgeForCell(
  cellText: string,
  themes: GrowthThemeCategoryWithItems[],
  todos?: TodoItem[],
): string | null {
  const theme = themes.find((c) => c.name === cellText);
  if (!theme || !isCreditTheme(theme.name)) return null;

  for (const todo of todos ?? []) {
    const fromTodo = extractCreditLabel(todo.text);
    if (fromTodo) return fromTodo;
  }

  return null;
}

/** 테마 전환 시: 이전 담당자 항목 제거 + 새 테마의 담당자 등록 항목 전부 강제 포함 */
function syncTodosForTheme(
  currentTodos: TodoItem[],
  prevTheme: GrowthThemeCategoryWithItems | undefined,
  nextTheme: GrowthThemeCategoryWithItems | undefined,
): TodoItem[] {
  const prevNames = themeItemNames(prevTheme);
  let next = prevTheme
    ? currentTodos.filter((t) => !prevNames.has(t.text))
    : [...currentTodos];

  // 학점 테마: 카탈로그 강제 추가 없음, 세부실천 최대 1개
  if (nextTheme && isCreditTheme(nextTheme.name)) {
    return next.slice(0, 1).map((t, i) => ({ ...t, order_idx: i }));
  }

  if (nextTheme) {
    const existing = new Set(next.map((t) => t.text));
    for (const name of themeItemNameList(nextTheme)) {
      if (!existing.has(name)) {
        next.push({ id: `tmp-${Date.now()}-${name}`, text: name, done: false, order_idx: next.length, cycle_type: "none", cycle_weekdays: null, cycle_count: 1 });
        existing.add(name);
      }
    }
  }

  return next.map((t, i) => ({ ...t, order_idx: i }));
}

// ── 주기(반복) 관련 헬퍼 ────────────────────────────────────────────────────
const CYCLE_LABELS: Record<CycleType, string> = {
  none: "1회",
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
  quarterly: "분기",
  yearly: "매년",
  weekday: "요일지정",
};
const CYCLE_COUNT_UNIT: Record<CycleType, string> = {
  none: "",
  daily: "하루",
  weekly: "주",
  monthly: "월",
  quarterly: "분기",
  yearly: "연",
  weekday: "해당 요일",
};
const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function formatCycleBadge(cycleType: CycleType, cycleWeekdays: number[] | null, cycleCount: number): string | null {
  if (cycleType === "none") return null;
  if (cycleType === "weekday") {
    const days = (cycleWeekdays ?? []).sort((a, b) => a - b).map((d) => WEEKDAY_NAMES[d]).join("·");
    const label = days || "요일미설정";
    return cycleCount > 1 ? `${label} ${cycleCount}회` : label;
  }
  return cycleCount > 1 ? `${CYCLE_LABELS[cycleType]} ${cycleCount}회` : CYCLE_LABELS[cycleType];
}

// ── CellDrawer: 세부 항목 선택 → 실천과제 추가 ──────────────────────────────
function CellDrawer({
  blockIdx, cellIdx, cell, todos, themes, accentClass, onCellChange, onTodosChange, onClose,
}: {
  blockIdx: number; cellIdx: number;
  cell: GrowthMandalartCell; todos: TodoItem[];
  themes: GrowthThemeCategoryWithItems[];
  accentClass: string;
  onCellChange: (u: Partial<GrowthMandalartCell>) => void;
  onTodosChange: (t: TodoItem[]) => void;
  onClose: () => void;
}) {
  const [newTodoText, setNewTodoText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [newCycleType, setNewCycleType] = useState<CycleType>("none");
  const [newCycleWeekdays, setNewCycleWeekdays] = useState<number[]>([]);
  const [newCycleCount, setNewCycleCount] = useState(1);
  const prevCatalogRef = useRef<Set<string>>(new Set());

  const NEGATIVE_PATTERNS = /안\s|못\s|하지\s*않|하지\s*말|금지|안됨|못함/;
  const allDone = todos.length > 0 && todos.every((t) => t.done);
  const donePct = todos.length > 0 ? Math.round((todos.filter(t => t.done).length / todos.length) * 100) : 0;
  const showNegativeWarning = NEGATIVE_PATTERNS.test(newTodoText) || !!(editingId && NEGATIVE_PATTERNS.test(editingText));

  const matchedTheme = themes.find((cat) => cat.name === cell.text);
  const isCredit = isCreditTheme(matchedTheme?.name);
  // 담당자가 등록한 테마 항목 전부 = 강제 포함·삭제 불가 (학점 테마는 강제 없음)
  const lockedNames = isCredit ? new Set<string>() : themeItemNames(matchedTheme);
  const catalogKey = matchedTheme
    ? matchedTheme.items.map((i) => `${i.id}:${i.name}`).join("|")
    : "";

  // 테마 선택 시 담당자 등록 항목 전부 강제 반영 + 카탈로그에서 빠진 항목 제거
  // 학점 테마는 강제 추가하지 않고 최대 1개만 유지
  useEffect(() => {
    if (themes.length === 0 || !matchedTheme) {
      prevCatalogRef.current = new Set();
      return;
    }

    if (isCreditTheme(matchedTheme.name)) {
      prevCatalogRef.current = new Set();
      if (todos.length > 1) {
        onTodosChange(todos.slice(0, 1).map((t, i) => ({ ...t, order_idx: i })));
      }
      return;
    }

    const catalog = themeItemNames(matchedTheme);
    const forced = themeItemNameList(matchedTheme);
    let next = [...todos];
    let changed = false;

    const removedNames = [...prevCatalogRef.current].filter((n) => !catalog.has(n));
    if (removedNames.length > 0) {
      const removeSet = new Set(removedNames);
      const filtered = next.filter((t) => !removeSet.has(t.text));
      if (filtered.length !== next.length) {
        next = filtered;
        changed = true;
      }
    }

    const existing = new Set(next.map((t) => t.text));
    for (const name of forced) {
      if (!existing.has(name)) {
        next.push({ id: `tmp-${Date.now()}-${name}`, text: name, done: false, order_idx: next.length, cycle_type: "none", cycle_weekdays: null, cycle_count: 1 });
        existing.add(name);
        changed = true;
      }
    }

    prevCatalogRef.current = catalog;

    if (changed) {
      onTodosChange(next.map((t, i) => ({ ...t, order_idx: i })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themes, matchedTheme?.id, catalogKey, isCredit]);

  const creditTodo = isCredit ? ([...todos].sort((a, b) => a.order_idx - b.order_idx)[0] ?? null) : null;
  const creditNumValue = creditTodo ? (extractCreditLabel(creditTodo.text)?.replace("학점", "") ?? "") : "";

  function setCreditNumber(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    if (!digits) {
      onTodosChange([]);
      return;
    }
    const text = `${digits}학점`;
    const existing = todos[0];
    onTodosChange([{
      id: existing?.id ?? `tmp-${Date.now()}`,
      text,
      done: existing?.done ?? false,
      order_idx: 0,
      cycle_type: existing?.cycle_type ?? "none",
      cycle_weekdays: existing?.cycle_weekdays ?? null,
      cycle_count: existing?.cycle_count ?? 1,
    }]);
  }

  function toggleCreditDone() {
    if (todos.length === 0) return;
    const t = todos[0];
    onTodosChange([{ ...t, done: !t.done, order_idx: 0 }]);
  }

  function addTodo() {
    if (!newTodoText.trim()) return;
    if (isCredit) {
      // 학점: 최대 1개 — 기존이 있으면 교체
      onTodosChange([{
        id: todos[0]?.id ?? `tmp-${Date.now()}`,
        text: newTodoText.trim(),
        done: todos[0]?.done ?? false,
        order_idx: 0,
        cycle_type: "none",
        cycle_weekdays: null,
        cycle_count: 1,
      }]);
      setNewTodoText("");
      return;
    }
    onTodosChange([...todos, {
      id: `tmp-${Date.now()}`, text: newTodoText.trim(), done: false, order_idx: todos.length,
      cycle_type: newCycleType,
      cycle_weekdays: newCycleType === "weekday" ? newCycleWeekdays : null,
      cycle_count: newCycleType === "none" ? 1 : newCycleCount,
    }]);
    setNewTodoText("");
    setNewCycleType("none");
    setNewCycleWeekdays([]);
    setNewCycleCount(1);
    setNewCycleOpen(false);
  }

  function handleThemeSelect(nextName: string) {
    const prevTheme = matchedTheme;
    const nextTheme = themes.find((c) => c.name === nextName);
    onCellChange({ text: nextName });
    onTodosChange(syncTodosForTheme(todos, prevTheme, nextTheme));
  }

  function toggleThemeItemAsTodo(itemName: string) {
    // 담당자 등록 항목은 선택 해제 불가 (강제)
    if (lockedNames.has(itemName)) return;
    const exists = todos.some((t) => t.text === itemName);
    if (exists) {
      onTodosChange(todos.filter((t) => t.text !== itemName));
    } else {
      onTodosChange([...todos, { id: `tmp-${Date.now()}`, text: itemName, done: false, order_idx: todos.length, cycle_type: "none", cycle_weekdays: null, cycle_count: 1 }]);
    }
  }

  function removeTodo(todo: TodoItem) {
    if (lockedNames.has(todo.text)) return; // 담당자 등록 항목 삭제 불가
    onTodosChange(todos.filter((x) => x.id !== todo.id));
  }

  // todo 완료 토글
  function handleToggleTodo(todo: TodoItem) {
    const newDone = !todo.done;
    onTodosChange(todos.map((x) => x.id === todo.id ? { ...x, done: newDone } : x));
  }

  const sortedTodos = [...todos].sort((a, b) => a.order_idx - b.order_idx);

  function moveTodoUp(idx: number) {
    if (idx === 0) return;
    const next = [...sortedTodos];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onTodosChange(next.map((t, i) => ({ ...t, order_idx: i })));
  }

  function moveTodoDown(idx: number) {
    if (idx === sortedTodos.length - 1) return;
    const next = [...sortedTodos];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onTodosChange(next.map((t, i) => ({ ...t, order_idx: i })));
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        <div className={`px-5 py-4 ${accentClass} flex items-center justify-between shrink-0`}>
          <div>
            <p className="text-xs font-medium opacity-70">블록 {blockIdx + 1} · 셀 {cellIdx + 1}</p>
            <p className="text-sm font-bold truncate">{cell.text || "세부실천 과제"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

          {/* ── STEP 1: 세부실천 과제 선택 ── */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">① 세부실천 과제 선택</p>

            {/* 콤보박스 — 직접 입력(디폴트) + 담당자 등록 테마 */}
            <div className="relative">
              <select
                value={themes.some(c => c.name === cell.text) ? cell.text : ""}
                onChange={(e) => handleThemeSelect(e.target.value)}
                className="w-full px-3 py-2.5 pr-8 text-sm border border-gray-200 rounded-xl focus:border-hana-primary focus:outline-none bg-white appearance-none cursor-pointer"
              >
                <option value="">✏️ 직접 입력</option>
                {themes.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.icon_emoji} {cat.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* 테마 설명 — 학점 테마는 '학점', 그 외는 '세부사항' */}
            {matchedTheme?.description && (
              <div className="mt-2 px-3 py-2.5 rounded-xl bg-hana-surface border border-hana-border">
                <p className="text-[10px] font-semibold text-hana-primary mb-0.5">
                  {isCreditTheme(matchedTheme.name) ? "학점" : "세부사항"}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{matchedTheme.description}</p>
              </div>
            )}

            {/* 직접 입력 선택 시 텍스트 인풋 표시 */}
            {!themes.some(c => c.name === cell.text) && (
              <input
                autoFocus
                value={cell.text}
                onChange={(e) => onCellChange({ text: e.target.value })}
                placeholder="예: 자격증 취득, 업무 스킬 향상 등"
                className="w-full mt-2 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-hana-primary focus:outline-none"
              />
            )}
          </div>

          {/* ── STEP 2: 세부실천 과제 추가 ── */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              {isCredit ? "② 취득 학점 입력" : "② 세부실천 과제 추가"}
            </p>

            {isCredit ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">학점은 하나만 입력할 수 있어요. 완료 체크 시 셀에 학점이 표시됩니다.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={999}
                    value={creditNumValue}
                    onChange={(e) => setCreditNumber(e.target.value)}
                    placeholder="예: 3"
                    className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-hana-primary focus:outline-none"
                  />
                  <span className="text-sm font-semibold text-gray-600 shrink-0">학점</span>
                </div>
                {creditTodo && (
                  <button
                    type="button"
                    onClick={toggleCreditDone}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                      creditTodo.done
                        ? "bg-green-50 border-green-300 text-green-700"
                        : "bg-white border-gray-200 text-gray-600 hover:border-hana-primary hover:text-hana-primary"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                      creditTodo.done ? "border-green-500 bg-green-500 text-white" : "border-gray-300"
                    }`}>
                      {creditTodo.done && <Check size={12} />}
                    </span>
                    {creditTodo.done
                      ? `완료 · ✓ ${extractCreditLabel(creditTodo.text) ?? creditTodo.text}`
                      : "완료로 체크하기"}
                  </button>
                )}
                {creditTodo?.done && (
                  <div className="relative overflow-hidden rounded-xl border border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm">
                    <div className="px-4 py-3 flex items-center gap-3">
                      <span className="text-2xl select-none">🎉</span>
                      <div>
                        <p className="text-sm font-bold text-green-700">학점 취득 완료!</p>
                        <p className="text-xs text-green-600 mt-0.5">셀에 ✓ {extractCreditLabel(creditTodo.text)} 으로 표시됩니다.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
            {/* 진행률 */}
            {todos.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">진행률</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
                    allDone ? "bg-green-100 text-green-700" : donePct >= 50 ? "bg-hana-surface text-hana-primary" : "bg-gray-100 text-gray-600"
                  }`}>
                    {todos.filter(t => t.done).length}/{todos.length} 완료
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${allDone ? "bg-green-100" : "bg-gray-100"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      allDone
                        ? "bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                        : donePct >= 50
                        ? "bg-gradient-to-r from-hana-primary to-hana-secondary"
                        : "bg-hana-primary"
                    }`}
                    style={{ width: `${donePct}%` }}
                  />
                </div>
                <p className={`text-xs mt-0.5 text-right font-semibold ${allDone ? "text-green-600" : "text-gray-400"}`}>
                  {donePct}%
                </p>
              </div>
            )}
            {allDone && (
              <div className="mb-3 relative overflow-hidden rounded-xl border border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm">
                <div className="px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl select-none animate-bounce">🎉</span>
                  <div>
                    <p className="text-sm font-bold text-green-700">모두 완료했어요!</p>
                    <p className="text-xs text-green-600 mt-0.5">이 셀이 달성 처리됩니다.</p>
                  </div>
                  <span className="ml-auto text-lg select-none">✨</span>
                </div>
                {/* shimmer bar */}
                <div className="h-1 w-full bg-green-200 overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-shimmer" />
                </div>
              </div>
            )}

            {/* 기존 할일 목록 — 우선순위순 */}
            {sortedTodos.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-3">
                {sortedTodos.map((t, idx) => {
                  const cycleBadge = formatCycleBadge(t.cycle_type, t.cycle_weekdays, t.cycle_count);
                  const isCycleOpen = expandedCycleId === t.id;
                  return (
                    <div key={t.id}>
                      <div className="flex items-center gap-2 group">
                        {/* 우선순위 번호 배지 */}
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold select-none ${
                          t.done
                            ? "bg-gray-100 text-gray-400"
                            : idx === 0
                              ? "bg-hana-primary text-white"
                              : idx === 1
                                ? "bg-hana-secondary/80 text-white"
                                : idx === 2
                                  ? "bg-hana-secondary/50 text-white"
                                  : "bg-gray-200 text-gray-500"
                        }`}>{idx + 1}</span>

                        {/* 체크박스 */}
                        <button onClick={() => handleToggleTodo(t)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                            t.done ? "border-green-500 bg-green-500 text-white" : "border-gray-300 hover:border-hana-primary"
                          }`}>
                          {t.done && <Check size={10} />}
                        </button>

                        {/* 텍스트 */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          {editingId === t.id ? (
                            <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { onTodosChange(todos.map(x => x.id === t.id ? { ...x, text: editingText.trim() } : x)); setEditingId(null); }
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              onBlur={() => { onTodosChange(todos.map(x => x.id === t.id ? { ...x, text: editingText.trim() } : x)); setEditingId(null); }}
                              className="text-sm px-2 py-0.5 border border-hana-border rounded-lg focus:outline-none focus:border-hana-primary"
                            />
                          ) : (
                            <span className={`text-sm ${t.done ? "line-through text-gray-400" : "text-gray-700"}`}
                              onDoubleClick={() => !t.done && !lockedNames.has(t.text) && (setEditingId(t.id), setEditingText(t.text))}>
                              {t.text}
                            </span>
                          )}
                          {/* 주기 배지 — 관리자 등록 필수 항목은 반복 설정 불가 */}
                          {cycleBadge && !lockedNames.has(t.text) && (
                            <button
                              type="button"
                              onClick={() => setExpandedCycleId(isCycleOpen ? null : t.id)}
                              className="mt-0.5 self-start text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors leading-none"
                            >
                              🔁 {cycleBadge}
                            </button>
                          )}
                          {/* 주기 미설정 시 항상 보이는 반복 설정 버튼 */}
                          {!cycleBadge && !t.done && !lockedNames.has(t.text) && (
                            <button
                              type="button"
                              onClick={() => setExpandedCycleId(isCycleOpen ? null : t.id)}
                              className="mt-0.5 self-start text-[10px] text-gray-400 hover:text-indigo-500 transition-colors leading-none"
                            >
                              🔁 반복 설정
                            </button>
                          )}
                        </div>

                        {/* 우선순위 ↑↓ + 수정/삭제 버튼 */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                          <div className="flex flex-col gap-0">
                            <button onClick={() => moveTodoUp(idx)} disabled={idx === 0}
                              className="p-0.5 text-gray-400 hover:text-hana-primary disabled:opacity-20 transition-colors">
                              <ArrowUp size={11} />
                            </button>
                            <button onClick={() => moveTodoDown(idx)} disabled={idx === sortedTodos.length - 1}
                              className="p-0.5 text-gray-400 hover:text-hana-primary disabled:opacity-20 transition-colors">
                              <ArrowDown size={11} />
                            </button>
                          </div>
                          {!t.done && editingId !== t.id && !lockedNames.has(t.text) && (
                            <button onClick={() => (setEditingId(t.id), setEditingText(t.text))} className="p-0.5 text-gray-400 hover:text-hana-primary transition-colors">
                              <Pencil size={11} />
                            </button>
                          )}
                          {lockedNames.has(t.text) ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">필수</span>
                          ) : (
                            <button onClick={() => removeTodo(t)} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 인라인 주기 에디터 */}
                      {isCycleOpen && (
                        <div className="mt-1.5 ml-12 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col gap-2.5">
                          {/* 유형 선택 칩 */}
                          <div>
                            <p className="text-[10px] font-semibold text-indigo-700 mb-1.5">반복 유형</p>
                            <div className="flex flex-wrap gap-1">
                              {(["none", "daily", "weekly", "monthly", "quarterly", "yearly", "weekday"] as CycleType[]).map((ct) => (
                                <button
                                  key={ct}
                                  type="button"
                                  onClick={() => {
                                    const next = todos.map(x => x.id === t.id ? { ...x, cycle_type: ct, cycle_weekdays: ct === "weekday" ? (x.cycle_weekdays ?? []) : null, cycle_count: ct === "none" ? 1 : x.cycle_count } : x);
                                    onTodosChange(next);
                                  }}
                                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                                    t.cycle_type === ct
                                      ? "bg-indigo-600 text-white border-indigo-600"
                                      : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                                  }`}
                                >
                                  {CYCLE_LABELS[ct]}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 요일 선택 (요일지정 시) */}
                          {t.cycle_type === "weekday" && (
                            <div>
                              <p className="text-[10px] font-semibold text-indigo-700 mb-1.5">요일 선택</p>
                              <div className="flex gap-1">
                                {WEEKDAY_NAMES.map((name, dayIdx) => {
                                  const isSelected = (t.cycle_weekdays ?? []).includes(dayIdx);
                                  return (
                                    <button
                                      key={dayIdx}
                                      type="button"
                                      onClick={() => {
                                        const current = t.cycle_weekdays ?? [];
                                        const next = isSelected ? current.filter(d => d !== dayIdx) : [...current, dayIdx];
                                        onTodosChange(todos.map(x => x.id === t.id ? { ...x, cycle_weekdays: next } : x));
                                      }}
                                      className={`w-7 h-7 rounded-full text-[11px] font-bold border transition-colors ${
                                        isSelected
                                          ? "bg-indigo-600 text-white border-indigo-600"
                                          : "bg-white text-gray-500 border-gray-300 hover:border-indigo-400"
                                      }`}
                                    >
                                      {name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 횟수 설정 (단발성 아닐 때) */}
                          {t.cycle_type !== "none" && (
                            <div>
                              <p className="text-[10px] font-semibold text-indigo-700 mb-1.5">
                                {CYCLE_COUNT_UNIT[t.cycle_type]}당 횟수
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onTodosChange(todos.map(x => x.id === t.id ? { ...x, cycle_count: Math.max(1, x.cycle_count - 1) } : x))}
                                  disabled={t.cycle_count <= 1}
                                  className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-600 font-bold disabled:opacity-30 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center text-sm"
                                >−</button>
                                <span className="text-sm font-bold text-indigo-700 min-w-[2rem] text-center">{t.cycle_count}회</span>
                                <button
                                  type="button"
                                  onClick={() => onTodosChange(todos.map(x => x.id === t.id ? { ...x, cycle_count: Math.min(99, x.cycle_count + 1) } : x))}
                                  className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-600 font-bold hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center text-sm"
                                >+</button>
                                <span className="text-[11px] text-indigo-600 font-medium">
                                  {t.cycle_count > 1 ? `예: ${CYCLE_LABELS[t.cycle_type]} ${t.cycle_count}회` : ""}
                                </span>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedCycleId(null)}
                            className="self-end text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            완료
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 담당자 등록 항목 빠른 추가 — 선택한 카테고리가 있을 때 */}
            {matchedTheme && matchedTheme.items.length > 0 && (
              <div className="mb-3 rounded-xl border border-hana-border overflow-hidden">
                <div className="px-3 py-2 bg-hana-surface">
                  <p className="text-xs font-semibold text-hana-primary">
                    {matchedTheme.icon_emoji} {matchedTheme.name} 항목 추가
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">담당자 등록 항목은 자동 추가되며 해제할 수 없습니다</p>
                </div>
                <div className="p-2 flex flex-col gap-1">
                  {matchedTheme.items.map((item) => {
                    const inTodos = todos.some((t) => t.text === item.name);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleThemeItemAsTodo(item.name)}
                        disabled
                        title="담당자 등록 항목은 해제할 수 없습니다"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left border bg-hana-surface border-hana-border text-hana-primary font-medium cursor-default"
                      >
                        <span className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 border-hana-primary bg-hana-primary text-white">
                          {inTodos && <Check size={9} />}
                        </span>
                        <span className="flex-1">{item.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">필수</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 직접 입력 추가 */}
            <div className="flex gap-2">
              <input value={newTodoText} onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTodo()}
                placeholder="직접 입력 (예: ~하기)"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-hana-primary focus:outline-none"
              />
              {/* 반복 주기 토글 */}
              <button
                type="button"
                onClick={() => setNewCycleOpen((v) => !v)}
                title="반복 주기 설정"
                className={`px-2.5 py-2 rounded-xl border text-sm transition-colors ${
                  newCycleType !== "none"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : newCycleOpen
                    ? "bg-indigo-50 text-indigo-600 border-indigo-300"
                    : "bg-white text-gray-400 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"
                }`}
              >
                🔁
              </button>
              <button onClick={addTodo} disabled={!newTodoText.trim()}
                className="px-3 py-2 bg-hana-primary text-white rounded-xl text-sm disabled:opacity-40 hover:bg-hana-dark transition-colors">
                <Plus size={14} />
              </button>
            </div>
            {/* 신규 할일 주기 설정 패널 */}
            {newCycleOpen && (
              <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col gap-2.5">
                <div>
                  <p className="text-[10px] font-semibold text-indigo-700 mb-1.5">반복 유형</p>
                  <div className="flex flex-wrap gap-1">
                    {(["none", "daily", "weekly", "monthly", "quarterly", "yearly", "weekday"] as CycleType[]).map((ct) => (
                      <button key={ct} type="button"
                        onClick={() => { setNewCycleType(ct); if (ct === "none") { setNewCycleCount(1); setNewCycleWeekdays([]); } }}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                          newCycleType === ct
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                        }`}
                      >
                        {CYCLE_LABELS[ct]}
                      </button>
                    ))}
                  </div>
                </div>
                {newCycleType === "weekday" && (
                  <div>
                    <p className="text-[10px] font-semibold text-indigo-700 mb-1.5">요일 선택</p>
                    <div className="flex gap-1">
                      {WEEKDAY_NAMES.map((name, dayIdx) => {
                        const isSel = newCycleWeekdays.includes(dayIdx);
                        return (
                          <button key={dayIdx} type="button"
                            onClick={() => setNewCycleWeekdays(isSel ? newCycleWeekdays.filter(d => d !== dayIdx) : [...newCycleWeekdays, dayIdx])}
                            className={`w-7 h-7 rounded-full text-[11px] font-bold border transition-colors ${isSel ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-300 hover:border-indigo-400"}`}
                          >{name}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {newCycleType !== "none" && (
                  <div>
                    <p className="text-[10px] font-semibold text-indigo-700 mb-1.5">{CYCLE_COUNT_UNIT[newCycleType]}당 횟수</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setNewCycleCount(Math.max(1, newCycleCount - 1))} disabled={newCycleCount <= 1}
                        className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-600 font-bold disabled:opacity-30 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center text-sm">−</button>
                      <span className="text-sm font-bold text-indigo-700 min-w-[2rem] text-center">{newCycleCount}회</span>
                      <button type="button" onClick={() => setNewCycleCount(Math.min(99, newCycleCount + 1))}
                        className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-600 font-bold hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center text-sm">+</button>
                      {newCycleCount > 1 && <span className="text-[11px] text-indigo-600 font-medium">예: {CYCLE_LABELS[newCycleType]} {newCycleCount}회</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
            {newCycleType !== "none" && (
              <p className="text-[11px] text-indigo-600 font-medium mt-1">
                🔁 {formatCycleBadge(newCycleType, newCycleType === "weekday" ? newCycleWeekdays : null, newCycleCount)} 으로 추가됩니다
              </p>
            )}
            {showNegativeWarning && (
              <p className="text-xs text-amber-600 mt-1">⚠ 부정문보다 긍정문 행위동사로 작성하면 더 효과적이에요</p>
            )}
            {sortedTodos.length > 0 && <p className="text-xs text-gray-400 mt-1.5">↑↓으로 우선순위 변경 · 더블클릭하면 수정</p>}
              </>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 bg-hana-primary text-white text-sm font-semibold rounded-xl hover:bg-hana-dark transition-colors">
            확인
          </button>
        </div>
      </div>
    </>
  );
}

function GuideThumb({ url, label }: { url: string | null; label: string }) {
  const videoId = url ? extractYoutubeId(url) : null;
  if (videoId && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex-1 min-w-0 aspect-video rounded-xl overflow-hidden border border-hana-border hover:border-hana-primary/50 hover:shadow-md transition-all"
      >
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt={label}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 group-hover:bg-black/25 transition-colors gap-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <span className="text-red-600 text-sm ml-0.5">▶</span>
          </div>
          <span className="text-white text-[9px] sm:text-[10px] font-semibold drop-shadow">{label}</span>
        </div>
      </a>
    );
  }
  return (
    <div className="flex-1 min-w-0 aspect-video rounded-xl border-2 border-dashed border-hana-border bg-white/50 flex flex-col items-center justify-center gap-1 px-2">
      <span className="text-lg">🎬</span>
      <span className="text-[9px] text-gray-400 text-center leading-tight">영상 미등록</span>
    </div>
  );
}

// ── GuidePanel: 텍스트 위 / 썸네일 아래 (md 이상에서 좌우), 접기 가능 ────────
function GuidePanel({
  youtubeUrl,
  youtubeUrl2,
}: {
  youtubeUrl: string | null;
  youtubeUrl2: string | null;
}) {
  const [open, setOpen] = useState(true);
  const [requiredItems, setRequiredItems] = useState<Array<{ name: string; icon_emoji: string }>>([]);

  useEffect(() => {
    fetch("/api/growth/themes")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const items: Array<{ name: string; icon_emoji: string }> = [];
        for (const cat of data as GrowthThemeCategoryWithItems[]) {
          for (const item of cat.items) {
            if (item.is_required) {
              items.push({ name: item.name, icon_emoji: cat.icon_emoji });
            }
          }
        }
        setRequiredItems(items);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-hana-surface border border-hana-border rounded-2xl max-w-3xl mx-auto w-full overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-hana-surface-alt/50 transition-colors"
        aria-expanded={open}
      >
        <Info size={15} className="text-hana-primary shrink-0" />
        <p className="flex-1 text-xs font-bold text-hana-dark">만다라트 작성 가이드</p>
        <ChevronDown
          size={16}
          className={`text-hana-primary shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0">
          <div className="flex flex-col md:flex-row gap-4 md:items-start">
            {/* 텍스트 가이드 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="px-2 py-1 bg-hana-primary text-white rounded-lg font-semibold">① 핵심목표</span>
                <ChevronRight size={10} className="text-hana-primary/60 shrink-0" />
                <span className="px-2 py-1 bg-hana-surface-alt text-hana-dark rounded-lg font-semibold border border-hana-border">② 세부목표 ×8</span>
                <ChevronRight size={10} className="text-hana-primary/60 shrink-0" />
                <span className="px-2 py-1 bg-white text-hana-dark rounded-lg font-semibold border border-hana-border">③ 세부실천항목 ×64</span>
              </div>
              <ul className="mt-2.5 space-y-1 text-xs text-hana-dark/70 leading-relaxed">
                <li>• 가운데 <b>핵심목표 셀을 클릭</b>하면 핵심목표와 8개 세부목표를 한 번에 입력할 수 있어요</li>
                <li>• 외부 블록의 8칸에 <b>세부실천항목</b>을 적고, 클릭하면 세부실천 과제를 추가할 수 있어요</li>
              </ul>

              {requiredItems.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-hana-border">
                  <p className="text-[11px] font-bold text-red-600 mb-1.5">⭐ 필수 세부실천항목</p>
                  <div className="flex flex-wrap gap-1">
                    {requiredItems.map((item, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full font-semibold"
                      >
                        {item.icon_emoji} {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 유튜브 썸네일 2개 — 모바일: 텍스트 아래 전체 폭 */}
            <div className="w-full md:w-[240px] md:shrink-0 grid grid-cols-2 gap-2">
              <GuideThumb url={youtubeUrl} label="가이드 1" />
              <GuideThumb url={youtubeUrl2} label="가이드 2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

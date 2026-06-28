"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Download, Save, Globe, Lock, X, Plus, Check, Trash2, ChevronRight, Info, Pencil, ArrowUp, ArrowDown, ChevronDown, ListChecks } from "lucide-react";
import type { GrowthMandalartCell, GrowthMandalartCellTodo, GrowthMandalart, GrowthThemeCategoryWithItems } from "@/lib/growth-types";

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

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

type CellKey = `${number}-${number}`;
type TodoItem = { id: string; text: string; done: boolean; order_idx: number };
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
      todos: todos.map((t, idx) => ({ text: t.text, done: t.done, order_idx: idx })),
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
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/growth/guide-settings")
      .then((r) => r.json())
      .then((d) => { if (d?.youtube_url) setGuideYoutubeUrl(d.youtube_url); })
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
      {/* Guide — 항상 표시 */}
      <GuidePanel youtubeUrl={guideYoutubeUrl} />

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
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <Download size={12} /> 이미지 저장
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-hana-primary text-white rounded-xl text-xs font-semibold hover:bg-hana-dark disabled:opacity-50 transition-colors ml-auto">
          <Save size={12} /> {saving ? "저장 중..." : "저장"}
        </button>
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
      <div ref={gridRef} className="w-full">
        <div className="grid grid-cols-3 gap-2 p-3 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border border-gray-200 shadow-md w-full max-w-3xl mx-auto">
          {Array.from({ length: 9 }, (_, bi) => {
            const outerCells = Array.from({ length: 9 }, (__, ci) => getCell(bi, ci)).filter((_, ci) => ci !== 4);
            const filledCount = outerCells.filter(c => c.text?.trim()).length;
            const doneCount = outerCells.filter(c => c.done).length;
            const blockAllDone = filledCount > 0 && doneCount === filledCount;
            return (
              <div key={bi} className={`rounded-xl border-2 flex flex-col gap-0.5 p-1.5 shadow-sm transition-all ${
                blockAllDone && bi !== 4
                  ? "bg-gradient-to-br from-green-100 to-emerald-50 border-green-300 shadow-green-100"
                  : `${BLOCK_BG[bi]} ${BLOCK_BORDER[bi]}`
              }`}>
                {bi !== 4 && (
                  <div className="flex items-center justify-end px-0.5 mb-0.5 gap-1">
                    {blockAllDone ? (
                      <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        ✓ 완료
                      </span>
                    ) : (
                      <>
                        <div className="flex-1 h-1 bg-white/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-current opacity-40 transition-all duration-500"
                            style={{ width: filledCount > 0 ? `${Math.round((doneCount / filledCount) * 100)}%` : "0%" }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 tabular-nums font-medium">{doneCount}/{filledCount > 0 ? filledCount : "0"}</span>
                      </>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-0.5">
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

                    return (
                      <EditorCell
                        key={ci}
                        text={displayText}
                        emoji={cell.emoji}
                        done={cell.done}
                        hasTodos={hasTodos}
                        doneTodos={doneTodos}
                        todoTotal={todos.length}
                        isCenter={isCenter}
                        isCoreCell={isCoreCell}
                        isMirrorCell={isMirrorCell}
                        centerColorClass={CENTER_CELL_COLOR[bi]}
                        placeholder={
                          isCoreCell ? "핵심목표 클릭하여 설정"
                          : isMirrorCell ? (getCell(4, bi < 4 ? bi : bi).text || `서브목표 ${bi < 4 ? bi + 1 : bi}`)
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
              const cellIdx = DEFAULT_SUBGOAL_ORDER[i];
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
  text, emoji, done, hasTodos, doneTodos, todoTotal,
  isCenter, isCoreCell, isMirrorCell, centerColorClass, placeholder, onClick,
}: {
  text: string; emoji?: string; done: boolean;
  hasTodos: boolean; doneTodos: number; todoTotal: number;
  isCenter: boolean; isCoreCell: boolean; isMirrorCell: boolean;
  centerColorClass: string; placeholder: string; onClick: () => void;
}) {
  const clickable = !isMirrorCell;
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={[
        "relative aspect-square flex flex-col items-center justify-center text-center text-xs leading-tight p-1 rounded-lg transition-all select-none group",
        isCenter
          ? `font-bold ${centerColorClass} rounded-xl`
          : done
          ? "bg-gradient-to-br from-green-100 to-emerald-50 text-green-800 border border-green-200 shadow-[0_0_8px_rgba(34,197,94,0.2)]"
          : text
          ? "bg-white text-gray-700 border border-gray-100 shadow-sm"
          : isMirrorCell
          ? "bg-white/40 text-gray-300"
          : "bg-white/50 border border-dashed border-gray-200 text-gray-300 hover:border-hana-primary/40 hover:bg-hana-surface/50",
        clickable ? "cursor-pointer hover:scale-[1.04] hover:shadow-md active:scale-[0.97]" : "",
      ].filter(Boolean).join(" ")}
    >
      {emoji && <span className="text-[11px] mb-0.5">{emoji}</span>}
      {text ? (
        <span className="break-words line-clamp-3 font-medium">{text}</span>
      ) : isCenter ? null : isMirrorCell ? (
        <span className="text-[10px] opacity-50 leading-tight">{placeholder}</span>
      ) : (
        <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity leading-tight flex flex-col items-center gap-0.5">
          <Pencil size={9} />
          <span>입력</span>
        </span>
      )}
      {hasTodos && !isCoreCell && !isMirrorCell && (
        <span className={`absolute top-0.5 right-0.5 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none ${
          done
            ? "bg-green-500 text-white shadow-sm"
            : doneTodos > 0
            ? "bg-hana-primary text-white"
            : "bg-gray-200 text-gray-500"
        }`}>
          {done ? "✓" : `${doneTodos}/${todoTotal}`}
        </span>
      )}
      {isCoreCell && (
        <span className="absolute bottom-0.5 right-0.5 opacity-30 group-hover:opacity-60 transition-opacity">
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
  const [subgoals, setSubgoals] = useState<string[]>(() =>
    DEFAULT_SUBGOAL_ORDER.map((idx) => getSubgoalText(idx))
  );
  const [order, setOrder] = useState<number[]>(subgoalOrder);
  const filledCount = subgoals.filter(s => s.trim()).length;

  function moveUp(i: number) {
    if (i === 0) return;
    const newOrder = [...order];
    [newOrder[i - 1], newOrder[i]] = [newOrder[i], newOrder[i - 1]];
    const newSubgoals = [...subgoals];
    [newSubgoals[i - 1], newSubgoals[i]] = [newSubgoals[i], newSubgoals[i - 1]];
    setOrder(newOrder);
    setSubgoals(newSubgoals);
  }
  function moveDown(i: number) {
    if (i === subgoals.length - 1) return;
    const newOrder = [...order];
    [newOrder[i], newOrder[i + 1]] = [newOrder[i + 1], newOrder[i]];
    const newSubgoals = [...subgoals];
    [newSubgoals[i], newSubgoals[i + 1]] = [newSubgoals[i + 1], newSubgoals[i]];
    setOrder(newOrder);
    setSubgoals(newSubgoals);
  }

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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700">세부목표 <span className="font-normal text-gray-400">(우선순위순)</span></label>
              {filledCount > 0 && <span className="text-xs text-hana-primary font-medium">{filledCount}/8 입력됨</span>}
            </div>
            <p className="text-xs text-gray-400 mb-3">↑↓ 버튼으로 우선순위를 변경하세요. 라운지 카드에 순서대로 표시됩니다.</p>
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
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveUp(i)} disabled={i === 0} className="p-0.5 text-gray-400 hover:text-hana-primary disabled:opacity-20 transition-colors">
                      <ArrowUp size={12} />
                    </button>
                    <button onClick={() => moveDown(i)} disabled={i === 7} className="p-0.5 text-gray-400 hover:text-hana-primary disabled:opacity-20 transition-colors">
                      <ArrowDown size={12} />
                    </button>
                  </div>
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

// ── CellDrawer: 세부 항목 선택 → 실천과제 추가 ──────────────────────────────
function CellDrawer({
  blockIdx, cellIdx, cell, todos, accentClass, onCellChange, onTodosChange, onClose,
}: {
  blockIdx: number; cellIdx: number;
  cell: GrowthMandalartCell; todos: TodoItem[];
  accentClass: string;
  onCellChange: (u: Partial<GrowthMandalartCell>) => void;
  onTodosChange: (t: TodoItem[]) => void;
  onClose: () => void;
}) {
  const [newTodoText, setNewTodoText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [themes, setThemes] = useState<GrowthThemeCategoryWithItems[]>([]);

  const NEGATIVE_PATTERNS = /안\s|못\s|하지\s*않|하지\s*말|금지|안됨|못함/;
  const allDone = todos.length > 0 && todos.every((t) => t.done);
  const donePct = todos.length > 0 ? Math.round((todos.filter(t => t.done).length / todos.length) * 100) : 0;
  const showNegativeWarning = NEGATIVE_PATTERNS.test(newTodoText) || !!(editingId && NEGATIVE_PATTERNS.test(editingText));

  useEffect(() => {
    fetch("/api/growth/themes")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d) && d.length > 0) setThemes(d); })
      .catch(() => {});
  }, []);

  // 현재 cell.text와 일치하는 테마 카테고리
  const matchedTheme = themes.find((cat) => cat.name === cell.text);

  function addTodo() {
    if (!newTodoText.trim()) return;
    onTodosChange([...todos, { id: `tmp-${Date.now()}`, text: newTodoText.trim(), done: false, order_idx: todos.length }]);
    setNewTodoText("");
  }

  function toggleThemeItemAsTodo(itemName: string) {
    const exists = todos.some((t) => t.text === itemName);
    if (exists) {
      onTodosChange(todos.filter((t) => t.text !== itemName));
    } else {
      onTodosChange([...todos, { id: `tmp-${Date.now()}`, text: itemName, done: false, order_idx: todos.length }]);
    }
  }

  // todo 완료 토글
  function handleToggleTodo(todo: TodoItem) {
    const newDone = !todo.done;
    onTodosChange(todos.map((x) => x.id === todo.id ? { ...x, done: newDone } : x));
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
                onChange={(e) => onCellChange({ text: e.target.value })}
                className="w-full px-3 py-2.5 pr-8 text-sm border border-gray-200 rounded-xl focus:border-hana-primary focus:outline-none bg-white appearance-none cursor-pointer"
              >
                <option value="">✏️ 직접 입력</option>
                {themes.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.icon_emoji} {cat.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">② 세부실천 과제 추가</p>

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

            {/* 기존 할일 목록 */}
            {todos.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-3">
                {todos.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 group">
                    <button onClick={() => handleToggleTodo(t)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        t.done ? "border-green-500 bg-green-500 text-white" : "border-gray-300 hover:border-hana-primary"
                      }`}>
                      {t.done && <Check size={10} />}
                    </button>
                    {editingId === t.id ? (
                      <input autoFocus value={editingText} onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { onTodosChange(todos.map(x => x.id === t.id ? { ...x, text: editingText.trim() } : x)); setEditingId(null); }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => { onTodosChange(todos.map(x => x.id === t.id ? { ...x, text: editingText.trim() } : x)); setEditingId(null); }}
                        className="flex-1 text-sm px-2 py-0.5 border border-hana-border rounded-lg focus:outline-none focus:border-hana-primary"
                      />
                    ) : (
                      <span className={`flex-1 text-sm ${t.done ? "line-through text-gray-400" : "text-gray-700"}`}
                        onDoubleClick={() => !t.done && (setEditingId(t.id), setEditingText(t.text))}>
                        {t.text}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      {!t.done && editingId !== t.id && (
                        <button onClick={() => (setEditingId(t.id), setEditingText(t.text))} className="p-0.5 text-gray-400 hover:text-hana-primary transition-colors">
                          <Pencil size={11} />
                        </button>
                      )}
                      <button onClick={() => onTodosChange(todos.filter(x => x.id !== t.id))} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 담당자 등록 항목 빠른 추가 — 선택한 카테고리가 있을 때 */}
            {matchedTheme && matchedTheme.items.length > 0 && (
              <div className="mb-3 rounded-xl border border-hana-border overflow-hidden">
                <div className="px-3 py-2 bg-hana-surface">
                  <p className="text-xs font-semibold text-hana-primary">
                    {matchedTheme.icon_emoji} {matchedTheme.name} 항목 추가
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">클릭하면 실천과제로 추가됩니다</p>
                </div>
                <div className="p-2 flex flex-col gap-1">
                  {matchedTheme.items.map((item) => {
                    const inTodos = todos.some((t) => t.text === item.name);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleThemeItemAsTodo(item.name)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors border ${
                          inTodos
                            ? "bg-hana-surface border-hana-border text-hana-primary font-medium"
                            : "bg-white border-gray-100 text-gray-700 hover:border-hana-border hover:bg-hana-surface/40"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          inTodos ? "border-hana-primary bg-hana-primary text-white" : "border-gray-300"
                        }`}>
                          {inTodos && <Check size={9} />}
                        </span>
                        <span className="flex-1">{item.name}</span>
                        {item.is_required && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">필수</span>
                        )}
                        {item.description && !item.is_required && (
                          <span className="text-[10px] text-gray-400 shrink-0">{item.description}</span>
                        )}
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
              <button onClick={addTodo} disabled={!newTodoText.trim()}
                className="px-3 py-2 bg-hana-primary text-white rounded-xl text-sm disabled:opacity-40 hover:bg-hana-dark transition-colors">
                <Plus size={14} />
              </button>
            </div>
            {showNegativeWarning && (
              <p className="text-xs text-amber-600 mt-1">⚠ 부정문보다 긍정문 행위동사로 작성하면 더 효과적이에요</p>
            )}
            {todos.length > 0 && <p className="text-xs text-gray-400 mt-1.5">항목을 더블클릭하면 수정할 수 있어요.</p>}
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

// ── GuidePanel: 항상 표시, 닫기 없음 ────────────────────────────────────────
function GuidePanel({ youtubeUrl }: { youtubeUrl: string | null }) {
  const videoId = youtubeUrl ? extractYoutubeId(youtubeUrl) : null;
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
    <div className="bg-hana-surface border border-hana-border rounded-2xl p-4 max-w-3xl mx-auto w-full">
      <div className="flex gap-4">
        {/* 좌측: 텍스트 가이드 */}
        <div className="flex-1 min-w-0 flex items-start gap-2.5">
          <Info size={15} className="text-hana-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-hana-dark mb-2">만다라트 작성 가이드</p>
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="px-2 py-1 bg-hana-primary text-white rounded-lg font-semibold">① 핵심목표</span>
              <ChevronRight size={10} className="text-hana-primary/60" />
              <span className="px-2 py-1 bg-hana-surface-alt text-hana-dark rounded-lg font-semibold border border-hana-border">② 세부목표 ×8</span>
              <ChevronRight size={10} className="text-hana-primary/60" />
              <span className="px-2 py-1 bg-white text-hana-dark rounded-lg font-semibold border border-hana-border">③ 세부실천항목 ×64</span>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-hana-dark/70">
              <li>• 가운데 <b>핵심목표 셀을 클릭</b>하면 핵심목표와 8개 세부목표를 한 번에 입력할 수 있어요</li>
              <li>• 외부 블록의 8칸에 <b>세부실천항목</b>을 적고, 클릭하면 세부실천 과제를 추가할 수 있어요</li>
            </ul>

            {/* 필수 세부실천항목 */}
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
        </div>

        {/* 우측: 유튜브 썸네일 */}
        {videoId ? (
          <a
            href={youtubeUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 group relative w-36 sm:w-44 rounded-xl overflow-hidden border border-hana-border hover:border-hana-primary/50 hover:shadow-md transition-all"
          >
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt="가이드 영상"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 group-hover:bg-black/25 transition-colors gap-1.5">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <span className="text-red-600 text-base ml-0.5">▶</span>
              </div>
              <span className="text-white text-[10px] font-semibold drop-shadow">가이드 영상 보기</span>
            </div>
          </a>
        ) : (
          <div className="shrink-0 w-36 sm:w-44 rounded-xl border-2 border-dashed border-hana-border bg-white/50 flex flex-col items-center justify-center gap-1 py-4">
            <span className="text-xl">🎬</span>
            <span className="text-[10px] text-gray-400 text-center leading-tight">관리자가 영상을<br/>등록할 수 있어요</span>
          </div>
        )}
      </div>
    </div>
  );
}

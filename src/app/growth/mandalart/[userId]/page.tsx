"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, X, Check, Send, Trash2, MessageCircle, CheckCircle2, Pencil } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import MandalartEditor from "@/components/growth/mandalart-editor";

const BLOCK_BG = [
  "bg-blue-100/70", "bg-emerald-100/70", "bg-violet-100/70",
  "bg-orange-100/70", "bg-hana-surface", "bg-rose-100/70",
  "bg-amber-100/70", "bg-teal-100/70", "bg-indigo-100/70",
];
const BLOCK_BORDER = [
  "border-blue-200", "border-emerald-200", "border-violet-200",
  "border-orange-200", "border-hana-border", "border-rose-200",
  "border-amber-200", "border-teal-200", "border-indigo-200",
];
const CENTER_CELL_COLOR = [
  "bg-blue-400 text-white shadow-sm", "bg-emerald-400 text-white shadow-sm", "bg-violet-400 text-white shadow-sm",
  "bg-orange-400 text-white shadow-sm", "bg-hana-primary text-white shadow-sm", "bg-rose-400 text-white shadow-sm",
  "bg-amber-400 text-white shadow-sm", "bg-teal-400 text-white shadow-sm", "bg-indigo-400 text-white shadow-sm",
];
import type {
  GrowthMandalart,
  GrowthMandalartCell,
  GrowthMandalartCellTodo,
  GrowthThemeCategoryWithItems,
  CycleType,
} from "@/lib/growth-types";

type MandalartComment = {
  id: string;
  mandalart_id: string;
  user_id: string;
  display_name: string;
  content: string;
  created_at: string;
};

export default function MandalartUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user } = useAuth();
  const [mandalart, setMandalart] = useState<GrowthMandalart | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const isOwner = user?.id === userId;

  useEffect(() => {
    fetch(`/api/growth/mandalarts/${userId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { setMandalart(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const refreshMandalart = () => {
    fetch(`/api/growth/mandalarts/${userId}`)
      .then((r) => r.json())
      .then(setMandalart)
      .catch(() => {});
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-hana-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const hasMandalart = !!mandalart;

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/growth/lounge" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={15} /> 갤러리로
        </Link>
        <div className="flex-1">
          <h2 className="text-base font-bold text-gray-900">
            {isOwner ? "내 만다라트" : `${mandalart?.display_name ?? ""}의 만다라트`}
          </h2>
          {!isOwner && mandalart?.visibility === "private" && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Lock size={10} /> 비공개 만다라트</p>
          )}
        </div>
      </div>

      {/* Mandalart content */}
      {isOwner ? (
        <MandalartEditor
          initial={mandalart}
          userId={userId}
          onSaved={refreshMandalart}
        />
      ) : hasMandalart ? (
        <MandalartReadOnly mandalart={mandalart!} />
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">아직 만다라트가 없습니다.</p>
        </div>
      )}

      {/* Today's Todos — owner only */}
      {isOwner && hasMandalart && (
        <TodayTodos mandalart={mandalart!} userId={userId} />
      )}

      {/* Comments — always visible if mandalart exists */}
      {hasMandalart && (
        <MandalartComments
          userId={userId}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}

/* ── Comments ──────────────────────────────────────────────────────────────── */

function MandalartComments({
  userId,
  currentUserId,
}: {
  userId: string;
  currentUserId?: string;
}) {
  const [comments, setComments] = useState<MandalartComment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/growth/mandalarts/${userId}/comments`);
    if (res.ok) setComments(await res.json());
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    const res = await fetch(`/api/growth/mandalarts/${userId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    if (res.ok) {
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setText("");
    }
    setSubmitting(false);
  }

  async function handleDelete(commentId: string) {
    await fetch(`/api/growth/mandalarts/${userId}/comments?comment_id=${commentId}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function handleEditSave(commentId: string) {
    if (!editingText.trim()) return;
    const res = await fetch(`/api/growth/mandalarts/${userId}/comments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment_id: commentId, content: editingText.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, content: updated.content } : c));
    }
    setEditingId(null);
    setEditingText("");
  }

  function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  }

  return (
    <div className="border-t border-gray-100 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={16} className="text-hana-primary/60" />
        <h3 className="text-sm font-semibold text-gray-800">댓글</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{comments.length}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-4">
          {comments.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">첫 번째 댓글을 남겨보세요!</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <div className="w-7 h-7 rounded-full bg-hana-surface flex items-center justify-center text-xs font-bold text-hana-primary shrink-0 mt-0.5">
                {c.display_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-800">{c.display_name}</span>
                  <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                </div>
                {editingId === c.id ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave(c.id);
                        if (e.key === "Escape") { setEditingId(null); setEditingText(""); }
                      }}
                      className="flex-1 px-2.5 py-1.5 text-sm border border-hana-primary/40 rounded-lg focus:border-hana-primary focus:outline-none"
                    />
                    <button onClick={() => handleEditSave(c.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <Check size={13} />
                    </button>
                    <button onClick={() => { setEditingId(null); setEditingText(""); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed break-words">{c.content}</p>
                )}
              </div>
              {c.user_id === currentUserId && editingId !== c.id && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => { setEditingId(c.id); setEditingText(c.content); }}
                    className="p-1 text-gray-300 hover:text-hana-primary"
                    title="수정"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1 text-gray-300 hover:text-red-400"
                    title="삭제"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="응원이나 인사이트를 남겨보세요..."
          className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-hana-primary focus:outline-none focus:ring-1 focus:ring-hana-primary/30"
        />
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="px-3 py-2.5 bg-hana-primary text-white rounded-xl text-sm disabled:opacity-40 hover:bg-hana-dark transition-colors shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

/* ── Read-only view ─────────────────────────────────────────────────────────── */

type CellModalState = {
  cell: GrowthMandalartCell;
  todos: GrowthMandalartCellTodo[];
  themeDescription?: string | null;
} | null;

const DEFAULT_SUBGOAL_ORDER = [0, 1, 2, 3, 5, 6, 7, 8];

function priorityRankStyle(rank: number): string {
  if (rank <= 3) return "bg-[#009591] text-white";
  if (rank <= 5) return "bg-[#009591]/80 text-white";
  return "bg-gray-200 text-gray-600";
}

function MandalartReadOnly({ mandalart }: { mandalart: GrowthMandalart }) {
  const [modal, setModal] = useState<CellModalState>(null);
  const [themes, setThemes] = useState<GrowthThemeCategoryWithItems[]>([]);
  const cells = mandalart.cells ?? [];
  const order = mandalart.subgoal_order?.length === 8 ? mandalart.subgoal_order : DEFAULT_SUBGOAL_ORDER;
  const priorityMap: Record<number, number> = {};
  order.slice(0, 8).forEach((cellIdx, i) => { priorityMap[cellIdx] = i + 1; });

  useEffect(() => {
    fetch("/api/growth/themes")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setThemes(d); })
      .catch(() => {});
  }, []);

  const getCell = (bi: number, ci: number) => {
    if (bi !== 4 && ci === 4) return cells.find((c) => c.block_idx === 4 && c.cell_idx === bi);
    return cells.find((c) => c.block_idx === bi && c.cell_idx === ci);
  };

  /** 테마 셀: 현재 담당자 카탈로그에 있는 항목만 세부내역에 표시 (화면에서 뺀 자격증 제외) */
  function todosForDetail(cell: GrowthMandalartCell): GrowthMandalartCellTodo[] {
    const todos = cell.todos ?? [];
    const matched = themes.find((c) => c.name === cell.text);
    if (!matched) return todos;
    // 학점 테마는 카탈로그 항목이 없을 수 있어 기존 todo 유지
    if (matched.name.includes("학점")) return todos;
    const catalog = new Set(matched.items.map((i) => i.name));
    return todos.filter((t) => catalog.has(t.text));
  }

  function creditBadge(cellText: string, cellTodos?: GrowthMandalartCellTodo[]): string | null {
    const theme = themes.find((c) => c.name === cellText);
    if (!theme?.name.includes("학점")) return null;

    for (const todo of cellTodos ?? []) {
      const t = todo.text?.trim() ?? "";
      const withUnit = t.match(/(\d+)\s*학점/);
      if (withUnit) return `${withUnit[1]}학점`;
      if (/^\d+$/.test(t)) return `${t}학점`;
      const anyNum = t.match(/(\d+)/);
      if (anyNum) return `${anyNum[1]}학점`;
    }

    return null;
  }

  function handleCellClick(bi: number, ci: number) {
    const cell = getCell(bi, ci);
    if (!cell || !cell.text) return;
    if ((bi !== 4 && ci === 4) || (bi === 4 && ci === 4)) return;
    const theme = themes.find((c) => c.name === cell.text);
    setModal({
      cell,
      todos: todosForDetail(cell),
      themeDescription: theme?.description?.trim() || null,
    });
  }

  return (
    <>
      <div className="w-full min-w-0">
        <div className="grid grid-cols-3 gap-1 p-1.5 sm:gap-2 sm:p-3 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border border-gray-200 shadow-md w-full max-w-3xl mx-auto min-w-0">
          {Array.from({ length: 9 }).map((_, bi) => {
            const outerCells = bi !== 4
              ? Array.from({ length: 9 }, (_, ci) => ci !== 4 ? getCell(bi, ci) : null).filter(Boolean)
              : [];
            const filledCount = outerCells.filter(c => c?.text?.trim()).length;
            const doneCount = outerCells.filter(c => c?.done).length;
            const blockAllDone = filledCount > 0 && doneCount === filledCount;

            return (
              <div key={bi} className={`rounded-xl border-2 flex flex-col gap-0.5 p-0.5 sm:p-1.5 shadow-sm transition-all min-w-0 overflow-hidden ${
                blockAllDone && bi !== 4
                  ? "bg-gradient-to-br from-green-100 to-emerald-50 border-green-300 shadow-green-100"
                  : `${BLOCK_BG[bi]} ${BLOCK_BORDER[bi]}`
              }`}>
                {/* Block progress */}
                {bi !== 4 ? (
                  <div className="flex items-center px-0.5 mb-0.5 gap-0.5 sm:gap-1 min-w-0 h-3.5 sm:h-4">
                    {priorityMap[bi] != null && (
                      <span className={`shrink-0 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold ${priorityRankStyle(priorityMap[bi])}`}>
                        {priorityMap[bi]}
                      </span>
                    )}
                    {blockAllDone ? (
                      <span className="ml-auto text-[8px] sm:text-[10px] font-bold text-green-600 bg-green-100 px-1 sm:px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                        <Check size={8} strokeWidth={3} /> 완료
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
                  {Array.from({ length: 9 }).map((_, ci) => {
                    const cell = getCell(bi, ci);
                    const isCenter = ci === 4;
                    const isCoreCell = bi === 4 && ci === 4;
                    const isMirrorCell = bi !== 4 && ci === 4;
                    const clickable = !isMirrorCell && !isCoreCell && !!cell?.text;
                    const cellTodos = cell ? todosForDetail(cell) : [];
                    const hasTodos = cellTodos.length > 0;
                    const doneTodos = cellTodos.filter(t => t.done).length;
                    const todoTotal = cellTodos.length;
                    const displayText = isCoreCell ? (mandalart.center_goal || cell?.text || "") : (cell?.text ?? "");
                    const isDone = cell?.done ?? false;
                    const credit = cell?.text ? creditBadge(cell.text, cellTodos) : null;
                    const showBadge = !isCoreCell && !isMirrorCell && (hasTodos || !!credit);
                    const badgeText = credit
                      ? (isDone ? `✓ ${credit}` : credit)
                      : (isDone ? "✓" : `${doneTodos}/${todoTotal}`);
                    // 중앙 블록 세부목표 셀에만 셀 단위 중요도 표시 (외곽은 블록 헤더에만)
                    const cellPriority = bi === 4 && !isCoreCell ? priorityMap[ci] : undefined;
                    return (
                      <div
                        key={ci}
                        onClick={() => handleCellClick(bi, ci)}
                        className={[
                          "relative aspect-square w-full min-w-0 overflow-hidden flex flex-col items-center justify-center text-center text-[8px] sm:text-[10px] md:text-xs leading-tight p-0.5 sm:p-1 rounded-md sm:rounded-lg transition-all",
                          isCenter
                            ? `font-bold ${CENTER_CELL_COLOR[bi]} rounded-lg sm:rounded-xl`
                            : isDone
                            ? "bg-gradient-to-br from-green-100 to-emerald-50 text-green-800 border border-green-200 shadow-[0_0_8px_rgba(34,197,94,0.2)]"
                            : cell?.text
                            ? "bg-white text-gray-700 border border-gray-100 shadow-sm"
                            : "bg-white/40 text-gray-300",
                          clickable ? "cursor-pointer sm:hover:scale-[1.03] hover:shadow-md active:scale-[0.98]" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        {cellPriority != null && !isCoreCell && (
                          <span className={`absolute top-0 left-0 sm:top-0.5 sm:left-0.5 z-[1] w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] font-bold leading-none ${priorityRankStyle(cellPriority)}`}>
                            {cellPriority}
                          </span>
                        )}
                        {cell?.emoji && <span className="text-[9px] sm:text-[11px] mb-0.5 shrink-0">{cell.emoji}</span>}
                        <span className={`break-words line-clamp-2 sm:line-clamp-3 px-0.5 w-full min-w-0 overflow-hidden ${!cell?.text ? "text-[7px] sm:text-[10px] opacity-40" : "font-medium"}`}>
                          {displayText || "—"}
                        </span>
                        {showBadge && (
                          <span className={`absolute top-0 right-0 sm:top-0.5 sm:right-0.5 text-[6px] sm:text-[9px] font-bold px-0.5 sm:px-1 py-px sm:py-0.5 rounded-full leading-none max-w-[70%] truncate ${
                            isDone
                              ? "bg-green-500 text-white shadow-sm"
                              : credit || doneTodos > 0
                              ? "bg-hana-primary text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}>
                            {badgeText}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">셀을 클릭하면 세부실천 과제를 확인할 수 있어요</p>
      </div>

      {modal && (
        <CellDetailModal
          cell={modal.cell}
          todos={modal.todos}
          themeDescription={modal.themeDescription}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

const CYCLE_LABELS_RO: Record<CycleType, string> = {
  none: "1회", daily: "매일", weekly: "매주", monthly: "매월", quarterly: "분기", yearly: "매년", weekday: "요일지정",
};
const WEEKDAY_NAMES_RO = ["일", "월", "화", "수", "목", "금", "토"];

function formatCycleBadgeRO(t: GrowthMandalartCellTodo): string | null {
  const ct = (t as GrowthMandalartCellTodo & { cycle_type?: CycleType; cycle_weekdays?: number[] | null; cycle_count?: number }).cycle_type;
  const cw = (t as GrowthMandalartCellTodo & { cycle_weekdays?: number[] | null }).cycle_weekdays;
  const cc = (t as GrowthMandalartCellTodo & { cycle_count?: number }).cycle_count ?? 1;
  if (!ct || ct === "none") return null;
  if (ct === "weekday") {
    const days = (cw ?? []).sort((a, b) => a - b).map((d) => WEEKDAY_NAMES_RO[d]).join("·");
    const label = days || "요일미설정";
    return cc > 1 ? `${label} ${cc}회` : label;
  }
  return cc > 1 ? `${CYCLE_LABELS_RO[ct]} ${cc}회` : CYCLE_LABELS_RO[ct];
}

function CellDetailModal({
  cell,
  todos,
  themeDescription,
  onClose,
}: {
  cell: GrowthMandalartCell;
  todos: GrowthMandalartCellTodo[];
  themeDescription?: string | null;
  onClose: () => void;
}) {
  const donePct = todos.length > 0 ? Math.round((todos.filter(t => t.done).length / todos.length) * 100) : 0;
  const allDone = todos.length > 0 && todos.every(t => t.done);

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-hana-surface border-b border-hana-border flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-hana-primary font-medium mb-0.5">세부실천 과제</p>
            <p className="text-sm font-bold text-hana-deep">{cell.text}</p>
            {themeDescription && (
              <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-wrap">{themeDescription}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-hana-border transition-colors shrink-0 mt-0.5">
            <X size={16} className="text-hana-primary" />
          </button>
        </div>

        <div className="px-5 py-4">
          {todos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">아직 세부실천 과제가 없어요.</p>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700">세부실천 과제</span>
                  <span className={`text-xs font-bold ${allDone ? "text-green-600" : "text-gray-500"}`}>
                    {todos.filter(t => t.done).length}/{todos.length} 완료
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${allDone ? "bg-green-100" : "bg-gray-100"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      allDone
                        ? "bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                        : "bg-gradient-to-r from-hana-primary to-hana-secondary"
                    }`}
                    style={{ width: `${donePct}%` }}
                  />
                </div>
              </div>
              {allDone && (
                <div className="mb-3 relative overflow-hidden rounded-xl border border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm">
                  <div className="px-4 py-3 flex items-center gap-3">
                    <span className="text-2xl select-none animate-bounce">🎉</span>
                    <div>
                      <p className="text-sm font-bold text-green-700">목표 달성!</p>
                      <p className="text-xs text-green-600 mt-0.5">이 세부 목표를 완료했어요.</p>
                    </div>
                    <span className="ml-auto text-lg select-none">✨</span>
                  </div>
                  <div className="h-1 w-full bg-green-200 overflow-hidden">
                    <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-shimmer" />
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {todos.map((t) => {
                  const badge = formatCycleBadgeRO(t);
                  return (
                    <div key={t.id} className="flex items-start gap-2.5">
                      <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${t.done ? "bg-green-500" : "bg-gray-200"}`}>
                        {t.done && <Check size={9} className="text-white" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-sm ${t.done ? "line-through text-gray-400" : "text-gray-700"}`}>{t.text}</span>
                        {badge && (
                          <span className="mt-0.5 self-start text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 leading-none">
                            🔁 {badge}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-4">
          <button onClick={onClose} className="w-full py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 오늘의 할 일 ─────────────────────────────────────────────────────────── */

type TodTab = "daily" | "weekly" | "monthly" | "longterm";

const TOD_TAB_LABEL: Record<TodTab, string> = {
  daily: "매일", weekly: "주간", monthly: "월간", longterm: "장기",
};

const CYCLE_LABEL_SHORT: Record<CycleType, string> = {
  none: "장기", daily: "매일", weekly: "주간", monthly: "월간",
  quarterly: "분기", yearly: "연간", weekday: "요일",
};

const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getPeriodKey(ct: CycleType, d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (ct === "daily" || ct === "weekday") return `${y}-${m}-${day}`;
  if (ct === "weekly") return `${y}-W${String(getISOWeek(d)).padStart(2, "0")}`;
  if (ct === "monthly") return `${y}-${m}`;
  if (ct === "quarterly") return `${y}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
  if (ct === "yearly") return `${y}`;
  return "all";
}

function cycleToTab(ct: CycleType): TodTab {
  if (ct === "daily" || ct === "weekday") return "daily";
  if (ct === "weekly") return "weekly";
  if (ct === "monthly" || ct === "quarterly") return "monthly";
  return "longterm";
}

function TodayTodos({ mandalart, userId }: { mandalart: GrowthMandalart; userId: string }) {
  const [tab, setTab] = useState<TodTab>("daily");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const today = new Date();
  const todayDow = today.getDay();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`tod_${userId}`);
      if (raw) setChecks(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [userId]);

  function toggle(key: string) {
    setChecks((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(`tod_${userId}`, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function repKey(checkKey: string, i: number) {
    return `${checkKey}__${i}`;
  }
  function doneCountOf(item: { checkKey: string; cc: number }) {
    let n = 0;
    for (let i = 0; i < item.cc; i++) if (checks[repKey(item.checkKey, i)]) n++;
    return n;
  }
  function isFullyDone(item: { checkKey: string; cc: number }) {
    return doneCountOf(item) >= item.cc;
  }

  const cells = mandalart.cells ?? [];

  // subgoal name map: block_idx → name (from center block)
  const subgoalMap: Record<number, string> = {};
  cells.forEach((c) => {
    if (c.block_idx === 4 && c.cell_idx !== 4) subgoalMap[c.cell_idx] = c.text ?? "";
  });

  type TodItem = {
    id: string; text: string;
    ct: CycleType; cw: number[] | null; cc: number;
    subgoal: string; checkKey: string; tab: TodTab;
  };

  const allItems: TodItem[] = [];
  cells.forEach((c) => {
    if (c.block_idx === 4) return;
    const subgoal = subgoalMap[c.block_idx] ?? "";
    (c.todos ?? []).forEach((t) => {
      const todo = t as GrowthMandalartCellTodo & { cycle_type?: CycleType; cycle_weekdays?: number[] | null; cycle_count?: number };
      const ct: CycleType = todo.cycle_type ?? "none";
      const cw = todo.cycle_weekdays ?? null;
      const cc = todo.cycle_count ?? 1;

      // 주기를 설정하지 않은(단발성) 항목은 "오늘의 할 일"에 표시하지 않음
      if (ct === "none") return;

      // 요일지정: 오늘 요일이 선택 목록에 없으면 매일 탭에서 숨김
      if (ct === "weekday" && cw && !cw.includes(todayDow)) return;

      const pk = getPeriodKey(ct, today);
      const checkKey = `${t.id}_${pk}`;
      allItems.push({ id: t.id, text: t.text, ct, cw, cc, subgoal, checkKey, tab: cycleToTab(ct) });
    });
  });

  const byTab = {
    daily: allItems.filter((x) => x.tab === "daily"),
    weekly: allItems.filter((x) => x.tab === "weekly"),
    monthly: allItems.filter((x) => x.tab === "monthly"),
    longterm: allItems.filter((x) => x.tab === "longterm"),
  };

  // 선택된 탭에 항목이 없으면(예: 매일 탭이 비어있는 경우) 항목이 있는 첫 탭을 대신 보여준다.
  const tabOrder: TodTab[] = ["daily", "weekly", "monthly", "longterm"];
  const effectiveTab: TodTab = byTab[tab].length > 0 ? tab : (tabOrder.find((t) => byTab[t].length > 0) ?? tab);
  const current = byTab[effectiveTab];
  // 각 탭(매일/주간/월간/장기)은 서로 독립적으로 달성률을 계산한다.
  const doneCurrent = current.filter((x) => isFullyDone(x)).length;

  if (allItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-gray-900">할일 목록</h3>
        </div>
        <div className="px-5 pb-6">
          <p className="text-sm text-gray-400 text-center py-6">할 일이 없어요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">할일 목록</h3>
        <span className="text-sm font-semibold text-gray-500">{doneCurrent}/{current.length}</span>
      </div>

      {/* Progress bar */}
      <div className="px-5 mb-3">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-hana-primary to-hana-secondary rounded-full transition-all duration-500"
            style={{ width: current.length > 0 ? `${Math.round((doneCurrent / current.length) * 100)}%` : "0%" }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 flex gap-2 mb-3">
        {(["daily", "weekly", "monthly", "longterm"] as TodTab[]).map((t) => {
          const cnt = byTab[t].length;
          if (cnt === 0) return null;
          const done = byTab[t].filter((x) => isFullyDone(x)).length;
          const active = effectiveTab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              {TOD_TAB_LABEL[t]} {done}/{cnt}
            </button>
          );
        })}
      </div>

      {/* Todo list */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        {current.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">이 탭에 할 일이 없어요.</p>
        ) : (
          current.map((item) => {
            const doneCount = doneCountOf(item);
            const done = doneCount >= item.cc;
            const cycleBadge = (() => {
              if (item.ct === "none") return null;
              if (item.ct === "weekday" && item.cw) {
                const days = item.cw.sort((a, b) => a - b).map((d) => WEEKDAY_SHORT[d]).join("·");
                return item.cc > 1 ? `${days} ${item.cc}회` : days;
              }
              return item.cc > 1 ? `${CYCLE_LABEL_SHORT[item.ct]} ${item.cc}회` : CYCLE_LABEL_SHORT[item.ct];
            })();

            return (
              <div
                key={item.checkKey}
                className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl border transition-all ${
                  done ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-gray-200"
                }`}
              >
                {/* 체크박스 (횟수만큼 반복) */}
                <div className="flex items-center gap-1 shrink-0">
                  {Array.from({ length: item.cc }).map((_, i) => {
                    const repDone = !!checks[repKey(item.checkKey, i)];
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggle(repKey(item.checkKey, i))}
                        aria-label={item.cc > 1 ? `${i + 1}번째 완료 체크` : "완료 체크"}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          repDone
                            ? "bg-hana-primary border-hana-primary"
                            : "border-rose-400 bg-white hover:border-hana-primary/60"
                        }`}
                      >
                        {repDone && <Check size={13} className="text-white" />}
                      </button>
                    );
                  })}
                </div>

                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
                    {item.text}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {item.subgoal && (
                      <span className="text-[10px] text-gray-400">{item.subgoal}</span>
                    )}
                    {cycleBadge && (
                      <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full leading-none">
                        🔁 {cycleBadge}
                      </span>
                    )}
                    {item.cc > 1 && (
                      <span className="text-[10px] font-semibold text-gray-400">
                        {doneCount}/{item.cc}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

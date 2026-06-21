"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, X, Check, Send, Trash2, MessageCircle, CheckCircle2 } from "lucide-react";
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
import type { GrowthMandalart, GrowthMandalartCell, GrowthMandalartCellTodo } from "@/lib/growth-types";

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
        <Link href="/growth/mandalart" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
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
                <p className="text-sm text-gray-700 leading-relaxed break-words">{c.content}</p>
              </div>
              {c.user_id === currentUserId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-300 hover:text-red-400 shrink-0"
                >
                  <Trash2 size={12} />
                </button>
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
} | null;

function MandalartReadOnly({ mandalart }: { mandalart: GrowthMandalart }) {
  const [modal, setModal] = useState<CellModalState>(null);
  const cells = mandalart.cells ?? [];
  const getCell = (bi: number, ci: number) => {
    if (bi !== 4 && ci === 4) return cells.find((c) => c.block_idx === 4 && c.cell_idx === bi);
    return cells.find((c) => c.block_idx === bi && c.cell_idx === ci);
  };

  function handleCellClick(bi: number, ci: number) {
    const cell = getCell(bi, ci);
    if (!cell || !cell.text) return;
    if ((bi !== 4 && ci === 4) || (bi === 4 && ci === 4)) return;
    setModal({ cell, todos: cell.todos ?? [] });
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-3 gap-2 p-3 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border border-gray-200 shadow-md w-full max-w-3xl mx-auto">
          {Array.from({ length: 9 }).map((_, bi) => {
            const outerCells = bi !== 4
              ? Array.from({ length: 9 }, (_, ci) => ci !== 4 ? getCell(bi, ci) : null).filter(Boolean)
              : [];
            const filledCount = outerCells.filter(c => c?.text?.trim()).length;
            const doneCount = outerCells.filter(c => c?.done).length;
            const blockAllDone = filledCount > 0 && doneCount === filledCount;

            return (
              <div key={bi} className={`rounded-xl border-2 flex flex-col gap-0.5 p-1.5 shadow-sm transition-all ${
                blockAllDone && bi !== 4
                  ? "bg-gradient-to-br from-green-100 to-emerald-50 border-green-300 shadow-green-100"
                  : `${BLOCK_BG[bi]} ${BLOCK_BORDER[bi]}`
              }`}>
                {/* Block progress */}
                {bi !== 4 && (
                  <div className="flex items-center justify-end px-0.5 mb-0.5 gap-1">
                    {blockAllDone ? (
                      <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Check size={8} strokeWidth={3} /> 완료
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
                  {Array.from({ length: 9 }).map((_, ci) => {
                    const cell = getCell(bi, ci);
                    const isCenter = ci === 4;
                    const isCoreCell = bi === 4 && ci === 4;
                    const isMirrorCell = bi !== 4 && ci === 4;
                    const clickable = !isMirrorCell && !isCoreCell && !!cell?.text;
                    const hasTodos = (cell?.todos ?? []).length > 0;
                    const doneTodos = (cell?.todos ?? []).filter(t => t.done).length;
                    const todoTotal = (cell?.todos ?? []).length;
                    const displayText = isCoreCell ? (mandalart.center_goal || cell?.text || "") : (cell?.text ?? "");
                    const isDone = cell?.done ?? false;
                    return (
                      <div
                        key={ci}
                        onClick={() => handleCellClick(bi, ci)}
                        className={[
                          "relative aspect-square flex flex-col items-center justify-center text-center text-xs leading-tight p-1 rounded-lg transition-all",
                          isCenter
                            ? `font-bold ${CENTER_CELL_COLOR[bi]} rounded-xl`
                            : isDone
                            ? "bg-gradient-to-br from-green-100 to-emerald-50 text-green-800 border border-green-200 shadow-[0_0_8px_rgba(34,197,94,0.2)]"
                            : cell?.text
                            ? "bg-white text-gray-700 border border-gray-100 shadow-sm"
                            : "bg-white/40 text-gray-300",
                          clickable ? "cursor-pointer hover:scale-[1.03] hover:shadow-md active:scale-[0.98]" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        {cell?.emoji && <span className="text-[11px] mb-0.5">{cell.emoji}</span>}
                        <span className={`break-words line-clamp-3 ${!cell?.text ? "text-[10px] opacity-40" : "font-medium"}`}>
                          {displayText || "—"}
                        </span>
                        {hasTodos && !isCoreCell && !isMirrorCell && (
                          <span className={`absolute top-0.5 right-0.5 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none ${
                            isDone
                              ? "bg-green-500 text-white shadow-sm"
                              : doneTodos > 0
                              ? "bg-hana-primary text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}>
                            {isDone ? "✓" : `${doneTodos}/${todoTotal}`}
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
        <p className="text-center text-xs text-gray-400 mt-3">셀을 클릭하면 근거 체크리스트를 확인할 수 있어요</p>
      </div>

      {modal && (
        <CellDetailModal
          cell={modal.cell}
          todos={modal.todos}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function CellDetailModal({
  cell,
  todos,
  onClose,
}: {
  cell: GrowthMandalartCell;
  todos: GrowthMandalartCellTodo[];
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
            <p className="text-xs text-hana-primary font-medium mb-0.5">세부 목표</p>
            <p className="text-sm font-bold text-hana-deep">{cell.text}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-hana-border transition-colors shrink-0 mt-0.5">
            <X size={16} className="text-hana-primary" />
          </button>
        </div>

        <div className="px-5 py-4">
          {todos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">아직 근거 체크리스트가 없어요.</p>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700">근거 체크리스트</span>
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
                {todos.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${t.done ? "bg-green-500" : "bg-gray-200"}`}>
                      {t.done && <Check size={9} className="text-white" />}
                    </div>
                    <span className={`text-sm ${t.done ? "line-through text-gray-400" : "text-gray-700"}`}>{t.text}</span>
                  </div>
                ))}
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

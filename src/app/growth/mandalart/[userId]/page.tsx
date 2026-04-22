"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, X, Check, Send, Trash2, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import MandalartEditor from "@/components/growth/mandalart-editor";
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
    return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
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
        <MessageCircle size={16} className="text-indigo-400" />
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
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0 mt-0.5">
                {c.display_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-800">{c.display_name}</span>
                  <span className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</span>
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
          className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="px-3 py-2.5 bg-indigo-600 text-white rounded-xl text-sm disabled:opacity-40 hover:bg-indigo-700 transition-colors shrink-0"
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
  const getCell = (bi: number, ci: number) =>
    cells.find((c) => c.block_idx === bi && c.cell_idx === ci);

  const BLOCK_COLORS = [
    "bg-violet-50", "bg-sky-50", "bg-emerald-50", "bg-orange-50",
    "bg-white ring-2 ring-indigo-300",
    "bg-pink-50", "bg-teal-50", "bg-amber-50", "bg-rose-50",
  ];
  const CENTER_COLORS = [
    "bg-violet-200 text-violet-800", "bg-sky-200 text-sky-800",
    "bg-emerald-200 text-emerald-800", "bg-orange-200 text-orange-800",
    "bg-indigo-200 text-indigo-800",
    "bg-pink-200 text-pink-800", "bg-teal-200 text-teal-800",
    "bg-amber-200 text-amber-800", "bg-rose-200 text-rose-800",
  ];

  function handleCellClick(bi: number, ci: number) {
    const cell = getCell(bi, ci);
    if (!cell || !cell.text) return;
    const isMirrorCell = bi !== 4 && ci === 4;
    const isCoreCell = bi === 4 && ci === 4;
    if (isMirrorCell || isCoreCell) return;
    setModal({ cell, todos: cell.todos ?? [] });
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-3 gap-1 w-full max-w-3xl mx-auto">
          {Array.from({ length: 9 }).map((_, bi) => (
            <div key={bi} className={`grid grid-cols-3 gap-0.5 p-1.5 rounded-lg ${BLOCK_COLORS[bi]}`}>
              {Array.from({ length: 9 }).map((_, ci) => {
                const cell = getCell(bi, ci);
                const isCenter = ci === 4;
                const isCoreCell = bi === 4 && ci === 4;
                const isMirrorCell = bi !== 4 && ci === 4;
                const clickable = !isMirrorCell && !isCoreCell && !!cell?.text;
                const hasTodos = (cell?.todos ?? []).length > 0;
                const doneTodos = (cell?.todos ?? []).filter(t => t.done).length;
                return (
                  <div
                    key={ci}
                    onClick={() => handleCellClick(bi, ci)}
                    className={`relative aspect-square flex items-center justify-center text-center text-[9px] leading-tight p-0.5 rounded transition-all ${
                      isCenter ? `${CENTER_COLORS[bi]} font-semibold` : "bg-white/60 text-gray-700"
                    } ${clickable ? "cursor-pointer hover:brightness-95 hover:shadow-sm" : ""} ${
                      cell?.done ? "ring-1 ring-green-400" : ""
                    }`}
                  >
                    {cell?.emoji && <span className="mr-0.5">{cell.emoji}</span>}
                    {cell?.text ?? ""}
                    {hasTodos && !isCoreCell && !isMirrorCell && (
                      <span className={`absolute top-0 right-0 text-[7px] font-bold px-0.5 rounded-bl ${
                        cell?.done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                      }`}>
                        {cell?.done ? "✓" : `${doneTodos}/${(cell?.todos ?? []).length}`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-3">셀을 클릭하면 근거 체크리스트를 확인할 수 있어요</p>
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
        <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-indigo-500 font-medium mb-0.5">세부 목표</p>
            <p className="text-sm font-bold text-indigo-900">{cell.text}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-indigo-100 transition-colors shrink-0 mt-0.5">
            <X size={16} className="text-indigo-500" />
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
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${allDone ? "bg-green-500" : "bg-indigo-500"}`}
                    style={{ width: `${donePct}%` }}
                  />
                </div>
              </div>
              {allDone && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                  <Check size={14} className="text-green-600 shrink-0" />
                  <p className="text-xs text-green-700 font-medium">이 목표를 완료했어요!</p>
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

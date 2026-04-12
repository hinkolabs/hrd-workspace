"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Pin, Pencil, User } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Memo } from "@/lib/supabase";
import MemoCard from "./memo-card";
import MemoEditor from "./memo-editor";

const COLOR_BG: Record<string, string> = {
  default: "bg-white",
  yellow: "bg-yellow-50",
  green: "bg-green-50",
  blue: "bg-blue-50",
  purple: "bg-purple-50",
  red: "bg-red-50",
};

function MemoViewModal({
  memo,
  onClose,
  onEdit,
}: {
  memo: Memo;
  onClose: () => void;
  onEdit: (memo: Memo) => void;
}) {
  const bg = COLOR_BG[memo.color] ?? COLOR_BG.default;
  const updatedDate = new Date(memo.updated_at);
  const dateStr = updatedDate.toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const authorName = memo.updated_by ?? memo.created_by;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-lg max-h-[80vh] rounded-2xl shadow-2xl flex flex-col ${bg} border border-black/10`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-black/5">
          <div className="flex items-center gap-2 min-w-0">
            {memo.pinned && <Pin size={13} className="text-indigo-400 fill-indigo-400 shrink-0" />}
            <h2 className="font-bold text-gray-900 text-base leading-snug">{memo.title}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { onClose(); onEdit(memo); }}
              className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400 hover:text-blue-500 transition-colors"
              title="편집"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {memo.content ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {memo.content}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">내용 없음</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-black/5 text-[11px] text-gray-400">
          {authorName && (
            <>
              <User size={10} className="text-indigo-400" />
              <span className="text-indigo-500 font-medium">{authorName}</span>
              <span>·</span>
            </>
          )}
          <span>{dateStr}</span>
        </div>
      </div>
    </div>
  );
}

function sortMemos(list: Memo[]): Memo[] {
  return [...list.filter((m) => m.pinned), ...list.filter((m) => !m.pinned)];
}

export default function MemoBoard() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [viewingMemo, setViewingMemo] = useState<Memo | null>(null);

  const fetchMemos = useCallback(async () => {
    const res = await fetch("/api/memos");
    if (res.ok) {
      const data = await res.json();
      setMemos(sortMemos(data));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMemos();

    const supabase = createClient();
    const channel = supabase
      .channel("memos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memos" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMemos((prev) => {
              const m = payload.new as Memo;
              if (prev.some((x) => x.id === m.id)) return prev;
              return sortMemos([...prev, m]);
            });
          } else if (payload.eventType === "UPDATE") {
            setMemos((prev) =>
              sortMemos(
                prev.map((m) =>
                  m.id === (payload.new as Memo).id ? (payload.new as Memo) : m
                )
              )
            );
          } else if (payload.eventType === "DELETE") {
            setMemos((prev) =>
              prev.filter((m) => m.id !== (payload.old as Memo).id)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMemos]);

  async function handleSave(data: { title: string; content: string; color: string }) {
    if (editingMemo) {
      const res = await fetch(`/api/memos/${editingMemo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setMemos((prev) =>
          sortMemos(prev.map((m) => (m.id === updated.id ? updated : m)))
        );
      }
    } else {
      const res = await fetch("/api/memos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newMemo = await res.json();
        setMemos((prev) => sortMemos([...prev, newMemo]));
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 메모를 삭제할까요?")) return;
    await fetch(`/api/memos/${id}`, { method: "DELETE" });
    setMemos((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    const res = await fetch(`/api/memos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMemos((prev) =>
        sortMemos(prev.map((m) => (m.id === updated.id ? updated : m)))
      );
    }
  }

  function openNew() { setEditingMemo(null); setEditorOpen(true); }
  function openEdit(memo: Memo) { setEditingMemo(memo); setEditorOpen(true); }
  function openView(memo: Memo) { setViewingMemo(memo); }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">메모 보드</h2>
          <p className="text-xs text-gray-500 mt-0.5">실시간 공유 메모</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus size={13} />
          새 메모
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : memos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
            <Plus size={20} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">첫 번째 메모를 작성해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start overflow-y-auto auto-rows-fr">
          {memos.map((memo) => (
            <MemoCard
              key={memo.id}
              memo={memo}
              onView={openView}
              onEdit={openEdit}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {viewingMemo && (
        <MemoViewModal
          memo={viewingMemo}
          onClose={() => setViewingMemo(null)}
          onEdit={openEdit}
        />
      )}

      {editorOpen && (
        <MemoEditor
          memo={editingMemo}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

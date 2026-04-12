"use client";

import { Pin, PinOff, Pencil, Trash2, User } from "lucide-react";
import type { Memo } from "@/lib/supabase";

const COLOR_MAP: Record<string, string> = {
  default: "bg-white border-gray-200",
  yellow: "bg-yellow-50 border-yellow-200",
  green: "bg-green-50 border-green-200",
  blue: "bg-blue-50 border-blue-200",
  purple: "bg-purple-50 border-purple-200",
  red: "bg-red-50 border-red-200",
};

type Props = {
  memo: Memo;
  onView: (memo: Memo) => void;
  onEdit: (memo: Memo) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
};

export default function MemoCard({ memo, onView, onEdit, onDelete, onTogglePin }: Props) {
  const colorClass = COLOR_MAP[memo.color] ?? COLOR_MAP.default;

  const updatedDate = new Date(memo.updated_at);
  const dateStr = updatedDate.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
  const timeStr = updatedDate.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const authorName = memo.updated_by ?? memo.created_by;

  return (
    <div
      className={`group relative rounded-xl border ${colorClass} p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full`}
    >
      {memo.pinned && (
        <div className="absolute top-3 right-3">
          <Pin size={13} className="text-indigo-400 fill-indigo-400" />
        </div>
      )}

      <button
        onClick={() => onView(memo)}
        className="block w-full text-left flex-1 min-h-0"
      >
        <h3 className="font-semibold text-gray-900 text-sm pr-5 mb-2 leading-snug hover:text-indigo-700 transition-colors">
          {memo.title}
        </h3>

        {memo.content && (
          <p className="text-gray-600 text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap">
            {memo.content}
          </p>
        )}
      </button>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5">
        <div className="flex items-center gap-1.5 min-w-0 text-[10px] text-gray-400">
          {authorName && (
            <span className="flex items-center gap-0.5 text-indigo-400 font-medium shrink-0">
              <User size={9} />
              {authorName}
            </span>
          )}
          {authorName && <span className="shrink-0">·</span>}
          <span className="shrink-0">{dateStr} {timeStr}</span>
        </div>

        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 ml-1">
          <button
            onClick={() => onTogglePin(memo.id, !memo.pinned)}
            className="p-1 rounded hover:bg-black/5 text-gray-300 hover:text-indigo-500 transition-colors"
            title={memo.pinned ? "핀 해제" : "핀 고정"}
          >
            {memo.pinned ? <PinOff size={11} /> : <Pin size={11} />}
          </button>
          <button
            onClick={() => onEdit(memo)}
            className="p-1 rounded hover:bg-black/5 text-gray-300 hover:text-blue-500 transition-colors"
            title="편집"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={() => onDelete(memo.id)}
            className="p-1 rounded hover:bg-black/5 text-gray-300 hover:text-red-500 transition-colors"
            title="삭제"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

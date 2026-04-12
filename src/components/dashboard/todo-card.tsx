"use client";

import { Pencil, Trash2, Calendar, ChevronRight, User } from "lucide-react";
import type { Todo } from "@/lib/supabase";

const PRIORITY_STYLE: Record<Todo["priority"], string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
};
const PRIORITY_LABEL: Record<Todo["priority"], string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const STATUS_NEXT: Record<Todo["status"], { label: string; next: Todo["status"] }> = {
  pending: { label: "시작하기", next: "in_progress" },
  in_progress: { label: "완료하기", next: "done" },
  done: { label: "되돌리기", next: "pending" },
};

type Props = {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Todo["status"]) => void;
};

export default function TodoCard({ todo, onEdit, onDelete, onStatusChange }: Props) {
  const isOverdue =
    todo.due_date &&
    todo.status !== "done" &&
    new Date(todo.due_date) < new Date();

  const formattedDate = todo.due_date
    ? new Date(todo.due_date).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      })
    : null;

  const createdDate = new Date(todo.created_at);
  const createdStr = createdDate.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
  const createdTime = createdDate.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const authorName = todo.created_by;
  const updaterName = todo.updated_by !== todo.created_by ? todo.updated_by : null;

  const next = STATUS_NEXT[todo.status];

  return (
    <div
      className={`group bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 p-3.5 ${
        todo.status === "done" ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-sm font-medium text-gray-900 flex-1 leading-snug ${
            todo.status === "done" ? "line-through text-gray-400" : ""
          }`}
        >
          {todo.title}
        </p>
        <span
          className={`shrink-0 text-xs px-1.5 py-0.5 rounded-md font-medium ${
            PRIORITY_STYLE[todo.priority]
          }`}
        >
          {PRIORITY_LABEL[todo.priority]}
        </span>
      </div>

      {todo.description && (
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
          {todo.description}
        </p>
      )}

      {(authorName || updaterName) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-2">
          {authorName && (
            <span className="flex items-center gap-0.5 text-[10px] text-indigo-500 font-medium">
              <User size={9} />
              {authorName}
            </span>
          )}
          {updaterName && (
            <span className="text-[10px] text-gray-400">
              수정: {updaterName}
            </span>
          )}
          <span className="text-[10px] text-gray-400 ml-auto">
            {createdStr} {createdTime}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50 flex-wrap gap-y-1">
        <div className="flex items-center gap-2 shrink-0">
          {formattedDate && (
            <span
              className={`flex items-center gap-1 text-xs whitespace-nowrap ${
                isOverdue ? "text-red-500" : "text-gray-400"
              }`}
            >
              <Calendar size={11} />
              {formattedDate}
            </span>
          )}
          {!authorName && (
            <span className="text-[10px] text-gray-400">
              {createdStr} {createdTime}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onStatusChange(todo.id, next.next)}
            className="flex items-center gap-0.5 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            {next.label}
            <ChevronRight size={12} />
          </button>
          <button
            onClick={() => onEdit(todo)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(todo.id)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

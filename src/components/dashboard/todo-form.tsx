"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Todo } from "@/lib/supabase";

type Props = {
  todo?: Todo | null;
  defaultStatus?: Todo["status"];
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    priority: Todo["priority"];
    due_date: string | null;
    status?: Todo["status"];
  }) => Promise<void>;
};

export default function TodoForm({ todo, defaultStatus, onClose, onSave }: Props) {
  const [title, setTitle] = useState(todo?.title ?? "");
  const [description, setDescription] = useState(todo?.description ?? "");
  const [priority, setPriority] = useState<Todo["priority"]>(todo?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(
    todo?.due_date ? todo.due_date.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(todo?.title ?? "");
    setDescription(todo?.description ?? "");
    setPriority(todo?.priority ?? "medium");
    setDueDate(todo?.due_date ? todo.due_date.slice(0, 10) : "");
  }, [todo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description,
        priority,
        due_date: dueDate || null,
        ...(todo ? {} : { status: defaultStatus ?? "pending" }),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {todo ? "할일 편집" : "새 할일"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <input
              autoFocus
              type="text"
              placeholder="할일 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-0 py-1 text-base font-medium text-gray-900 placeholder-gray-400 border-0 border-b-2 border-gray-100 focus:border-indigo-400 focus:outline-none transition-colors bg-transparent"
            />
          </div>

          <div>
            <textarea
              placeholder="설명 (선택)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none resize-none bg-gray-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">
                우선순위
              </label>
              <div className="flex gap-1">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                      priority === p
                        ? p === "high"
                          ? "bg-red-100 border-red-300 text-red-700 font-medium"
                          : p === "medium"
                          ? "bg-yellow-100 border-yellow-300 text-yellow-700 font-medium"
                          : "bg-gray-100 border-gray-300 text-gray-700 font-medium"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {p === "high" ? "높음" : p === "medium" ? "보통" : "낮음"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">
                마감일
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none bg-gray-50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

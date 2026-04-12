"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Memo } from "@/lib/supabase";

const COLOR_OPTIONS = [
  { value: "default", label: "기본", bg: "bg-white", border: "border-gray-200" },
  { value: "yellow", label: "노랑", bg: "bg-yellow-50", border: "border-yellow-200" },
  { value: "green", label: "초록", bg: "bg-green-50", border: "border-green-200" },
  { value: "blue", label: "파랑", bg: "bg-blue-50", border: "border-blue-200" },
  { value: "purple", label: "보라", bg: "bg-purple-50", border: "border-purple-200" },
  { value: "red", label: "빨강", bg: "bg-red-50", border: "border-red-200" },
];

type Props = {
  memo?: Memo | null;
  onClose: () => void;
  onSave: (data: { title: string; content: string; color: string }) => Promise<void>;
};

export default function MemoEditor({ memo, onClose, onSave }: Props) {
  const [title, setTitle] = useState(memo?.title ?? "");
  const [content, setContent] = useState(memo?.content ?? "");
  const [color, setColor] = useState(memo?.color ?? "default");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(memo?.title ?? "");
    setContent(memo?.content ?? "");
    setColor(memo?.color ?? "default");
  }, [memo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), content, color });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {memo ? "메모 편집" : "새 메모"}
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
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-0 py-1 text-lg font-medium text-gray-900 placeholder-gray-400 border-0 border-b-2 border-gray-100 focus:border-indigo-400 focus:outline-none transition-colors bg-transparent"
            />
          </div>

          <div>
            <textarea
              placeholder="내용을 입력하세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none resize-none bg-gray-50"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">카드 색상</p>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`w-7 h-7 rounded-full border-2 ${opt.bg} transition-all ${
                    color === opt.value
                      ? "border-indigo-500 scale-110"
                      : opt.border
                  }`}
                  title={opt.label}
                />
              ))}
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

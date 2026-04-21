"use client";

import { useState } from "react";
import { X, Lock, Globe } from "lucide-react";
import type { GrowthJournal } from "@/lib/growth-types";
import { MOODS } from "@/lib/growth-types";

function getThisMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export default function JournalForm({
  cohortId,
  initial,
  onClose,
  onSaved,
}: {
  cohortId: string;
  initial?: GrowthJournal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [mood, setMood] = useState(initial?.mood ?? "");
  const [visibility, setVisibility] = useState<"cohort" | "private">(initial?.visibility ?? "cohort");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("제목을 입력하세요"); return; }
    setSaving(true);
    setError("");

    const body = { cohort_id: cohortId, title, content, mood: mood || null, visibility, week_of: getThisMonday() };
    const res = await fetch(
      isEdit ? `/api/growth/journals/${initial!.id}` : "/api/growth/journals",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (res.ok) {
      onSaved();
    } else {
      const d = await res.json();
      setError(d.error || "저장 실패");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? "일기 수정" : "성장일기 쓰기"}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목 (예: 첫 주 돌아보기)"
              className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Mood */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">오늘의 기분</p>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map((m) => (
                <button
                  key={m.emoji}
                  type="button"
                  onClick={() => setMood(mood === m.emoji ? "" : m.emoji)}
                  title={m.label}
                  className={`text-xl px-2.5 py-1.5 rounded-xl border transition-colors ${
                    mood === m.emoji
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="이번 주 어떤 일이 있었나요? 배운 것, 어려웠던 것, 기뻤던 것 무엇이든 자유롭게 써보세요."
              rows={8}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Visibility */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">공개 범위</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVisibility("cohort")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  visibility === "cohort"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <Globe size={12} /> 기수 공개
              </button>
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  visibility === "private"
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <Lock size={12} /> 나만 보기
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </form>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
            취소
          </button>
          <button
            onClick={(e) => handleSave(e as unknown as React.FormEvent)}
            disabled={saving || !title.trim()}
            className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "저장 중..." : isEdit ? "수정 완료" : "게시하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

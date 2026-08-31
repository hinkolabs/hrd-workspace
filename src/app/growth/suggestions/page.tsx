"use client";

import { useState, useEffect, useCallback } from "react";
import { Lightbulb, Send, Loader2, CheckCircle2, MessageCircle, Trash2, RotateCcw } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import type { GrowthSuggestion } from "@/lib/growth-types";

function getDateTimeStr(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GrowthSuggestionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [suggestions, setSuggestions] = useState<GrowthSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/growth/suggestions");
      if (res.ok) setSuggestions(await res.json());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/growth/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        setContent("");
        fetchSuggestions();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(s: GrowthSuggestion) {
    setSavingId(s.id);
    try {
      const nextStatus = s.status === "open" ? "resolved" : "open";
      const res = await fetch(`/api/growth/suggestions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) fetchSuggestions();
    } finally {
      setSavingId(null);
    }
  }

  async function handleSendReply(s: GrowthSuggestion) {
    const reply = (replyDrafts[s.id] ?? "").trim();
    if (!reply) return;
    setSavingId(s.id);
    try {
      const res = await fetch(`/api/growth/suggestions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_reply: reply, status: "resolved" }),
      });
      if (res.ok) {
        setReplyDrafts((prev) => ({ ...prev, [s.id]: "" }));
        fetchSuggestions();
      }
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(s: GrowthSuggestion) {
    if (!confirm("이 건의사항을 삭제할까요?")) return;
    const res = await fetch(`/api/growth/suggestions/${s.id}`, { method: "DELETE" });
    if (res.ok) setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  }

  if (!user) return null;

  const filtered = suggestions.filter((s) => filter === "all" || s.status === filter);
  const openCount = suggestions.filter((s) => s.status === "open").length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Lightbulb size={16} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">건의사항</h1>
        </div>
        <p className="text-sm text-gray-500">
          버그 신고, 불편한 점, 개선 아이디어를 자유롭게 남겨주세요. 채팅방은 팀원들과의 실제 대화를 위해 남겨두어요 :)
        </p>
      </div>

      {/* 작성 폼 */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="예) 할 일 목록 추가 시 끝 글자가 중복으로 등록돼요"
          rows={3}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            건의하기
          </button>
        </div>
      </form>

      {/* 필터 탭 */}
      <div className="flex items-center gap-1.5 mb-4">
        {([
          { key: "all", label: "전체" },
          { key: "open", label: `대기중${openCount > 0 ? ` ${openCount}` : ""}` },
          { key: "resolved", label: "답변완료" },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
          <Lightbulb size={28} />
          <p className="text-sm">
            {filter === "resolved" ? "아직 답변완료된 건의사항이 없어요" : "아직 등록된 건의사항이 없어요"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isMine = s.user_id === user.id;
            return (
              <div key={s.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[11px] font-bold text-amber-600 shrink-0">
                      {s.sender_name.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-gray-700 truncate">{s.sender_name}</span>
                    <span className="text-[11px] text-gray-400 shrink-0">{getDateTimeStr(s.created_at)}</span>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.status === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {s.status === "resolved" ? "답변완료" : "대기중"}
                  </span>
                </div>

                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{s.content}</p>

                {s.admin_reply && (
                  <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MessageCircle size={12} className="text-indigo-500" />
                      <span className="text-[11px] font-bold text-indigo-600">
                        {s.replied_by_name ? `${s.replied_by_name}의 답변` : "담당자 답변"}
                      </span>
                    </div>
                    <p className="text-sm text-indigo-800 whitespace-pre-wrap leading-relaxed">{s.admin_reply}</p>
                  </div>
                )}

                {/* 관리자 답변 입력 */}
                {isAdmin && !s.admin_reply && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={replyDrafts[s.id] ?? ""}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSendReply(s); }}
                      placeholder="답변을 남기면 자동으로 답변완료 처리돼요"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={() => handleSendReply(s)}
                      disabled={!(replyDrafts[s.id] ?? "").trim() || savingId === s.id}
                      className="shrink-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-colors"
                    >
                      {savingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                )}

                {/* 하단 액션 */}
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-end gap-3">
                  {isAdmin && (
                    <button
                      onClick={() => handleToggleStatus(s)}
                      disabled={savingId === s.id}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-40 transition-colors"
                    >
                      {s.status === "open" ? <CheckCircle2 size={12} /> : <RotateCcw size={12} />}
                      {s.status === "open" ? "답변완료로 표시" : "다시 열기"}
                    </button>
                  )}
                  {(isAdmin || isMine) && (
                    <button
                      onClick={() => handleDelete(s)}
                      className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} /> 삭제
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

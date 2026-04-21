"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, MessageSquare, Lock, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import { useCohort } from "@/lib/use-cohort";
import type { GrowthJournal } from "@/lib/growth-types";
import { REACTION_EMOJIS, MOODS } from "@/lib/growth-types";
import JournalForm from "@/components/growth/journal-form";

export default function GrowthFeedPage() {
  const { user } = useAuth();
  const { activeCohort, loading: cohortLoading } = useCohort();
  const [journals, setJournals] = useState<GrowthJournal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editJournal, setEditJournal] = useState<GrowthJournal | null>(null);

  const fetchJournals = useCallback(async () => {
    if (!activeCohort) return;
    setLoading(true);
    const res = await fetch(`/api/growth/journals?cohort_id=${activeCohort.id}&limit=30`);
    if (res.ok) setJournals(await res.json());
    setLoading(false);
  }, [activeCohort]);

  useEffect(() => { fetchJournals(); }, [fetchJournals]);

  async function handleReact(journalId: string, emoji: string) {
    await fetch(`/api/growth/journals/${journalId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    fetchJournals();
  }

  async function handleDelete(id: string) {
    if (!confirm("일기를 삭제할까요?")) return;
    await fetch(`/api/growth/journals/${id}`, { method: "DELETE" });
    fetchJournals();
  }

  // Group journals by week
  const grouped = journals.reduce<Record<string, GrowthJournal[]>>((acc, j) => {
    const week = j.week_of ?? j.created_at.slice(0, 10);
    if (!acc[week]) acc[week] = [];
    acc[week].push(j);
    return acc;
  }, {});

  const weekKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (cohortLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // cohortLoading is handled above; if still null after loading, show empty state gracefully

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Write button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">성장일기 피드</h2>
          <p className="text-xs text-gray-400">{activeCohort?.name ?? ""} · 최신 순</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditJournal(null); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={15} /> 일기 쓰기
        </button>
      </div>

      {/* Journal form modal */}
      {(showForm || editJournal) && activeCohort && (
        <JournalForm
          cohortId={activeCohort.id}
          initial={editJournal}
          onClose={() => { setShowForm(false); setEditJournal(null); }}
          onSaved={() => { setShowForm(false); setEditJournal(null); fetchJournals(); }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : journals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpenIcon />
          <p className="mt-3 text-sm font-medium text-gray-500">아직 일기가 없어요</p>
          <p className="text-xs mt-1">첫 번째 성장일기를 남겨보세요!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {weekKeys.map((week) => (
            <div key={week}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase">
                  {formatWeek(week)}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-4">
                {grouped[week].map((journal) => (
                  <JournalCard
                    key={journal.id}
                    journal={journal}
                    isOwner={journal.user_id === user?.id}
                    onReact={handleReact}
                    onEdit={() => setEditJournal(journal)}
                    onDelete={() => handleDelete(journal.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JournalCard({
  journal,
  isOwner,
  onReact,
  onEdit,
  onDelete,
}: {
  journal: GrowthJournal;
  isOwner: boolean;
  onReact: (id: string, emoji: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const moodObj = MOODS.find((m) => m.emoji === journal.mood);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
            {(journal.display_name ?? "?").charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{journal.display_name}</p>
            <p className="text-[11px] text-gray-400">
              {new Date(journal.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {journal.visibility === "private" && (
            <span className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
              <Lock size={9} /> 비공개
            </span>
          )}
          {moodObj && (
            <span title={moodObj.label} className="text-base">{moodObj.emoji}</span>
          )}
          {isOwner && (
            <div className="flex gap-1">
              <button onClick={onEdit} className="text-[10px] text-gray-400 hover:text-indigo-600 px-1.5 py-0.5 rounded hover:bg-indigo-50">수정</button>
              <button onClick={onDelete} className="text-[10px] text-gray-400 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-red-50">삭제</button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <Link href={`/growth/journal/${journal.id}`}>
        <h3 className="text-base font-semibold text-gray-900 mb-1.5 hover:text-indigo-600 transition-colors">
          {journal.title}
        </h3>
      </Link>

      {/* Content preview */}
      {journal.content && (
        <p className="text-sm text-gray-600 line-clamp-3 mb-3 leading-relaxed">
          {journal.content.replace(/[#*`>\-]/g, "").trim()}
        </p>
      )}

      {/* Footer: reactions + comments */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1 flex-wrap">
          {REACTION_EMOJIS.map((emoji) => {
            const rxn = (journal.reactions ?? []).find((r) => r.emoji === emoji);
            return (
              <button
                key={emoji}
                onClick={() => onReact(journal.id, emoji)}
                className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-xs transition-colors ${
                  rxn?.reacted
                    ? "bg-indigo-100 text-indigo-700 font-medium"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {emoji}
                {rxn && rxn.count > 0 && <span className="ml-0.5">{rxn.count}</span>}
              </button>
            );
          })}
        </div>
        <Link
          href={`/growth/journal/${journal.id}`}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <MessageSquare size={12} />
          {journal.comment_count ?? 0}
        </Link>
      </div>
    </div>
  );
}

function BookOpenIcon() {
  return (
    <svg className="mx-auto w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function formatWeek(dateStr: string) {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `이번 주 (${month}/${date})`;
  if (diffDays < 14) return `지난 주 (${month}/${date})`;
  return `${d.getFullYear()}년 ${month}월 ${date}일 주`;
}

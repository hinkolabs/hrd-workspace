"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Trash2, Lock } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import type { GrowthJournal, GrowthComment } from "@/lib/growth-types";
import { REACTION_EMOJIS, MOODS } from "@/lib/growth-types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [journal, setJournal] = useState<GrowthJournal | null>(null);
  const [comments, setComments] = useState<GrowthComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchAll = useCallback(async () => {
    const [jRes, cRes] = await Promise.all([
      fetch(`/api/growth/journals/${id}`),
      fetch(`/api/growth/journals/${id}/comments`),
    ]);
    if (jRes.ok) setJournal(await jRes.json());
    if (cRes.ok) setComments(await cRes.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleReact(emoji: string) {
    await fetch(`/api/growth/journals/${id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    fetchAll();
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSending(true);
    await fetch(`/api/growth/journals/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment, parent_id: replyTo }),
    });
    setNewComment("");
    setReplyTo(null);
    setSending(false);
    fetchAll();
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("댓글을 삭제할까요?")) return;
    await fetch(`/api/growth/journals/${id}/comments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: commentId }),
    });
    fetchAll();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!journal) {
    return (
      <div className="p-8 text-center text-gray-500">
        일기를 찾을 수 없습니다.
        <Link href="/growth" className="block mt-2 text-indigo-600 text-sm">← 피드로 돌아가기</Link>
      </div>
    );
  }

  const moodObj = MOODS.find((m) => m.emoji === journal.mood);
  const topComments = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <Link href="/growth" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={15} /> 피드로 돌아가기
      </Link>

      {/* Article */}
      <article className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        {/* Author header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-base font-bold text-indigo-600">
            {(journal.display_name ?? "?").charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{journal.display_name}</p>
            <p className="text-xs text-gray-400">
              {new Date(journal.created_at).toLocaleDateString("ko-KR", {
                year: "numeric", month: "long", day: "numeric",
              })}
              {journal.visibility === "private" && (
                <span className="ml-2 inline-flex items-center gap-0.5 text-gray-400">
                  <Lock size={10} /> 비공개
                </span>
              )}
            </p>
          </div>
          {moodObj && (
            <span className="ml-auto text-2xl" title={moodObj.label}>{moodObj.emoji}</span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 mb-4">{journal.title}</h1>

        {/* Content */}
        {journal.content && (
          <div className="prose prose-sm max-w-none text-gray-700 mb-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{journal.content}</ReactMarkdown>
          </div>
        )}

        {/* Reactions */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">반응 남기기</p>
          <div className="flex flex-wrap gap-1.5">
            {REACTION_EMOJIS.map((emoji) => {
              const rxn = (journal.reactions ?? []).find((r) => r.emoji === emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    rxn?.reacted
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {emoji}
                  {rxn && rxn.count > 0 && <span className="text-xs">{rxn.count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </article>

      {/* Comments */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          댓글 {comments.length > 0 && <span className="text-gray-400">({comments.length})</span>}
        </h2>

        {/* Comment list */}
        <div className="space-y-4 mb-4">
          {topComments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">첫 댓글을 남겨보세요!</p>
          )}
          {topComments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                isOwner={comment.user_id === user?.id}
                onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                onDelete={() => handleDeleteComment(comment.id)}
                isReplyTarget={replyTo === comment.id}
              />
              {/* Replies */}
              {replies.filter((r) => r.parent_id === comment.id).map((reply) => (
                <div key={reply.id} className="ml-8 mt-2">
                  <CommentItem
                    comment={reply}
                    isOwner={reply.user_id === user?.id}
                    onDelete={() => handleDeleteComment(reply.id)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Comment form */}
        {replyTo && (
          <div className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg mb-2 flex items-center justify-between">
            <span>↩ 답글 작성 중</span>
            <button onClick={() => setReplyTo(null)} className="hover:text-indigo-800">취소</button>
          </div>
        )}
        <form onSubmit={handleComment} className="flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !newComment.trim()}
            className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  isOwner,
  onReply,
  onDelete,
  isReplyTarget,
}: {
  comment: GrowthComment;
  isOwner: boolean;
  onReply?: () => void;
  onDelete: () => void;
  isReplyTarget?: boolean;
}) {
  return (
    <div className={`flex gap-2.5 p-3 rounded-xl ${isReplyTarget ? "bg-indigo-50" : "bg-gray-50"}`}>
      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
        {(comment.display_name ?? "?").charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5">
          <span className="text-xs font-semibold text-gray-800">{comment.display_name}</span>
          <span className="text-[10px] text-gray-400">
            {new Date(comment.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
          </span>
        </div>
        <p className="text-sm text-gray-700 break-words">{comment.content}</p>
        <div className="flex gap-2 mt-1">
          {onReply && (
            <button onClick={onReply} className="text-[10px] text-gray-400 hover:text-indigo-600">답글</button>
          )}
          {isOwner && (
            <button onClick={onDelete} className="text-[10px] text-gray-400 hover:text-red-500">
              <Trash2 size={10} className="inline" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

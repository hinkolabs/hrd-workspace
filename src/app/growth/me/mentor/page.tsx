"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import { useCohort } from "@/lib/use-cohort";
import type { GrowthMentorThread, GrowthMentorMessage } from "@/lib/growth-types";

export default function MentorThreadPage() {
  const { user } = useAuth();
  const { activeCohort } = useCohort();
  const [thread, setThread] = useState<GrowthMentorThread | null>(null);
  const [messages, setMessages] = useState<GrowthMentorMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const initThread = useCallback(async () => {
    if (!activeCohort || !user) return;
    // Ensure thread exists
    const tRes = await fetch("/api/growth/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohort_id: activeCohort.id }),
    });
    const t: GrowthMentorThread = await tRes.json();
    setThread(t);

    // Load messages
    const mRes = await fetch(`/api/growth/mentor/${t.id}`);
    if (mRes.ok) {
      const data = await mRes.json();
      setMessages(data.messages ?? []);
    }
    setLoading(false);
  }, [activeCohort, user]);

  useEffect(() => { initThread(); }, [initThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !thread) return;
    setSending(true);
    const res = await fetch(`/api/growth/mentor/${thread.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg }),
    });
    if (res.ok) {
      const msg: GrowthMentorMessage = await res.json();
      setMessages((prev) => [...prev, msg]);
      setNewMsg("");
    }
    setSending(false);
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/growth/me" className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900">HRD 멘토 대화</h2>
            <p className="text-xs text-gray-400">
              {thread?.mentor_name ? `멘토: ${thread.mentor_name}` : "멘토 배정 대기 중"}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400" title="온라인" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">대화를 시작해보세요!</p>
            <p className="text-xs mt-1">HRD 담당자(멘토)와 자유롭게 이야기하세요.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0 mt-1">
                  {(msg.sender_name ?? "?").charAt(0)}
                </div>
              )}
              <div className={`max-w-[75%] ${isMe ? "" : ""}`}>
                {!isMe && (
                  <p className="text-[10px] text-gray-400 mb-0.5 ml-1">{msg.sender_name}</p>
                )}
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-800 rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
                <p className={`text-[10px] text-gray-400 mt-0.5 ${isMe ? "text-right" : "text-left ml-1"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            placeholder="멘토에게 메시지를 보내세요..."
            className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !newMsg.trim()}
            className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

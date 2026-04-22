"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Megaphone, Check, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/components/layout/app-shell";

type ReactionInfo = { emoji: string; count: number; reacted: boolean };
type SignupInfo = { user_id: string; display_name: string };

type ChatMessage = {
  id: string;
  cohort_id: string | null;
  user_id: string;
  sender_name: string;
  content: string;
  kind?: "normal" | "recruit" | null;
  created_at: string;
  reactions?: ReactionInfo[];
  signups?: SignupInfo[];
};

const REACTION_PALETTE = ["👍", "❤️", "🔥", "🎉", "💪", "😊"];

function getTimeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function getDateStr(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

export default function GrowthChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [kind, setKind] = useState<"normal" | "recruit">("normal");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/growth/chat");
      if (res.ok) setMessages(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchMessages();

    const supabase = createClient();
    const channel = supabase
      .channel("growth-chat-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "growth_chat_messages" },
        () => { fetchMessages(); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "growth_chat_signups" },
        () => { fetchMessages(); }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "growth_chat_signups" },
        () => { fetchMessages(); }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
        } else if (!pollingRef.current) {
          pollingRef.current = setInterval(fetchMessages, 5000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [user, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !user || sending) return;

    const content = input.trim();
    const currentKind = kind;
    setInput("");
    setKind("normal");
    setSending(true);
    inputRef.current?.focus();

    try {
      const res = await fetch("/api/growth/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, kind: currentKind }),
      });
      if (!res.ok) {
        setInput(content);
        setKind(currentKind);
      } else {
        fetchMessages();
      }
    } catch {
      setInput(content);
      setKind(currentKind);
    }
    setSending(false);
  }

  async function toggleReaction(messageId: string, emoji: string) {
    // optimistic
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const rxns = [...(m.reactions ?? [])];
        const existing = rxns.find((r) => r.emoji === emoji);
        if (existing) {
          if (existing.reacted) {
            existing.count -= 1;
            existing.reacted = false;
            if (existing.count <= 0) return { ...m, reactions: rxns.filter((r) => r.emoji !== emoji) };
          } else {
            existing.count += 1;
            existing.reacted = true;
          }
          return { ...m, reactions: [...rxns] };
        }
        return { ...m, reactions: [...rxns, { emoji, count: 1, reacted: true }] };
      })
    );
    await fetch(`/api/growth/chat/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    fetchMessages();
  }

  async function toggleSignup(messageId: string) {
    await fetch(`/api/growth/chat/${messageId}/signups`, { method: "POST" });
    fetchMessages();
  }

  if (!user) return null;

  let lastDate = "";

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-sm font-bold text-gray-900">신입 팀 채팅</span>
          <span className="text-[11px] text-gray-400 ml-1">{user.displayName}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <span className="text-3xl">💬</span>
            <p className="text-sm font-medium text-gray-500">첫 번째 메시지를 보내보세요!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user.id;
            const dateStr = getDateStr(msg.created_at);
            let showDate = false;
            if (dateStr !== lastDate) { showDate = true; lastDate = dateStr; }
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[10px] bg-gray-200/80 text-gray-500 px-3 py-0.5 rounded-full">{dateStr}</span>
                  </div>
                )}
                <ChatBubble
                  msg={msg}
                  isMe={isMe}
                  currentUserId={user.id}
                  onReact={toggleReaction}
                  onToggleSignup={toggleSignup}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 sm:px-6 py-3 bg-white border-t border-gray-200 shrink-0">
        <form onSubmit={sendMessage} className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 select-none cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={kind === "recruit"}
              onChange={(e) => setKind(e.target.checked ? "recruit" : "normal")}
              className="accent-amber-500"
            />
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
              kind === "recruit" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
            }`}>
              <Megaphone size={11} /> 모집 메시지
            </span>
            {kind === "recruit" && (
              <span className="text-[10px] text-amber-600">다른 사람이 참여할 수 있어요</span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={kind === "recruit" ? "예: 오늘 저녁 7시 파이썬 스터디 같이 하실 분!" : "팀원들에게 메시지..."}
              className={`flex-1 px-4 py-2.5 text-sm border rounded-2xl focus:outline-none ${
                kind === "recruit"
                  ? "bg-amber-50 border-amber-200 focus:border-amber-400"
                  : "bg-gray-50 border-gray-200 focus:border-indigo-400"
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className={`w-10 h-10 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 transition-colors shrink-0 ${
                kind === "recruit" ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              <Send size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Chat bubble with reactions + signups ─────────────────────────────────── */

function ChatBubble({
  msg,
  isMe,
  currentUserId,
  onReact,
  onToggleSignup,
}: {
  msg: ChatMessage;
  isMe: boolean;
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  onToggleSignup: (messageId: string) => void;
}) {
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const isRecruit = msg.kind === "recruit";
  const signups = msg.signups ?? [];
  const amJoined = signups.some((s) => s.user_id === currentUserId);

  return (
    <div
      className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2 items-end gap-1.5 group`}
      onMouseLeave={() => setShowEmojiBar(false)}
    >
      {!isMe && (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mb-0.5 ${
          isRecruit ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-600"
        }`}>
          {msg.sender_name.charAt(0)}
        </div>
      )}
      <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
        {!isMe && (
          <span className="text-[10px] font-semibold text-gray-500 ml-1 mb-0.5">{msg.sender_name}</span>
        )}
        <div className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : ""} relative`}>
          <div
            onMouseEnter={() => setShowEmojiBar(true)}
            className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words relative ${
              isRecruit
                ? "bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm"
                : isMe
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
            }`}
          >
            {isRecruit && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 mb-1">
                <Megaphone size={11} /> 모집 메시지
              </div>
            )}
            {msg.content}

            {/* emoji picker bar */}
            {showEmojiBar && (
              <div className={`absolute -top-9 ${isMe ? "right-0" : "left-0"} bg-white rounded-full shadow-lg border border-gray-200 px-1.5 py-1 flex gap-0.5 z-10`}>
                {REACTION_PALETTE.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { onReact(msg.id, e); setShowEmojiBar(false); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-base"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-400 shrink-0 pb-0.5">
            {getTimeStr(msg.created_at)}
          </span>
        </div>

        {/* reactions chips */}
        {(msg.reactions ?? []).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
            {(msg.reactions ?? []).map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(msg.id, r.emoji)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] transition-colors ${
                  r.reacted
                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-semibold">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* signups (recruit only) */}
        {isRecruit && (
          <div className={`flex items-center gap-2 mt-2 ${isMe ? "flex-row-reverse" : ""}`}>
            <button
              type="button"
              onClick={() => onToggleSignup(msg.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                amJoined
                  ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
            >
              {amJoined ? (<><Check size={11} /> 참여중</>) : "참여하기"}
            </button>
            {signups.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-gray-600">
                <Users size={11} className="text-gray-400" />
                <div className="flex -space-x-1.5">
                  {signups.slice(0, 5).map((s) => (
                    <div
                      key={s.user_id}
                      title={s.display_name}
                      className="w-5 h-5 rounded-full bg-amber-100 border-2 border-white text-[9px] font-bold text-amber-700 flex items-center justify-center"
                    >
                      {s.display_name.charAt(0)}
                    </div>
                  ))}
                </div>
                <span className="font-medium">
                  {signups.length}명 참여
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/components/layout/app-shell";
import { useCohort } from "@/lib/use-cohort";

type ChatMessage = {
  id: string;
  cohort_id: string;
  user_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};

function getTimeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function getDateStr(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

export default function GrowthChatPage() {
  const { user } = useAuth();
  const { activeCohort, loading: cohortLoading } = useCohort();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!activeCohort) return;
    try {
      const res = await fetch(`/api/growth/chat?cohort_id=${activeCohort.id}`);
      if (res.ok) setMessages(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [activeCohort]);

  // Initial load + Supabase Realtime
  useEffect(() => {
    if (!user || cohortLoading) return;

    if (!activeCohort) {
      setLoading(false);
      return;
    }

    fetchMessages();

    const supabase = createClient();
    const channelName = `growth-chat-${activeCohort.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "growth_chat_messages", filter: `cohort_id=eq.${activeCohort.id}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev.filter((m) => !m.id.startsWith("temp-")), msg];
          });
        }
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
  }, [user, activeCohort, cohortLoading, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !user || !activeCohort || sending) return;

    const content = input.trim();
    const tempId = `temp-${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      cohort_id: activeCohort.id,
      user_id: user.id,
      sender_name: user.displayName,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setInput("");
    setSending(true);
    inputRef.current?.focus();

    try {
      const res = await fetch("/api/growth/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohort_id: activeCohort.id, content }),
      });
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(content);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
    }
    setSending(false);
  }

  // cohortLoading은 layout에서 처리됨
  if (!user) return null;

  let lastDate = "";

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Chat header */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-sm font-bold text-gray-900">신입 팀 채팅</span>
          <span className="text-[11px] text-gray-400 ml-1">{user.displayName}</span>
        </div>
      </div>

      {/* Message list */}
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
            const isTemp = msg.id.startsWith("temp-");
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
                <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1 items-end gap-1.5`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0 mb-0.5">
                      {msg.sender_name.charAt(0)}
                    </div>
                  )}
                  <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    {!isMe && (
                      <span className="text-[10px] font-semibold text-gray-500 ml-1 mb-0.5">{msg.sender_name}</span>
                    )}
                    <div className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                      <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                      } ${isTemp ? "opacity-60" : ""}`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 pb-0.5">
                        {isTemp ? "전송 중..." : getTimeStr(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 sm:px-6 py-3 bg-white border-t border-gray-200 shrink-0">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="팀원들에게 메시지..."
            disabled={!activeCohort}
            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:border-indigo-400 focus:outline-none bg-gray-50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || !activeCohort}
            className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

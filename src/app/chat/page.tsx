"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Message } from "@/lib/supabase";
import { useAuth } from "@/components/layout/app-shell";

function getTimeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function getDateStr(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) setMessages(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchMessages();

    const supabase = createClient();
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        setMessages((prev) => {
          const msg = payload.new as Message;
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev.filter((m) => !m.id.startsWith("temp-")), msg];
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
        } else {
          if (!pollingRef.current) {
            pollingRef.current = setInterval(fetchMessages, 5000);
          }
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
    const sender = user.displayName;

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      sender,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender, content }),
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

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  let lastDate = "";

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-lg font-bold text-gray-900">팀 채팅</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full" />{user.displayName}
          </span>
          {" · "}실시간 팀 소통 공간
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">첫 번째 메시지를 보내보세요!</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === user.displayName;
            const isTemp = msg.id.startsWith("temp-");
            const dateStr = getDateStr(msg.created_at);
            let showDate = false;
            if (dateStr !== lastDate) { showDate = true; lastDate = dateStr; }

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center my-3">
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-2.5 py-0.5 rounded-full">{dateStr}</span>
                  </div>
                )}
                <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                  <div className={`max-w-[70%] ${isMe ? "order-last" : ""}`}>
                    {!isMe && (
                      <span className="text-[10px] font-semibold text-gray-500 ml-1 mb-0.5 block">{msg.sender}</span>
                    )}
                    <div className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-br-md"
                            : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                        } ${isTemp ? "opacity-60" : ""}`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
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

      <div className="px-4 sm:px-6 py-3 bg-white border-t border-gray-200 shrink-0">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none bg-gray-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

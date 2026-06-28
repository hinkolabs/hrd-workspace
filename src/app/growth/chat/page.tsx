"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Hash, Check, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/components/layout/app-shell";

type ReactionInfo = { emoji: string; count: number; reacted: boolean };

type ChatMessage = {
  id: string;
  cohort_id: string | null;
  room_id: string | null;
  user_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  reactions?: ReactionInfo[];
};

type ChatRoom = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
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
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Admin: create room UI
  const isAdmin = user?.role === "admin";
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/growth/chat/rooms");
      if (res.ok) setRooms(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchMessages = useCallback(async (roomId: string | null = currentRoomId) => {
    try {
      const url = roomId ? `/api/growth/chat?room_id=${roomId}` : "/api/growth/chat";
      const res = await fetch(url);
      if (res.ok) setMessages(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [currentRoomId]);

  useEffect(() => {
    if (!user) return;
    fetchRooms();
    fetchMessages();

    const supabase = createClient();
    const channel = supabase
      .channel("growth-chat-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "growth_chat_messages" },
        () => { fetchMessages(); }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
        } else if (!pollingRef.current) {
          pollingRef.current = setInterval(() => fetchMessages(), 5000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [user, fetchMessages, fetchRooms]);

  // Re-fetch when room changes
  useEffect(() => {
    setLoading(true);
    fetchMessages(currentRoomId);
  }, [currentRoomId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !user || sending) return;

    const content = input.trim();
    setInput("");
    setSending(true);
    inputRef.current?.focus();

    try {
      const body: Record<string, unknown> = { content };
      if (currentRoomId) body.room_id = currentRoomId;
      const res = await fetch("/api/growth/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setInput(content);
      } else {
        fetchMessages(currentRoomId);
      }
    } catch {
      setInput(content);
    }
    setSending(false);
  }

  async function toggleReaction(messageId: string, emoji: string) {
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
    fetchMessages(currentRoomId);
  }

  async function handleAddRoom() {
    if (!newRoomName.trim()) return;
    setAddingRoom(true);
    try {
      const res = await fetch("/api/growth/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });
      if (res.ok) {
        const room = await res.json();
        setRooms((prev) => [...prev, room]);
        setNewRoomName("");
        setShowAddRoom(false);
      }
    } finally {
      setAddingRoom(false);
    }
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm("채팅방을 삭제할까요? 기존 메시지도 함께 삭제됩니다.")) return;
    const res = await fetch(`/api/growth/chat/rooms?id=${roomId}`, { method: "DELETE" });
    if (res.ok) {
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (currentRoomId === roomId) setCurrentRoomId(null);
    }
  }

  if (!user) return null;

  const currentRoomName = currentRoomId
    ? rooms.find((r) => r.id === currentRoomId)?.name ?? "채팅방"
    : "팀 채팅";

  let lastDate = "";

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <Hash size={14} className="text-gray-500" />
          <span className="text-sm font-bold text-gray-900">{currentRoomName}</span>
          <span className="text-[11px] text-gray-400 ml-1">{user.displayName}</span>
        </div>
      </div>

      {/* Room tabs */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {/* Default general room */}
          <button
            onClick={() => setCurrentRoomId(null)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              currentRoomId === null
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Hash size={11} /> 전체 채팅
          </button>
          {rooms.map((room) => (
            <div key={room.id} className="relative group/room flex items-center">
              <button
                onClick={() => setCurrentRoomId(room.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors pr-5 ${
                  currentRoomId === room.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Hash size={11} /> {room.name}
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover/room:opacity-100 transition-opacity ${
                    currentRoomId === room.id ? "text-white/70 hover:text-white" : "text-gray-400 hover:text-red-500"
                  }`}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          {isAdmin && (
            showAddRoom ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddRoom(); if (e.key === "Escape") setShowAddRoom(false); }}
                  placeholder="채팅방 이름"
                  className="px-2 py-1 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500 w-28"
                />
                <button
                  onClick={handleAddRoom}
                  disabled={addingRoom || !newRoomName.trim()}
                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-40"
                >
                  <Check size={12} />
                </button>
                <button onClick={() => setShowAddRoom(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddRoom(true)}
                className="flex items-center gap-0.5 px-2 py-1.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                title="채팅방 추가"
              >
                <Plus size={12} /> 방 추가
              </button>
            )
          )}
        </div>
      </div>

      {/* Messages */}
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
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 py-3 bg-white border-t border-gray-200 shrink-0">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="팀원들에게 메시지..."
            className="flex-1 px-4 py-2.5 text-sm border rounded-2xl focus:outline-none bg-gray-50 border-gray-200 focus:border-indigo-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Chat bubble with reactions ────────────────────────────────────────────── */

function ChatBubble({
  msg,
  isMe,
  currentUserId,
  onReact,
}: {
  msg: ChatMessage;
  isMe: boolean;
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const [showEmojiBar, setShowEmojiBar] = useState(false);

  return (
    <div
      className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2 items-end gap-1.5 group`}
      onMouseLeave={() => setShowEmojiBar(false)}
    >
      {!isMe && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mb-0.5 bg-indigo-100 text-indigo-600">
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
              isMe
                ? "bg-indigo-600 text-white rounded-br-sm"
                : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
            }`}
          >
            {msg.content}

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
      </div>
    </div>
  );
}

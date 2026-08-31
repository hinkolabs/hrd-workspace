"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Send, Hash, Check, Plus, X, Megaphone, Users, Loader2, ClipboardCheck, Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/components/layout/app-shell";
import type { GrowthRecruit, GrowthRecruitFormField } from "@/lib/growth-types";

type ReactionInfo = { emoji: string; count: number; reacted: boolean };

type ChatMessage = {
  id: string;
  cohort_id: string | null;
  room_id: string | null;
  user_id: string;
  sender_name: string;
  content: string;
  kind?: "normal" | "recruit" | null;
  created_at: string;
  reactions?: ReactionInfo[];
  signups?: { user_id: string; display_name: string }[];
  recruit?: GrowthRecruit | null;
};

const RECRUIT_STATUS_LABEL: Record<string, string> = {
  open: "모집중",
  pending: "승인 대기중",
  approved: "승인됨",
  rejected: "반려됨",
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

// 방별로 입력 중인 메시지를 임시 저장 — 예기치 않은 새로고침/탭 복귀로 입력 중이던
// 메시지가 사라지는 문제에 대한 방어 로직 (원인 미확정이라 임시 보존으로 손실을 최소화)
function draftKey(roomId: string | null) {
  return `growth-chat-draft:${roomId ?? "general"}`;
}
function loadDraft(roomId: string | null): string {
  try {
    return localStorage.getItem(draftKey(roomId)) ?? "";
  } catch {
    return "";
  }
}
function saveDraft(roomId: string | null, value: string) {
  try {
    if (value) localStorage.setItem(draftKey(roomId), value);
    else localStorage.removeItem(draftKey(roomId));
  } catch { /* ignore (예: 시크릿 모드) */ }
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Admin: create room UI
  const isAdmin = user?.role === "admin";
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);

  // 모집 시작 모달
  const [showRecruitModal, setShowRecruitModal] = useState(false);
  const [recruitTitle, setRecruitTitle] = useState("");
  const [recruitDescription, setRecruitDescription] = useState("");
  const [recruitTargetCount, setRecruitTargetCount] = useState("");
  const [creatingRecruit, setCreatingRecruit] = useState(false);

  // 신청 모달 (모집자 전용)
  const [applyingRecruit, setApplyingRecruit] = useState<ChatMessage | null>(null);
  const [formFields, setFormFields] = useState<GrowthRecruitFormField[] | null>(null);
  const [applyAnswers, setApplyAnswers] = useState<Record<string, string>>({});
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState("");

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

  // 방을 전환하면 그 방에 임시 저장된 입력 중 메시지를 복원 (없으면 비움)
  useEffect(() => {
    setInput(loadDraft(currentRoomId));
    if (inputRef.current) inputRef.current.style.height = "auto";
  }, [currentRoomId]);

  // 페이지가 다시 포커스를 얻을 때(탭 복귀 등) 저장된 초안이 화면과 다르면 복원
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== "visible") return;
      const saved = loadDraft(currentRoomId);
      setInput((cur) => (cur ? cur : saved));
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [currentRoomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || !user || sending) return;

    const content = input.trim();
    const roomAtSend = currentRoomId;
    setInput("");
    saveDraft(roomAtSend, "");
    if (inputRef.current) inputRef.current.style.height = "auto";
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
        saveDraft(roomAtSend, content);
      } else {
        fetchMessages(currentRoomId);
      }
    } catch {
      setInput(content);
      saveDraft(roomAtSend, content);
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

  async function handleCreateRecruit() {
    if (!recruitTitle.trim()) return;
    setCreatingRecruit(true);
    try {
      const res = await fetch("/api/growth/chat/recruits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recruitTitle.trim(),
          description: recruitDescription.trim() || null,
          target_count: recruitTargetCount ? Number(recruitTargetCount) : null,
          room_id: currentRoomId,
        }),
      });
      if (res.ok) {
        setRecruitTitle("");
        setRecruitDescription("");
        setRecruitTargetCount("");
        setShowRecruitModal(false);
        fetchMessages(currentRoomId);
      } else {
        const data = await res.json();
        alert(data.error ?? "모집 생성에 실패했습니다");
      }
    } finally {
      setCreatingRecruit(false);
    }
  }

  async function toggleSignup(messageId: string) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.recruit) return m;
        const already = (m.signups ?? []).some((s) => s.user_id === user!.id);
        const nextSignups = already
          ? (m.signups ?? []).filter((s) => s.user_id !== user!.id)
          : [...(m.signups ?? []), { user_id: user!.id, display_name: user!.displayName }];
        return { ...m, signups: nextSignups, recruit: { ...m.recruit, participants: nextSignups } };
      })
    );
    await fetch(`/api/growth/chat/${messageId}/signups`, { method: "POST" });
    fetchMessages(currentRoomId);
  }

  async function openApplyModal(msg: ChatMessage) {
    setApplyingRecruit(msg);
    setApplyAnswers({});
    setApplyError("");
    if (!formFields) {
      const res = await fetch("/api/growth/recruit-form-fields");
      if (res.ok) setFormFields(await res.json());
      else setFormFields([]);
    }
  }

  async function submitApply() {
    if (!applyingRecruit?.recruit) return;
    setSubmittingApply(true);
    setApplyError("");
    try {
      const res = await fetch(`/api/growth/recruits/${applyingRecruit.recruit.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: applyAnswers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApplyError(data.error ?? "신청 중 오류가 발생했습니다");
        return;
      }
      setApplyingRecruit(null);
      fetchMessages(currentRoomId);
    } finally {
      setSubmittingApply(false);
    }
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
    : "신입 채팅방";

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
            <Hash size={11} /> 신입 채팅방
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

      {/* 건의사항 안내 배너 */}
      <div className="px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-100 shrink-0">
        <Link
          href="/growth/suggestions"
          className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 hover:text-amber-800 transition-colors"
        >
          <Lightbulb size={12} />
          버그 신고나 건의사항은 채팅 대신 <span className="underline">건의사항 게시판</span>에 남겨주세요
        </Link>
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
                {msg.kind === "recruit" && msg.recruit ? (
                  <RecruitCard
                    msg={msg}
                    currentUserId={user.id}
                    onToggleSignup={toggleSignup}
                    onApply={openApplyModal}
                  />
                ) : (
                  <ChatBubble
                    msg={msg}
                    isMe={isMe}
                    currentUserId={user.id}
                    onReact={toggleReaction}
                  />
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 py-3 bg-white border-t border-gray-200 shrink-0">
        <form onSubmit={sendMessage} className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowRecruitModal(true)}
            title="모집 시작"
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl border border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <Megaphone size={16} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              saveDraft(currentRoomId, e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              // Shift+Enter: 줄바꿈, Enter: 전송 (한글 IME 조합 확정 중 Enter는 무시)
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="팀원들에게 메시지... (Shift+Enter로 줄바꿈)"
            rows={1}
            className="flex-1 px-4 py-2.5 text-sm border rounded-2xl focus:outline-none bg-gray-50 border-gray-200 focus:border-indigo-400 resize-none leading-relaxed max-h-[120px] overflow-y-auto"
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

      {/* 모집 시작 모달 */}
      {showRecruitModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowRecruitModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Megaphone size={16} className="text-amber-500" /> 모집 시작하기
              </h3>
              <button onClick={() => setShowRecruitModal(false)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 -mt-2 mb-4">
              채팅방에 올라갈 모집 안내예요. 참여자를 다 모은 뒤 &ldquo;신청하기&rdquo;를 누르면 담당자용 상세 신청서를 별도로 작성하게 됩니다.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">모집 제목 *</label>
                <input
                  autoFocus
                  value={recruitTitle}
                  onChange={(e) => setRecruitTitle(e.target.value)}
                  placeholder="예: 사내 독서모임 같이 하실 분 모집!"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">참여자에게 보여줄 소개 (선택)</label>
                <textarea
                  value={recruitDescription}
                  onChange={(e) => setRecruitDescription(e.target.value)}
                  rows={3}
                  placeholder="어떤 모임인지, 무엇을 함께 하고 싶은지 간단히 적어주세요"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">목표 인원 (선택)</label>
                <input
                  type="number"
                  min={1}
                  value={recruitTargetCount}
                  onChange={(e) => setRecruitTargetCount(e.target.value)}
                  placeholder="예: 5"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                onClick={handleCreateRecruit}
                disabled={!recruitTitle.trim() || creatingRecruit}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {creatingRecruit ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
                모집 시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신청 모달 */}
      {applyingRecruit?.recruit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setApplyingRecruit(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <ClipboardCheck size={16} className="text-indigo-500" /> 신청서 작성
              </h3>
              <button onClick={() => setApplyingRecruit(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              &ldquo;{applyingRecruit.recruit.title}&rdquo; 모집의 상세 신청서예요. 담당자가 정한 항목을 작성해 제출하면 승인 검토가 시작됩니다.
            </p>

            {formFields === null ? (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-gray-300" /></div>
            ) : formFields.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">아직 관리자가 신청 양식을 설정하지 않았습니다. 바로 제출할 수 있습니다.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {formFields.map((f) => (
                  <div key={f.id}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {f.label} {f.required && <span className="text-red-400">*</span>}
                    </label>
                    {f.field_type === "textarea" ? (
                      <textarea
                        rows={3}
                        value={applyAnswers[f.id] ?? ""}
                        onChange={(e) => setApplyAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 resize-none"
                      />
                    ) : f.field_type === "select" ? (
                      <select
                        value={applyAnswers[f.id] ?? ""}
                        onChange={(e) => setApplyAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
                      >
                        <option value="">선택해주세요</option>
                        {(f.options ?? []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : f.field_type === "date_range" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={(applyAnswers[f.id] ?? "").split("~")[0] ?? ""}
                          onChange={(e) => {
                            const end = (applyAnswers[f.id] ?? "").split("~")[1] ?? "";
                            setApplyAnswers((prev) => ({ ...prev, [f.id]: `${e.target.value}~${end}` }));
                          }}
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
                        />
                        <span className="text-gray-400 text-xs">~</span>
                        <input
                          type="date"
                          value={(applyAnswers[f.id] ?? "").split("~")[1] ?? ""}
                          onChange={(e) => {
                            const start = (applyAnswers[f.id] ?? "").split("~")[0] ?? "";
                            setApplyAnswers((prev) => ({ ...prev, [f.id]: `${start}~${e.target.value}` }));
                          }}
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    ) : (
                      <input
                        type={f.field_type === "date" ? "date" : f.field_type === "number" ? "number" : "text"}
                        value={applyAnswers[f.id] ?? ""}
                        onChange={(e) => setApplyAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {applyError && <p className="text-xs text-red-500 mb-3">{applyError}</p>}

            <button
              onClick={submitApply}
              disabled={submittingApply || formFields === null}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {submittingApply ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
              담당자에게 신청하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Recruit card ─────────────────────────────────────────────────────────── */

function RecruitCard({
  msg,
  currentUserId,
  onToggleSignup,
  onApply,
}: {
  msg: ChatMessage;
  currentUserId: string;
  onToggleSignup: (messageId: string) => void;
  onApply: (msg: ChatMessage) => void;
}) {
  const recruit = msg.recruit!;
  const participants = msg.signups ?? [];
  const isOrganizer = recruit.organizer_id === currentUserId;
  const joined = participants.some((p) => p.user_id === currentUserId);

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] w-full sm:w-auto sm:min-w-[320px] bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Megaphone size={13} className="text-amber-500" />
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">모집</span>
          <span className="text-[10px] text-gray-400 ml-auto">{msg.sender_name}</span>
        </div>
        <p className="text-sm font-bold text-gray-900 mb-1">{recruit.title}</p>
        {recruit.description && (
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed mb-2">{recruit.description}</p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <Users size={12} />
          <span>
            참여 {participants.length}명{recruit.target_count ? ` / 목표 ${recruit.target_count}명` : ""}
          </span>
        </div>
        {participants.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {participants.map((p) => (
              <span key={p.user_id} className="text-[10px] bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                {p.display_name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {recruit.status === "open" && !isOrganizer && (
            <button
              onClick={() => onToggleSignup(msg.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                joined
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-white border border-amber-300 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <Check size={12} /> {joined ? "참여중" : "참여하기"}
            </button>
          )}
          {isOrganizer && recruit.status === "open" && (
            <button
              onClick={() => onApply(msg)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <ClipboardCheck size={12} /> 신청하기
            </button>
          )}
          {recruit.status !== "open" && (
            <span
              className={`flex-1 text-center py-2 rounded-xl text-xs font-semibold ${
                recruit.status === "approved"
                  ? "bg-emerald-100 text-emerald-700"
                  : recruit.status === "rejected"
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {RECRUIT_STATUS_LABEL[recruit.status]}
            </span>
          )}
        </div>
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

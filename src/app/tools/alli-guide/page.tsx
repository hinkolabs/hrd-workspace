"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Send,
  Loader2,
  BookOpen,
  RotateCcw,
  User,
  Sparkles,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED = [
  "Alli Works에서 대화형 앱이란 무엇인가요?",
  "답변 생성 노드 설정 방법을 알려주세요",
  "Q&A 지식베이스에 문서를 업로드하는 방법은?",
  "조건 추가 노드로 분기를 만드는 방법은?",
  "담당 멤버 연결 노드는 어떻게 설정하나요?",
  "에이전트형 앱과 대화형 앱의 차이는?",
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isUser ? "bg-indigo-500" : "bg-gray-700"
        }`}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <Bot size={14} className="text-indigo-300" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm prose-gray max-w-none prose-headings:text-gray-800 prose-headings:font-bold prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlliGuideChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const userText = text.trim();
      if (!userText || loading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/tools/alli-guide/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        const data = await res.json();
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.error
            ? `오류가 발생했습니다: ${data.error}`
            : data.answer,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [messages, loading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <BookOpen size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Alli Works 가이드 챗봇</h1>
            <p className="text-[11px] text-gray-400">가이드 문서 기반 AI 도우미</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw size={12} />
              새 대화
            </button>
          )}
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-700 font-medium">가이드 9개 연결됨</span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
            {/* Welcome */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">
                Alli Works에 대해 무엇이든 물어보세요
              </h2>
              <p className="text-sm text-gray-500 max-w-sm">
                노드 설정, 앱 생성, 지식베이스 관리 등 Alli Works 가이드 문서를 기반으로 답변드립니다
              </p>
            </div>

            {/* Suggested questions */}
            <div className="w-full max-w-lg">
              <p className="text-xs font-medium text-gray-400 mb-2 text-center">추천 질문</p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left text-sm text-gray-700 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-indigo-300" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin text-indigo-500" />
                    <span className="text-xs text-gray-400">가이드 검색 중...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Alli Works에 대해 질문하세요... (Enter 전송, Shift+Enter 줄바꿈)"
              rows={1}
              disabled={loading}
              className="w-full bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none disabled:opacity-50 max-h-32"
              style={{ minHeight: "44px" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              }}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            {loading ? (
              <Loader2 size={16} className="text-white animate-spin" />
            ) : (
              <Send size={16} className="text-white" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">
          Alli Works 공식 가이드 문서 기반 · AI 답변은 참고용입니다
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";

/**
 * Before sending HTML to the AI, replace all base64 data URLs with short
 * placeholders (__B64_0__, __B64_1__, ...). This dramatically reduces the
 * payload size so the request stays well under Next.js's body limit.
 * Call restoreBase64 on the AI response to put the images back.
 */
function stripBase64DataUrls(html: string): { stripped: string; map: [string, string][] } {
  const map: [string, string][] = [];
  const stripped = html.replace(/data:[^;]+;base64,[^"')>\s]+/g, (match) => {
    const id = `__B64_${map.length}__`;
    map.push([id, match]);
    return id;
  });
  return { stripped, map };
}

function restoreBase64DataUrls(html: string, map: [string, string][]): string {
  let result = html;
  for (const [id, original] of map) {
    result = result.split(id).join(original);
  }
  return result;
}

function stripCodeFences(raw: string): string {
  let code = raw
    .replace(/^```(?:typescript|tsx|jsx|js|react|)\r?\n?/i, "")
    .replace(/\r?\n?```\s*$/m, "")
    .trim();

  // Normalize "use client" directive to always use double quotes
  code = code.replace(
    /^['"`]?use client['"`]?\s*;?/,
    '"use client";'
  );

  // Fix deprecated <Link><a> pattern → <Link> directly (Next.js 13+)
  code = code.replace(
    /<Link(\s[^>]*)>\s*<a([^>]*)>([\s\S]*?)<\/a>\s*<\/Link>/g,
    (_, linkProps, aProps, children) => {
      const merged = (linkProps + aProps).replace(/\s+/g, " ").trim();
      return `<Link ${merged}>${children}</Link>`;
    }
  );

  return code;
}

type Message = { role: "user" | "assistant"; text: string };

type Props = {
  code: string;
  onCodeChange: (code: string) => void;
  onSaveVersion?: (editedCode: string) => Promise<void>;
  /** When true, the current page is a raw HTML base — AI will convert to React */
  isHtmlPage?: boolean;
  disabled?: boolean;
};

export default function ChatPanel({ code, onCodeChange, onSaveVersion, isHtmlPage, disabled }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: '페이지가 로드됐습니다. AI에게 UI 수정을 요청해보세요.\n\n예시:\n• "헤더 배경색을 파란색으로 바꿔줘"\n• "수강신청 버튼을 더 크게 만들어줘"\n• "팝업이 열릴 때 애니메이션 추가해줘"',
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // When switching to an HTML page, update the welcome message
  useEffect(() => {
    if (isHtmlPage) {
      setMessages([{
        role: "assistant",
        text: '원본 HTML이 로드됐습니다. AI 채팅으로 HTML을 직접 수정합니다.\n\n원본 레이아웃을 그대로 유지하면서 요청한 부분만 변경됩니다.\n\n예시:\n• "로그인 버튼 색을 파란색으로 바꿔줘"\n• "제목 폰트를 더 크게 해줘"\n• "왼쪽 이미지 영역 배경을 어둡게 해줘"\n• "비밀번호 초기화 링크를 빨간색으로 바꿔줘"\n\n수정된 버전은 _1, _2 형태로 저장됩니다.',
      }]);
    }
  }, [isHtmlPage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || streaming || !code) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setStreaming(true);

    try {
      if (isHtmlPage) {
        await handleHtmlEdit(userMsg);
      } else {
        await handleTsxEdit(userMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류 발생";
      setMessages((prev) => [...prev, { role: "assistant", text: `오류: ${msg}` }]);
    } finally {
      setStreaming(false);
    }
  }

  /**
   * HTML edit: strip base64 → send to AI → get JSON search-replace diff →
   * apply to stripped HTML → restore base64 → save versioned HTML.
   * This avoids sending/receiving the full HTML and bypasses max_tokens limits.
   */
  async function handleHtmlEdit(userMsg: string) {
    const { stripped, map: b64Map } = stripBase64DataUrls(code);

    setMessages((prev) => [...prev, { role: "assistant", text: "HTML 수정 중..." }]);

    const res = await fetch("/api/ui-editor/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "edit-html", html: stripped, prompt: userMsg }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `서버 오류 ${res.status}`);
    }

    type Patch = { find: string; replace: string };
    const patches: Patch[] = await res.json().catch(() => []);

    if (!Array.isArray(patches) || patches.length === 0) {
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", text: "변경할 내용을 찾지 못했습니다. 더 구체적으로 요청해 주세요." };
        return u;
      });
      return;
    }

    // Apply each search-replace patch to the stripped HTML
    let modifiedHtml = stripped;
    let applied = 0;
    for (const { find, replace } of patches) {
      if (find && typeof find === "string" && modifiedHtml.includes(find)) {
        modifiedHtml = modifiedHtml.split(find).join(replace ?? "");
        applied++;
      }
    }

    if (applied === 0) {
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = {
          role: "assistant",
          text: `AI가 ${patches.length}개의 수정을 제안했지만 원본 HTML에서 해당 위치를 찾을 수 없었습니다.\n다른 방식으로 요청해 보세요.`,
        };
        return u;
      });
      return;
    }

    // Restore inlined base64 images
    const finalHtml = restoreBase64DataUrls(modifiedHtml, b64Map);
    onCodeChange(finalHtml);

    if (onSaveVersion) {
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", text: "저장 중..." };
        return u;
      });
      await onSaveVersion(finalHtml);
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = {
          role: "assistant",
          text: `완료! ${applied}곳이 수정됐습니다.\n좌측 목록에서 원본과 비교해보세요.`,
        };
        return u;
      });
    } else {
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = {
          role: "assistant",
          text: `${applied}곳이 수정됐습니다. 저장 버튼을 눌러 반영하세요.`,
        };
        return u;
      });
    }
  }

  /** TSX component edit: streaming response updates the editor in real-time. */
  async function handleTsxEdit(userMsg: string) {
    const res = await fetch("/api/ui-editor/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "edit", code, prompt: userMsg }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "편집 실패");
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No stream");

    const decoder = new TextDecoder();
    let accumulated = "";

    setMessages((prev) => [...prev, { role: "assistant", text: "수정 중..." }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      onCodeChange(accumulated);
    }

    const cleanCode = stripCodeFences(accumulated);
    onCodeChange(cleanCode);

    if (onSaveVersion) {
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", text: "저장 중..." };
        return u;
      });
      await onSaveVersion(cleanCode);
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = {
          role: "assistant",
          text: "완료! 새 버전으로 저장됐습니다.\n좌측 목록에서 원본과 비교해보세요.",
        };
        return u;
      });
    } else {
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = {
          role: "assistant",
          text: "완료! 코드가 업데이트됐습니다.\n저장 버튼을 눌러 파일에 반영하세요.",
        };
        return u;
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const placeholder = isHtmlPage
    ? "HTML 수정 요청을 입력하세요 (예: 로그인 버튼 색을 파란색으로)"
    : "UI 수정 요청을 입력하세요...";

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-indigo-500" />
          <span className="text-xs font-semibold text-gray-700">
            {isHtmlPage ? "AI HTML 수정 채팅" : "AI UI 수정 채팅"}
          </span>
          {isHtmlPage && (
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
              HTML 직접 수정
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                msg.role === "assistant"
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {msg.role === "assistant" ? <Bot size={12} /> : <User size={12} />}
            </div>
            <div
              className={`max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === "assistant"
                  ? "bg-gray-100 text-gray-700"
                  : "bg-indigo-600 text-white"
              }`}
            >
              {msg.text}
              {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                <span className="inline-block w-1 h-3 bg-indigo-400 ml-0.5 animate-pulse rounded-sm" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-100 shrink-0">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={2}
            disabled={streaming || disabled || !code}
            className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none resize-none bg-gray-50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming || disabled || !code}
            className="px-3 self-end py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Enter 전송 · Shift+Enter 줄바꿈</p>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { Upload, Link, Loader2, Globe, Bookmark, ChevronRight, Copy, Check } from "lucide-react";

type Props = {
  onGenerate: (screenshot: string | null, html: string, pageName: string) => void;
};

function extractPageName(rawUrl: string): string {
  try {
    const { pathname } = new URL(rawUrl);
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    return last.replace(/\.[a-z]+$/i, "") || "page";
  } catch {
    return "";
  }
}

/** The one-liner the user saves as a bookmark */
const BOOKMARKLET_CODE =
  `javascript:void((function(){var s=document.createElement('script');s.src='http://localhost:3000/capture.js?t='+Date.now();document.head.appendChild(s)})())`;

export default function UploadPanel({ onGenerate }: Props) {
  const [tab, setTab] = useState<"bookmarklet" | "crawl">("bookmarklet");
  const [copied, setCopied] = useState(false);

  // Crawl tab state
  const [url, setUrl] = useState("");
  const [pageName, setPageName] = useState("");
  const [pageNameManuallyEdited, setPageNameManuallyEdited] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCopy() {
    navigator.clipboard.writeText(BOOKMARKLET_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    setPreviewName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCrawl() {
    if (!url.trim() || !pageName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const crawlRes = await fetch("/api/ui-editor/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!crawlRes.ok) {
        const data = await crawlRes.json();
        throw new Error(data.error ?? "크롤링 실패");
      }
      const { html } = await crawlRes.json();
      onGenerate(screenshot, html, pageName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 max-w-xl mx-auto w-full">
      {/* Tab switcher */}
      <div className="w-full flex rounded-xl border border-gray-200 overflow-hidden mb-6 shrink-0">
        <button
          onClick={() => setTab("bookmarklet")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            tab === "bookmarklet"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Bookmark size={14} />
          북마클릿 캡처
          {tab === "bookmarklet" && (
            <span className="ml-1 text-xs bg-indigo-500 px-1.5 py-0.5 rounded-full">추천</span>
          )}
        </button>
        <button
          onClick={() => setTab("crawl")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            tab === "crawl"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Globe size={14} />
          URL 크롤링
        </button>
      </div>

      {tab === "bookmarklet" ? (
        <BookmarkletTab copied={copied} onCopy={handleCopy} />
      ) : (
        <CrawlTab
          url={url}
          setUrl={setUrl}
          pageName={pageName}
          setPageName={setPageName}
          pageNameManuallyEdited={pageNameManuallyEdited}
          setPageNameManuallyEdited={setPageNameManuallyEdited}
          screenshot={screenshot}
          previewName={previewName}
          loading={loading}
          error={error}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onDrop={handleDrop}
          onStart={handleCrawl}
          extractPageName={extractPageName}
        />
      )}
    </div>
  );
}

// ─── Bookmarklet Tab ──────────────────────────────────────────────────────────

function BookmarkletTab({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  const BOOKMARKLET_CODE =
    `javascript:void((function(){var s=document.createElement('script');s.src='http://localhost:3000/capture.js?t='+Date.now();document.head.appendChild(s)})())`;

  return (
    <div className="w-full space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Bookmark size={24} className="text-indigo-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">북마클릿으로 캡처</h2>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
          실제 브라우저에서 렌더링된 화면을 그대로 캡처합니다.<br />
          로그인 페이지, 팝업, 모달까지 완벽하게 동작합니다.
        </p>
      </div>

      {/* Step 1 */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">1</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 mb-2">북마클릿을 즐겨찾기 바에 추가</p>
            <p className="text-xs text-gray-500 mb-3">
              아래 코드를 복사한 뒤, 브라우저 북마크에 새 북마크를 만들고 URL 자리에 붙여넣으세요.
            </p>
            {/* Drag target */}
            <a
              href={BOOKMARKLET_CODE}
              onClick={(e) => e.preventDefault()}
              draggable
              className="block w-full text-center py-2 px-4 bg-indigo-600 text-white text-xs font-semibold rounded-lg cursor-grab active:cursor-grabbing select-none border-2 border-dashed border-indigo-400 hover:bg-indigo-700 transition-colors"
              title="즐겨찾기 바로 드래그하세요"
            >
              🔖 &nbsp;HRD 캡처 &nbsp;← 여기를 즐겨찾기 바로 드래그
            </a>
            <div className="flex gap-2 mt-2">
              <code className="flex-1 block text-[10px] bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                {BOOKMARKLET_CODE}
              </code>
              <button
                onClick={onCopy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">2</span>
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">캡처할 페이지로 이동</p>
            <p className="text-xs text-gray-500">
              사이버학당 등 캡처하고 싶은 사이트로 이동합니다.<br />
              로그인이 필요하다면 먼저 로그인하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">3</span>
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">북마클릿 클릭</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              즐겨찾기 바의 <strong>HRD 캡처</strong> 북마클릿을 클릭하면<br />
              현재 페이지 전체가 캡처되어 편집기가 자동으로 열립니다.
            </p>
          </div>
        </div>
      </div>

      {/* Advantages */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: "🔐", label: "로그인 페이지 캡처" },
          { icon: "💬", label: "팝업·모달 동작" },
          { icon: "🖼️", label: "이미지 완벽 로딩" },
          { icon: "🎨", label: "폰트·CSS 완전 보존" },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <span className="text-base">{icon}</span>
            <span className="text-xs font-medium text-emerald-700">{label}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-center text-gray-400">
        캡처 후 편집기가 자동으로 열립니다. AI 채팅으로 UI를 수정하세요.
      </p>
    </div>
  );
}

// ─── Crawl Tab ────────────────────────────────────────────────────────────────

function CrawlTab({
  url, setUrl, pageName, setPageName,
  pageNameManuallyEdited, setPageNameManuallyEdited,
  screenshot, previewName, loading, error,
  fileInputRef, onFileChange, onDrop, onStart, extractPageName,
}: {
  url: string; setUrl: (v: string) => void;
  pageName: string; setPageName: (v: string) => void;
  pageNameManuallyEdited: boolean; setPageNameManuallyEdited: (v: boolean) => void;
  screenshot: string | null; previewName: string | null;
  loading: boolean; error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onStart: () => void;
  extractPageName: (url: string) => string;
}) {
  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-2">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Globe size={20} className="text-gray-500" />
        </div>
        <h2 className="text-base font-bold text-gray-800">URL 크롤링</h2>
        <p className="text-xs text-gray-500 mt-1">
          공개 페이지를 서버에서 크롤링합니다. 로그인이 필요한 페이지는 북마클릿을 사용하세요.
        </p>
        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 w-fit mx-auto">
          <ChevronRight size={12} />
          팝업·모달은 북마클릿 방식에서만 동작합니다
        </div>
      </div>

      {/* 페이지 이름 */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1.5">
          페이지 이름 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          placeholder="예: main, courseList, loginForm"
          value={pageName}
          onChange={(e) => { setPageName(e.target.value); setPageNameManuallyEdited(true); }}
          onFocus={() => setPageNameManuallyEdited(true)}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none bg-gray-50"
        />
        <p className="text-xs text-gray-400 mt-1">
          원본: <span className="text-indigo-500">/clone/{pageName || "이름"}</span>
          {" · "}AI 수정 시 <span className="text-indigo-500">_1, _2</span> 버전 생성
        </p>
      </div>

      {/* URL */}
      <div className="relative">
        <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => {
            const v = e.target.value;
            setUrl(v);
            if (!pageNameManuallyEdited) {
              const extracted = extractPageName(v);
              if (extracted) setPageName(extracted);
            }
          }}
          className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none bg-gray-50"
        />
      </div>

      {/* 스크린샷 (선택) */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">
          스크린샷 <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
            screenshot ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
          }`}
        >
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          {screenshot ? (
            <div className="flex items-center justify-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshot} alt="preview" className="w-10 h-10 object-cover rounded-lg" />
              <div className="text-left">
                <p className="text-sm font-medium text-indigo-700">{previewName}</p>
                <p className="text-xs text-indigo-500">클릭하여 변경</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-1">
              <Upload size={14} />
              <span className="text-xs">드래그 또는 클릭</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={onStart}
        disabled={!url.trim() || !pageName.trim() || loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> 크롤링 중...</>
        ) : (
          <><Globe size={16} /> 원본 페이지 저장</>
        )}
      </button>
    </div>
  );
}

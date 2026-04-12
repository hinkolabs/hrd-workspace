"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Save, RotateCcw, ExternalLink, Loader2, RefreshCw, ChevronLeft, ChevronRight, Code2, ImageIcon, Upload, X, CheckCircle } from "lucide-react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import PageList from "@/components/ui-editor/page-list";
import UploadPanel from "@/components/ui-editor/upload-panel";
import CodePanel from "@/components/ui-editor/code-panel";
import ChatPanel from "@/components/ui-editor/chat-panel";

type ClonePage = { name: string; updatedAt: string | null; type: "html" | "tsx" };

export default function UiEditorPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    }>
      <UiEditorPage />
    </Suspense>
  );
}

function stripCodeFences(raw: string): string {
  let code = raw
    .replace(/^```(?:typescript|tsx|jsx|js|react|)\r?\n?/i, "")
    .replace(/\r?\n?```\s*$/m, "")
    .trim();

  // Normalize "use client" directive: AI sometimes outputs single-quoted or
  // backtick-quoted versions, or omits the opening quote entirely.
  // Next.js Turbopack requires exactly: "use client";
  code = code.replace(
    /^['"`]?use client['"`]?\s*;?/,
    '"use client";'
  );

  // Fix deprecated <Link><a> pattern → <Link> directly (Next.js 13+)
  // Matches: <Link href="..."><a ...>text</a></Link>  →  <Link href="..." ...>text</Link>
  code = code.replace(
    /<Link(\s[^>]*)>\s*<a([^>]*)>([\s\S]*?)<\/a>\s*<\/Link>/g,
    (_, linkProps, aProps, children) => {
      // Merge className/style from <a> onto <Link>
      const merged = (linkProps + aProps).replace(/\s+/g, " ").trim();
      return `<Link ${merged}>${children}</Link>`;
    }
  );

  return code;
}

/** Floating panel to list and replace images in an HTML page */
function ImagePanel({
  code,
  saving,
  onReplace,
  onClose,
}: {
  code: string;
  saving: boolean;
  onReplace: (oldSrc: string, newDataUrl: string) => Promise<void>;
  onClose: () => void;
}) {
  const images = parseImages(code);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, oldSrc: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      await onReplace(oldSrc, dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="w-56 shrink-0 border-r border-amber-200 bg-amber-50 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-amber-200 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
          <ImageIcon size={12} />
          이미지 교체 ({images.length}개)
        </span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-amber-200 text-amber-600">
          <X size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {images.length === 0 ? (
          <p className="text-xs text-amber-600 text-center py-4">이미지가 없습니다</p>
        ) : (
          images.map((src, i) => (
            <div key={i} className="bg-white rounded-lg border border-amber-200 p-2">
              <div className="w-full h-16 bg-gray-100 rounded mb-2 overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`img-${i}`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <input
                ref={(el) => { fileRefs.current[i] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e, src)}
              />
              <button
                onClick={() => fileRefs.current[i]?.click()}
                disabled={saving}
                className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                <Upload size={11} />
                교체
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Extract image srcs from HTML (up to 20) */
function parseImages(html: string): string[] {
  const srcs: string[] = [];
  const re = /src="([^"]{1,2000})"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && srcs.length < 20) {
    const src = m[1];
    // Only include actual images (not tiny 1x1 tracking pixels or script srcs)
    if (
      src.startsWith("data:image/") ||
      /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(src)
    ) {
      srcs.push(src);
    }
  }
  return srcs;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function UiEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [pages, setPages] = useState<ClonePage[]>([]);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [savedCode, setSavedCode] = useState("");
  const [currentPageType, setCurrentPageType] = useState<"html" | "tsx">("tsx");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [captureToast, setCaptureToast] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isDirty = code !== savedCode && code !== "";

  const fetchPages = useCallback(async () => {
    const res = await fetch("/api/ui-editor/pages");
    if (res.ok) setPages(await res.json());
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  // Handle ?captured=<name> — auto-load the just-captured page and show a toast
  useEffect(() => {
    const captured = searchParams.get("captured");
    if (!captured) return;

    // Remove the query param from the URL without a page reload
    router.replace("/ui-editor", { scroll: false });

    // Wait for pages to be available, then load
    const tryLoad = async () => {
      await fetchPages();
      const res = await fetch(`/api/ui-editor/pages/${captured}`);
      if (res.ok) {
        const data = await res.json();
        setCode(data.code);
        setSavedCode(data.code);
        setSelectedPage(captured);
        setCurrentPageType(data.type ?? "html");
        setShowUpload(false);
        setCaptureToast(captured);
        setTimeout(() => setCaptureToast(null), 4000);
      }
    };

    tryLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPage(name: string) {
    const res = await fetch(`/api/ui-editor/pages/${name}`);
    if (res.ok) {
      const data = await res.json();
      setCode(data.code);
      setSavedCode(data.code);
      setSelectedPage(name);
      setCurrentPageType(data.type ?? "tsx");
    }
  }

  /** Given a base name like "loginForm", returns the next unused versioned name:
   *  e.g. loginForm_1 if none exist, loginForm_2 if loginForm_1 exists, etc.
   *  Used only when saving AI-edited versions, NOT on initial page creation. */
  async function resolveVersionedName(base: string): Promise<string> {
    const res = await fetch(`/api/ui-editor/pages?base=${encodeURIComponent(base)}`);
    if (!res.ok) return `${base}_1`;
    const existing: { name: string }[] = await res.json();
    const nums = existing
      .map((p) => {
        const m = p.name.match(new RegExp(`^${base}_(\\d+)$`));
        return m ? parseInt(m[1], 10) : null;
      })
      .filter((n): n is number => n !== null);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${base}_${next}`;
  }

  /** Extract the base name from a page name (strips _N suffix if present).
   *  "loginForm_2" → "loginForm", "loginForm" → "loginForm" */
  function extractBaseName(name: string): string {
    return name.replace(/_\d+$/, "");
  }

  /** Called by ChatPanel when an AI edit completes.
   *  Saves the edited code as a NEW versioned page (e.g. loginForm_1, loginForm_2).
   *  HTML pages stay as HTML — TSX pages stay as TSX.
   *  This preserves the original for side-by-side comparison. */
  async function handleEditSaveVersion(editedCode: string) {
    if (!selectedPage) return;
    const base = extractBaseName(selectedPage);
    const versionedName = await resolveVersionedName(base);
    await savePage(versionedName, editedCode, currentPageType);
    setSelectedPage(versionedName);
    setCode(editedCode);
    setSavedCode(editedCode);
    // Type stays the same as the source page
    await fetchPages();
  }

  /** Direct HTML save — no AI generation.
   *  Crawled HTML is saved as-is for 100% fidelity base pages.
   *  AI versions are created later via the chat panel. */
  async function handleGenerate(screenshot: string | null, html: string, pageName: string) {
    setGenerating(true);
    setShowUpload(false);
    setCode(html);
    setSavedCode("");
    setSelectedPage(pageName);
    setCurrentPageType("html");

    try {
      await savePage(pageName, html, "html");
      setSavedCode(html);
      await fetchPages();
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장 중 오류 발생");
      setSelectedPage(null);
      setCode("");
      setCurrentPageType("tsx");
    } finally {
      setGenerating(false);
    }

    // Store screenshot in sessionStorage for this page so ChatPanel can use it
    // for higher-quality AI generation (optional — ephemeral)
    if (screenshot) {
      try { sessionStorage.setItem(`screenshot:${pageName}`, screenshot); } catch { /* ignore */ }
    }
  }

  async function savePage(name: string, codeToSave?: string, typeOverride?: "html" | "tsx") {
    setSaving(true);
    const saveType = typeOverride ?? currentPageType;
    // Strip code fences for TSX files; save HTML verbatim
    const target = saveType === "tsx"
      ? stripCodeFences(codeToSave ?? code)
      : (codeToSave ?? code);
    const res = await fetch(`/api/ui-editor/pages/${name}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: target, type: saveType }),
    });
    if (res.ok) {
      setSavedCode(target);
      setPreviewKey((k) => k + 1);
      await fetchPages();
    }
    setSaving(false);
  }

  async function deletePage(name: string) {
    await fetch(`/api/ui-editor/pages/${name}`, { method: "DELETE" });
    if (selectedPage === name) {
      setSelectedPage(null);
      setCode("");
      setSavedCode("");
      setCurrentPageType("tsx");
    }
    await fetchPages();
  }

  function refreshPreview() {
    setPreviewKey((k) => k + 1);
  }

  /** Replace one image src in the HTML code and immediately persist it. */
  async function handleReplaceImage(oldSrc: string, newDataUrl: string) {
    // Use exact string replacement to handle both plain URLs and long data URLs
    const escaped = escapeRegex(oldSrc);
    const newCode = code.replace(
      new RegExp(`src="${escaped}"`, "g"),
      `src="${newDataUrl}"`
    );
    setCode(newCode);
    await savePage(selectedPage!, newCode, "html");
  }

  // HTML base pages are served via a dedicated API route that returns raw HTML.
  // TSX pages use the Next.js clone route.
  const previewUrl = selectedPage
    ? currentPageType === "html"
      ? `/api/ui-editor/html-preview/${selectedPage}`
      : `/clone/${selectedPage}`
    : null;

  const codePanelLabel = currentPageType === "html" ? "원본 HTML" : "컴포넌트 코드 (TSX)";

  return (
    <div className="h-full flex flex-col">
      {/* 북마클릿 캡처 완료 토스트 */}
      {captureToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-xl animate-in slide-in-from-top-2 duration-300">
          <CheckCircle size={18} />
          <div>
            <p className="text-sm font-semibold">캡처 완료!</p>
            <p className="text-xs opacity-80">&apos;{captureToast}&apos; 페이지가 저장되었습니다</p>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="px-5 py-3.5 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">사이버학당 UI 편집기</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            원본 페이지를 저장하고 AI로 React 버전을 생성합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedPage && (
            <>
              <button
                onClick={() => setShowCode((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                  showCode
                    ? "bg-indigo-50 border-indigo-300 text-indigo-600"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Code2 size={13} />
                {currentPageType === "html" ? "HTML" : "코드"}
                {showCode ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
              </button>
              {currentPageType === "html" && (
                <button
                  onClick={() => setShowImagePanel((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                    showImagePanel
                      ? "bg-amber-50 border-amber-300 text-amber-600"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <ImageIcon size={13} />
                  이미지 교체
                </button>
              )}
              <button
                onClick={refreshPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={13} />
                새로고침
              </button>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink size={13} />
                  새 탭
                </a>
              )}
              {isDirty && (
                <button
                  onClick={() => savePage(selectedPage!)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors font-medium"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  저장
                </button>
              )}
              <button
                onClick={() => { setSelectedPage(null); setCode(""); setSavedCode(""); setShowUpload(false); setCurrentPageType("tsx"); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                title="닫기"
              >
                <RotateCcw size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 min-h-0 flex">
        {/* 좌측 페이지 목록 */}
        <PageList
          pages={pages}
          selectedPage={selectedPage}
          onSelect={loadPage}
          onDelete={deletePage}
          onNewPage={() => { setShowUpload(true); setSelectedPage(null); setCode(""); setCurrentPageType("tsx"); }}
        />

        {/* 우측 메인 영역 */}
        <div className="flex-1 min-w-0">
          {showUpload ? (
            <UploadPanel onGenerate={handleGenerate} />
          ) : generating ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
              <div className="text-center">
                <p className="font-medium">원본 페이지를 저장하는 중...</p>
                <p className="text-sm text-gray-400 mt-1">이미지와 스타일을 함께 저장합니다</p>
              </div>
            </div>
          ) : !selectedPage ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <ExternalLink size={24} className="text-gray-300" />
              </div>
              <div>
                <p className="font-medium text-gray-500">페이지를 선택하거나 새로 만드세요</p>
                <p className="text-sm mt-1">좌측 목록에서 선택하거나 + 버튼을 누르세요</p>
              </div>
            </div>
          ) : (
            /* 3패널 에디터 */
            <PanelGroup orientation="vertical" className="h-full">
              <Panel defaultSize={65} minSize={30}>
                <div className="h-full flex">
                  {/* 이미지 교체 패널 (HTML 페이지 전용) */}
                  {showImagePanel && currentPageType === "html" && (
                    <ImagePanel
                      code={code}
                      saving={saving}
                      onReplace={handleReplaceImage}
                      onClose={() => setShowImagePanel(false)}
                    />
                  )}

                  {/* 미리보기 */}
                  <div className={`flex flex-col min-w-0 transition-all duration-300 ${showCode ? "flex-1" : "flex-1"}`}>
                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 flex items-center justify-between">
                      <span>미리보기</span>
                      {currentPageType === "html" && (
                        <span className="text-emerald-600 font-normal normal-case flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          원본 HTML (100% 동일)
                        </span>
                      )}
                      {isDirty && currentPageType === "tsx" && (
                        <span className="text-amber-500 font-normal normal-case">
                          저장 후 반영됩니다
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-h-0">
                      {previewUrl ? (
                        <iframe
                          ref={iframeRef}
                          key={previewKey}
                          src={previewUrl}
                          className="w-full h-full border-0"
                          title="클론 페이지 미리보기"
                        />
                      ) : null}
                    </div>
                  </div>

                  {/* 코드 에디터 - 토글 */}
                  <div
                    className={`flex flex-col border-l border-gray-200 transition-all duration-300 overflow-hidden ${
                      showCode ? "w-[480px] min-w-[320px]" : "w-0"
                    }`}
                  >
                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 flex items-center justify-between whitespace-nowrap">
                      <span>{codePanelLabel}</span>
                    </div>
                    <div className="flex-1 min-h-0 min-w-[320px]">
                      <CodePanel code={code} onChange={setCode} />
                    </div>
                  </div>
                </div>
              </Panel>
              <PanelResizeHandle className="h-1 bg-gray-200 hover:bg-indigo-400 transition-colors cursor-row-resize" />
              {/* AI 채팅 */}
              <Panel defaultSize={35} minSize={15}>
                <div className="h-full border-t border-gray-200">
                  <ChatPanel
                    code={code}
                    onCodeChange={setCode}
                    onSaveVersion={handleEditSaveVersion}
                    isHtmlPage={currentPageType === "html"}
                  />
                </div>
              </Panel>
            </PanelGroup>
          )}
        </div>
      </div>
    </div>
  );
}

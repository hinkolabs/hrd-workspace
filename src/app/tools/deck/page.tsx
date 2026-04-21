"use client";

import { useState, useRef } from "react";
import type { DeckOutline, SlotDeck, SlideSlot } from "@/lib/deck/types";
import { DeckViewer } from "@/components/deck/DeckViewer";
import {
  Loader2, Sparkles, ChevronRight, Save,
  RotateCcw, Pencil, Check, X, Upload, Wand2,
  FileUp, FileText, PenLine,
} from "lucide-react";
import { COLORS } from "@/lib/deck/design-tokens";

// ─── Step state machine ───────────────────────────────────────────────────────
type Step = "input" | "parsing" | "analyzing" | "outline" | "composing" | "preview" | "saving";
type InputMode = "topic" | "document" | "pptx";

// PPT 파싱 결과 미리보기
interface ParsedPptPreview {
  slideCount: number;
  promptText: string;
  slides: Array<{ index: number; imageCount: number; text: string }>;
}

export default function DeckBuilderPage() {
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);

  // Input
  const [inputMode, setInputMode] = useState<InputMode>("topic");
  const [topic, setTopic] = useState("");
  const [document, setDocument] = useState("");
  const [slideCount, setSlideCount] = useState(10);

  // PPT upload state
  const [pptxFile, setPptxFile] = useState<File | null>(null);
  const [pptxPreview, setPptxPreview] = useState<ParsedPptPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Pipeline data
  const [outline, setOutline] = useState<DeckOutline | null>(null);
  const [deck, setDeck] = useState<SlotDeck | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Inline outline editing
  const [editingSection, setEditingSection] = useState<number | null>(null);

  const textFileRef = useRef<HTMLInputElement>(null);
  const pptxFileRef = useRef<HTMLInputElement>(null);

  // ── PPT Upload & Parse ───────────────────────────────────────────────────────
  async function handlePptxFile(file: File) {
    if (!file.name.endsWith(".pptx")) {
      setError(".pptx 파일만 지원합니다.");
      return;
    }
    setPptxFile(file);
    setError(null);
    setStep("parsing");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/deck/parse-pptx", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error);
      const data: ParsedPptPreview = await res.json();
      setPptxPreview(data);
      setStep("input");
    } catch (e) {
      setError(String(e));
      setPptxFile(null);
      setStep("input");
    }
  }

  function handlePptxInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handlePptxFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePptxFile(file);
  }

  // ── Step 1: Analyze ─────────────────────────────────────────────────────────
  async function handleAnalyze() {
    setError(null);
    setStep("analyzing");
    try {
      const body: Record<string, unknown> = { slideCount };
      if (inputMode === "topic") {
        body.topic = topic;
      } else if (inputMode === "document") {
        body.documentText = document;
      } else if (inputMode === "pptx" && pptxPreview) {
        body.documentText = pptxPreview.promptText;
        body.isPptx = true;
        body.slideCount = pptxPreview.slideCount; // preserve original count
      }

      const res = await fetch("/api/deck/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data: DeckOutline = await res.json();
      setOutline(data);
      setStep("outline");
    } catch (e) {
      setError(String(e));
      setStep("input");
    }
  }

  // ── Step 2: Compose ─────────────────────────────────────────────────────────
  async function handleCompose(enrichIcons = true) {
    if (!outline) return;
    setError(null);
    setStep("composing");
    try {
      const res = await fetch("/api/deck/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline, enrichIcons }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data: SlotDeck = await res.json();
      setDeck(data);
      setStep("preview");
    } catch (e) {
      setError(String(e));
      setStep("outline");
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!deck) return;
    setStep("saving");
    try {
      const res = await fetch("/api/deck/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { id } = await res.json();
      setSavedId(id);
      setStep("preview");
    } catch (e) {
      setError(String(e));
      setStep("preview");
    }
  }

  // ── Text file upload ─────────────────────────────────────────────────────────
  function handleTextFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDocument(ev.target?.result as string);
      setInputMode("document");
    };
    reader.readAsText(file, "utf-8");
  }

  // ── Outline section edit ────────────────────────────────────────────────────
  function updateOutlineSection(i: number, patch: Partial<DeckOutline["sections"][0]>) {
    if (!outline) return;
    const sections = [...outline.sections];
    sections[i] = { ...sections[i], ...patch };
    setOutline({ ...outline, sections });
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const canGenerate = (() => {
    if (step === "analyzing" || step === "parsing") return false;
    if (inputMode === "topic") return topic.trim().length > 0;
    if (inputMode === "document") return document.trim().length > 0;
    if (inputMode === "pptx") return !!pptxPreview;
    return false;
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  // Preview step — delegate to DeckViewer
  if (step === "preview" && deck) {
    return (
      <div className="flex flex-col min-h-screen">
        <div
          className="flex items-center gap-3 px-6 py-2 text-sm"
          style={{ backgroundColor: "#1a1a1a", borderBottom: "1px solid #333" }}
        >
          <button
            onClick={() => { setDeck(null); setStep("outline"); }}
            className="text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={13} /> 아웃라인 수정
          </button>
          <span className="text-white/20">|</span>
          <button
            onClick={() => handleCompose(true)}
            className="text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
          >
            <Wand2 size={13} /> 재생성
          </button>
          {!savedId ? (
            <>
              <span className="text-white/20">|</span>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1 rounded text-white text-[12px] transition-colors"
                style={{ backgroundColor: COLORS.primary }}
              >
                <Save size={13} /> 저장
              </button>
            </>
          ) : (
            <>
              <span className="text-white/20">|</span>
              <a
                href={`/deck/${savedId}`}
                target="_blank"
                className="flex items-center gap-1 text-white/50 hover:text-white/80 transition-colors"
              >
                <Check size={13} /> 저장됨 — 공유 링크
              </a>
              <a
                href={`/api/deck/${savedId}/pdf`}
                target="_blank"
                className="flex items-center gap-1 text-white/50 hover:text-white/80 transition-colors ml-2"
              >
                PDF 다운로드
              </a>
            </>
          )}
          {error && <span className="text-red-400 text-[12px]">{error}</span>}
        </div>
        <DeckViewer deck={deck} deckId={savedId ?? undefined} />
      </div>
    );
  }

  // ── Input / Outline / Loading states ────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0f172a" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Sparkles size={20} color="white" />
            </div>
            <h1 className="text-white text-[24px] font-bold">슬라이드 덱 만들기</h1>
          </div>
          <p className="text-white/50 text-[14px]">
            주제·문서·기존 PPT를 입력하면 일관된 디자인의 프레젠테이션을 자동으로 생성합니다.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-[13px] flex items-start gap-2">
            <X size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* ── STEP: input ─────────────────────────────────────────────────── */}
        {(step === "input" || step === "analyzing" || step === "parsing") && (
          <div className="space-y-5">
            {/* Mode toggle */}
            <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: "#1e293b" }}>
              {(
                [
                  { id: "topic" as InputMode, label: "주제 입력", icon: PenLine },
                  { id: "document" as InputMode, label: "문서 텍스트", icon: FileText },
                  { id: "pptx" as InputMode, label: "PPT 강화", icon: FileUp },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setInputMode(id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
                  style={{
                    backgroundColor: inputMode === id ? COLORS.primary : "transparent",
                    color: inputMode === id ? "white" : "rgba(255,255,255,0.4)",
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* ── topic ── */}
            {inputMode === "topic" && (
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: AI 기반 인재개발 전략 2026"
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-white text-[14px] resize-none outline-none border transition-colors"
                style={{
                  backgroundColor: "#1e293b",
                  borderColor: topic ? COLORS.primary : "#334155",
                  lineHeight: 1.6,
                }}
              />
            )}

            {/* ── document ── */}
            {inputMode === "document" && (
              <div className="space-y-3">
                <textarea
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="문서 내용을 여기에 붙여넣으세요..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl text-white text-[14px] resize-none outline-none border transition-colors"
                  style={{
                    backgroundColor: "#1e293b",
                    borderColor: document ? COLORS.primary : "#334155",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                />
                <button
                  onClick={() => textFileRef.current?.click()}
                  className="flex items-center gap-2 text-white/50 hover:text-white/80 text-[13px] transition-colors"
                >
                  <Upload size={14} /> 텍스트 파일 업로드 (.txt, .md)
                </button>
                <input
                  ref={textFileRef}
                  type="file"
                  accept=".txt,.md"
                  className="hidden"
                  onChange={handleTextFileUpload}
                />
              </div>
            )}

            {/* ── pptx ── */}
            {inputMode === "pptx" && (
              <div className="space-y-4">
                {/* Drop zone */}
                {!pptxPreview ? (
                  <div
                    className="relative rounded-2xl border-2 border-dashed transition-all cursor-pointer"
                    style={{
                      borderColor: isDragging ? COLORS.primary : "#334155",
                      backgroundColor: isDragging ? COLORS.primary + "10" : "#1e293b",
                    }}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => pptxFileRef.current?.click()}
                  >
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                      {step === "parsing" ? (
                        <>
                          <Loader2 size={32} className="animate-spin" style={{ color: COLORS.primary }} />
                          <p className="text-white/50 text-[13px]">PPT 파일 읽는 중...</p>
                        </>
                      ) : (
                        <>
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{ backgroundColor: COLORS.primary + "20" }}
                          >
                            <FileUp size={28} style={{ color: COLORS.primary }} />
                          </div>
                          <div className="text-center">
                            <p className="text-white font-semibold text-[15px]">
                              PPT 파일을 드래그하거나 클릭하세요
                            </p>
                            <p className="text-white/40 text-[12px] mt-1">.pptx 파일 지원</p>
                          </div>
                        </>
                      )}
                    </div>
                    <input
                      ref={pptxFileRef}
                      type="file"
                      accept=".pptx"
                      className="hidden"
                      onChange={handlePptxInputChange}
                    />
                  </div>
                ) : (
                  /* PPT preview card after parsing */
                  <div
                    className="rounded-2xl p-5 space-y-4"
                    style={{ backgroundColor: "#1e293b" }}
                  >
                    {/* File info header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: COLORS.primary + "20" }}
                        >
                          <FileUp size={20} style={{ color: COLORS.primary }} />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-[14px]">{pptxFile?.name}</p>
                          <p className="text-white/40 text-[12px]">
                            {pptxPreview.slideCount}개 슬라이드 파싱 완료
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setPptxFile(null);
                          setPptxPreview(null);
                          if (pptxFileRef.current) pptxFileRef.current.value = "";
                        }}
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Slide text preview */}
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {pptxPreview.slides.map((s) => (
                        <div
                          key={s.index}
                          className="flex items-start gap-3 px-3 py-2 rounded-lg"
                          style={{ backgroundColor: "#0f172a" }}
                        >
                          <span
                            className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: COLORS.primary + "25", color: COLORS.primary }}
                          >
                            {s.index}
                          </span>
                          <p className="text-white/60 text-[12px] leading-snug line-clamp-2">
                            {s.text || "(내용 없음)"}
                          </p>
                          {s.imageCount > 0 && (
                            <span className="shrink-0 text-white/30 text-[11px]">
                              🖼 {s.imageCount}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Re-upload button */}
                    <button
                      onClick={() => pptxFileRef.current?.click()}
                      className="text-white/40 hover:text-white/70 text-[12px] flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw size={12} /> 다른 파일 선택
                    </button>
                    <input
                      ref={pptxFileRef}
                      type="file"
                      accept=".pptx"
                      className="hidden"
                      onChange={handlePptxInputChange}
                    />
                  </div>
                )}

                {/* Tip */}
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ backgroundColor: COLORS.primary + "10", border: `1px solid ${COLORS.primary}30` }}
                >
                  <Sparkles size={14} style={{ color: COLORS.primary, marginTop: 2, flexShrink: 0 }} />
                  <p className="text-[12px] leading-relaxed" style={{ color: COLORS.primary + "cc" }}>
                    기존 PPT의 내용을 AI가 분석해 <strong style={{ color: COLORS.primary }}>새로운 디자인 시스템</strong>으로
                    재구성합니다. 텍스트·구조·핵심 메시지는 보존하되, 레이아웃·색상·타이포그래피를 완전히 새롭게 만듭니다.
                  </p>
                </div>
              </div>
            )}

            {/* Slide count (topic/document only, pptx uses original count) */}
            {inputMode !== "pptx" && (
              <div className="flex items-center gap-4">
                <label className="text-white/50 text-[13px] shrink-0">슬라이드 수</label>
                <div className="flex gap-2">
                  {[6, 8, 10, 12, 15].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSlideCount(n)}
                      className="w-9 h-9 rounded-lg text-[13px] font-medium transition-colors"
                      style={{
                        backgroundColor: slideCount === n ? COLORS.primary : "#1e293b",
                        color: slideCount === n ? "white" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PPT mode: slide count = original slide count */}
            {inputMode === "pptx" && pptxPreview && (
              <div className="flex items-center gap-3">
                <label className="text-white/50 text-[13px]">출력 슬라이드 수</label>
                <span className="text-white text-[13px] font-semibold">
                  원본 {pptxPreview.slideCount}장 기준 (자동)
                </span>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleAnalyze}
              disabled={!canGenerate || step === "analyzing"}
              className="w-full py-3 rounded-xl font-semibold text-white text-[15px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: COLORS.primary }}
            >
              {step === "analyzing" ? (
                <><Loader2 size={18} className="animate-spin" /> 내용 분석 중...</>
              ) : inputMode === "pptx" ? (
                <><Wand2 size={18} /> PPT 강화 시작</>
              ) : (
                <><Sparkles size={18} /> 슬라이드 생성 시작</>
              )}
            </button>
          </div>
        )}

        {/* ── STEP: outline ──────────────────────────────────────────────── */}
        {(step === "outline" || step === "composing") && outline && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-white font-bold text-[18px]">{outline.title}</h2>
                {outline.subtitle && (
                  <p className="text-white/40 text-[13px] mt-0.5">{outline.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setStep("input")}
                className="text-white/30 hover:text-white/60 text-[12px] flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} /> 다시 입력
              </button>
            </div>

            {/* Section list */}
            <div className="space-y-2">
              {outline.sections.map((section, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: "#1e293b" }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    onClick={() => setEditingSection(editingSection === i ? null : i)}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{
                          backgroundColor: COLORS.primary + "25",
                          color: COLORS.primary,
                        }}
                      >
                        {section.kind}
                      </span>
                      <span className="text-white text-[14px] font-medium">{section.heading}</span>
                    </div>
                    <Pencil size={13} className="text-white/30" />
                  </div>

                  {editingSection === i && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                      <input
                        value={section.heading}
                        onChange={(e) => updateOutlineSection(i, { heading: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-white text-[13px] outline-none"
                        style={{ backgroundColor: "#0f172a" }}
                        placeholder="섹션 제목"
                      />
                      {section.points.map((p, pi) => (
                        <div key={pi} className="flex items-center gap-2">
                          <span className="text-white/20 text-[11px] w-4 text-right">{pi + 1}</span>
                          <input
                            value={p}
                            onChange={(e) => {
                              const pts = [...section.points];
                              pts[pi] = e.target.value;
                              updateOutlineSection(i, { points: pts });
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg text-white text-[12px] outline-none"
                            style={{ backgroundColor: "#0f172a" }}
                          />
                        </div>
                      ))}
                      {section.emphasis && (
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 text-[11px] shrink-0">핵심</span>
                          <input
                            value={section.emphasis}
                            onChange={(e) => updateOutlineSection(i, { emphasis: e.target.value })}
                            className="flex-1 px-3 py-1.5 rounded-lg text-[12px] outline-none"
                            style={{ backgroundColor: "#0f172a", color: COLORS.primary }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Compose button */}
            <button
              onClick={() => handleCompose(true)}
              disabled={step === "composing"}
              className="w-full py-3 rounded-xl font-semibold text-white text-[15px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 mt-4"
              style={{ backgroundColor: COLORS.primary }}
            >
              {step === "composing" ? (
                <><Loader2 size={18} className="animate-spin" /> 슬라이드 구성 중...</>
              ) : (
                <><ChevronRight size={18} /> 슬라이드 만들기</>
              )}
            </button>
          </div>
        )}

        {/* ── STEP: saving ────────────────────────────────────────────────── */}
        {step === "saving" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin" style={{ color: COLORS.primary }} />
            <p className="text-white/50 text-[14px]">저장 중...</p>
          </div>
        )}
      </div>
    </div>
  );
}

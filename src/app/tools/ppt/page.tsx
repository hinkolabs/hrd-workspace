"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Database,
  Download,
  FileText,
  ImagePlus,
  Loader2,
  PenLine,
  Plus,
  Presentation,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2,
  X,
} from "lucide-react";
import type { PptPresentation, AnySlide, SlideTemplate } from "@/lib/ppt-builder";
import type { ThemeId } from "@/lib/ppt-themes";
import { PPT_THEMES } from "@/lib/ppt-themes";
import { PRESETS, DEFAULT_PRESET_ID } from "@/lib/ppt-presets";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "create" | "enhance";
type CreateSubMode = "topic" | "outline";
type PptType = "education" | "report" | "proposal" | "general";

interface OutlineSlide {
  title: string;
  keyPoints: string[];
  layout: AnySlide["layout"];
}

interface OutlineResult {
  presentationTitle: string;
  slides: OutlineSlide[];
}

interface ExistingItem {
  id: string;
  title: string;
  type: "report" | "estimate";
  created_at: string;
  content?: string;
  result?: unknown;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: { id: Mode; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "create",  label: "새로 만들기",   icon: Plus,  desc: "주제나 아웃라인으로 처음부터 생성" },
  { id: "enhance", label: "기존 자료 강화", icon: Wand2, desc: "문서·PPT·DB 데이터를 고퀄리티 PPT로" },
];

const PPT_TYPES: { id: PptType; label: string }[] = [
  { id: "education", label: "교육/강의" },
  { id: "report", label: "보고서/분석" },
  { id: "proposal", label: "제안서/기획서" },
  { id: "general", label: "범용" },
];

const LAYOUT_LABELS: Record<AnySlide["layout"], string> = {
  title: "표지",
  section: "섹션",
  content: "내용",
  two_column: "2단 비교",
  table: "표",
  closing: "마무리",
  agenda: "목차",
  grid: "카드그리드",
  process: "프로세스",
  timeline: "타임라인",
  comparison: "비교",
  stats: "KPI수치",
  quote: "인용문",
  pyramid: "피라미드",
  swot: "SWOT",
  highlight: "핵심메시지",
  scene: "자유디자인",
  hana_kpi: "하나 KPI",
  hana_timeline: "하나 실적",
  hana_divider: "하나 구분",
  hana_matrix: "하나 매트릭스",
  hana_org: "하나 조직도",
  chart_bar: "막대 차트",
  chart_pie: "파이 차트",
  chart_line: "라인 차트",
};

const LAYOUT_COLORS: Record<AnySlide["layout"], string> = {
  title: "bg-indigo-100 text-indigo-700",
  section: "bg-purple-100 text-purple-700",
  content: "bg-blue-100 text-blue-700",
  two_column: "bg-cyan-100 text-cyan-700",
  table: "bg-emerald-100 text-emerald-700",
  closing: "bg-rose-100 text-rose-700",
  agenda: "bg-violet-100 text-violet-700",
  grid: "bg-sky-100 text-sky-700",
  process: "bg-orange-100 text-orange-700",
  timeline: "bg-teal-100 text-teal-700",
  comparison: "bg-fuchsia-100 text-fuchsia-700",
  stats: "bg-amber-100 text-amber-700",
  quote: "bg-slate-100 text-slate-700",
  pyramid: "bg-lime-100 text-lime-700",
  swot: "bg-green-100 text-green-700",
  highlight: "bg-red-100 text-red-700",
  scene: "bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700",
  hana_kpi: "bg-teal-100 text-teal-700",
  hana_timeline: "bg-teal-50 text-teal-600",
  hana_divider: "bg-teal-200 text-teal-800",
  hana_matrix: "bg-teal-100 text-teal-700",
  hana_org: "bg-teal-50 text-teal-600",
  chart_bar: "bg-blue-100 text-blue-800",
  chart_pie: "bg-violet-100 text-violet-800",
  chart_line: "bg-cyan-100 text-cyan-800",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function OutlineEditor({
  outline,
  onChange,
}: {
  outline: OutlineResult;
  onChange: (updated: OutlineResult) => void;
}) {
  function updateSlide(index: number, field: keyof OutlineSlide, value: unknown) {
    const slides = [...outline.slides];
    slides[index] = { ...slides[index], [field]: value };
    onChange({ ...outline, slides });
  }

  function removeSlide(index: number) {
    if (outline.slides.length <= 3) return;
    const slides = outline.slides.filter((_, i) => i !== index);
    onChange({ ...outline, slides });
  }

  function moveSlide(index: number, direction: "up" | "down") {
    const slides = [...outline.slides];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= slides.length) return;
    [slides[index], slides[target]] = [slides[target], slides[index]];
    onChange({ ...outline, slides });
  }

  function addSlide(afterIndex: number) {
    const slides = [...outline.slides];
    slides.splice(afterIndex + 1, 0, {
      title: "새 슬라이드",
      keyPoints: ["내용을 입력하세요"],
      layout: "content",
    });
    onChange({ ...outline, slides });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">프레젠테이션 제목</label>
        <input
          type="text"
          value={outline.presentationTitle}
          onChange={(e) => onChange({ ...outline, presentationTitle: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-2">
        {outline.slides.map((slide, index) => (
          <div key={index} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-medium text-gray-500 shrink-0">#{index + 1}</span>
              <select
                value={slide.layout}
                onChange={(e) => updateSlide(index, "layout", e.target.value)}
                className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white"
              >
                {Object.entries(LAYOUT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <div className="flex-1" />
              <button
                onClick={() => moveSlide(index, "up")}
                disabled={index === 0}
                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => moveSlide(index, "down")}
                disabled={index === outline.slides.length - 1}
                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
              <button
                onClick={() => removeSlide(index)}
                disabled={outline.slides.length <= 3}
                className="p-0.5 text-gray-400 hover:text-red-500 disabled:opacity-30"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <input
                type="text"
                value={slide.title}
                onChange={(e) => updateSlide(index, "title", e.target.value)}
                placeholder="슬라이드 제목"
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <textarea
                value={slide.keyPoints.join("\n")}
                onChange={(e) =>
                  updateSlide(index, "keyPoints", e.target.value.split("\n").filter(Boolean))
                }
                placeholder="핵심 포인트 (줄 바꿈으로 구분)"
                rows={3}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={() => addSlide(index)}
              className="w-full py-1 text-xs text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1"
            >
              <Plus size={12} /> 슬라이드 추가
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Slide list item (text-only summary, no visual preview) ────────────────────

function summarizeSlideContent(slide: AnySlide): string {
  const s = slide as unknown as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof s.subtitle === "string" && s.subtitle.trim()) parts.push(s.subtitle as string);

  const asArr = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];

  const bullets = asArr(s.bullets);
  if (bullets.length) parts.push(`${bullets.length}개 bullet`);

  const items = asArr(s.items);
  if (items.length) parts.push(`${items.length}개 항목`);

  if (Array.isArray(s.steps)) parts.push(`${(s.steps as unknown[]).length}단계`);
  if (Array.isArray(s.events)) parts.push(`${(s.events as unknown[]).length}개 시점`);
  if (Array.isArray(s.rows)) parts.push(`${(s.rows as unknown[]).length}행 표`);
  if (Array.isArray(s.stats)) parts.push(`${(s.stats as unknown[]).length}개 KPI`);
  if (Array.isArray(s.features)) parts.push(`${(s.features as unknown[]).length}개 특징`);
  if (Array.isArray(s.elements)) parts.push(`${(s.elements as unknown[]).length}개 도형`);

  if (s.left && typeof s.left === "object" && "bullets" in s.left) {
    parts.push("좌/우 2단");
  }

  return parts.join(" · ");
}

function SlideListItem({ slide, index }: { slide: AnySlide; index: number }) {
  const layout = ((slide as { layout?: string }).layout ?? "content") as AnySlide["layout"];
  const label = LAYOUT_LABELS[layout] ?? String(layout);
  const color = LAYOUT_COLORS[layout] ?? "bg-gray-100 text-gray-700";
  const title = (slide as { title?: string }).title ?? `슬라이드 ${index + 1}`;
  const summary = summarizeSlideContent(slide);

  // Extract a tiny text snippet for extra context
  const s = slide as unknown as Record<string, unknown>;
  const snippets: string[] = [];
  if (Array.isArray(s.bullets)) {
    for (const b of s.bullets as unknown[]) {
      if (typeof b === "string" && b.trim()) snippets.push(b);
      if (snippets.length >= 2) break;
    }
  } else if (Array.isArray(s.items)) {
    for (const it of s.items as unknown[]) {
      if (it && typeof it === "object") {
        const h = (it as { heading?: string }).heading;
        if (h) snippets.push(h);
      } else if (typeof it === "string") {
        snippets.push(it);
      }
      if (snippets.length >= 3) break;
    }
  }
  const snippet = snippets.join(" · ");

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="shrink-0 w-8 h-8 rounded-md bg-gray-50 flex items-center justify-center text-xs font-semibold text-gray-600 mt-0.5">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${color}`}>
            {label}
          </span>
          <span className="text-sm font-medium text-gray-900 truncate">{title}</span>
          {summary && (
            <span className="text-[11px] text-gray-500">· {summary}</span>
          )}
        </div>
        {snippet && (
          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{snippet}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PptPage() {
  const [mode, setMode] = useState<Mode>("create");
  const [createSub, setCreateSub] = useState<CreateSubMode>("topic");
  const [pptType, setPptType] = useState<PptType>("general");
  const [presetId, setPresetId] = useState<string>(DEFAULT_PRESET_ID);
  const [theme, setTheme] = useState<ThemeId>("hana");
  const [overrideTheme, setOverrideTheme] = useState(false);
  const [slideCount, setSlideCount] = useState(10);
  // Design engine: "freeform" = Claude 자유 설계 (기본, 고퀄리티), "preset" = 고정 레이아웃
  const [designMode, setDesignMode] = useState<"freeform" | "preset">("freeform");
  // LLM provider: Claude 기본 (고퀄리티), GPT fallback
  const [llmProvider, setLlmProvider] = useState<"claude" | "openai">("claude");
  // Claude 모델 티어: Sonnet(균형) 또는 Opus(최고 품질, 느림)
  const [claudeTier, setClaudeTier] = useState<"sonnet" | "opus">("sonnet");

  // Mode: topic
  const [topic, setTopic] = useState("");

  // Mode: outline
  const [outlineTopic, setOutlineTopic] = useState("");
  const [outline, setOutline] = useState<OutlineResult | null>(null);
  const [outlineLoading, setOutlineLoading] = useState(false);

  // Mode: document
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode: data
  const [existingItems, setExistingItems] = useState<ExistingItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ExistingItem | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Mode: redesign
  const [redesignFile, setRedesignFile] = useState<File | null>(null);
  const [isRedesignDragging, setIsRedesignDragging] = useState(false);
  const redesignFileInputRef = useRef<HTMLInputElement>(null);

  // Enhance options
  const [preserveContent, setPreserveContent] = useState(true);
  const [enhancePrompt, setEnhancePrompt] = useState("");

  // Common slide template (header/footer)
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [templateLogoBase64, setTemplateLogoBase64] = useState<string>("");
  const [templateLogoSide, setTemplateLogoSide] = useState<"left" | "right">("left");
  const [templateUseTop, setTemplateUseTop] = useState(false);
  const [templateTopLeft, setTemplateTopLeft] = useState("");
  const [templateTopCenter, setTemplateTopCenter] = useState("");
  const [templateTopRight, setTemplateTopRight] = useState("");
  const [templateTopBg, setTemplateTopBg] = useState("");
  const [templateUseBottom, setTemplateUseBottom] = useState(false);
  const [templateBottomLeft, setTemplateBottomLeft] = useState("");
  const [templateBottomCenter, setTemplateBottomCenter] = useState("");
  const [templateBottomRight, setTemplateBottomRight] = useState("");
  const [templateBottomPageNum, setTemplateBottomPageNum] = useState(false);
  const [templateBottomBorder, setTemplateBottomBorder] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [presentation, setPresentation] = useState<PptPresentation | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing data when mode is "enhance"
  useEffect(() => {
    if (mode !== "enhance" || existingItems.length > 0) return;
    setDataLoading(true);
    fetch("/api/tools/ppt/data")
      .then((r) => r.json())
      .then((d) => {
        const reports: ExistingItem[] = (d.reports || []).map((r: { id: string; title: string; created_at: string; content: string }) => ({
          id: r.id,
          title: r.title,
          type: "report",
          created_at: r.created_at,
          content: r.content,
        }));
        const estimates: ExistingItem[] = (d.estimates || []).map((e: { id: string; title: string; created_at: string; result: unknown }) => ({
          id: e.id,
          title: e.title,
          type: "estimate",
          created_at: e.created_at,
          result: e.result,
        }));
        setExistingItems([...reports, ...estimates]);
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [mode, existingItems.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && isValidDocFile(file)) setDocFile(file);
  }, []);

  const handleEnhanceDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pptx") {
      setRedesignFile(file);
      setDocFile(null);
      setSelectedItem(null);
    } else if (["pdf", "docx", "doc", "txt"].includes(ext ?? "")) {
      setDocFile(file);
      setRedesignFile(null);
      setSelectedItem(null);
    }
  }, []);

  function isValidDocFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ["pdf", "docx", "doc", "txt"].includes(ext ?? "");
  }

  function isValidEnhanceFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ["pdf", "docx", "doc", "txt", "pptx"].includes(ext ?? "");
  }

  async function generateOutline() {
    if (!outlineTopic.trim()) return;
    setOutlineLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/ppt/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: outlineTopic, pptType, slideCount,
          provider: llmProvider,
          model: llmProvider === "claude" ? claudeTier : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "아웃라인 생성 실패");
      setOutline(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setOutlineLoading(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setPresentation(null);

    try {
      let body: Record<string, unknown> = {
      pptType,
      theme: overrideTheme ? theme : undefined,
      presetId,
      slideCount,
      designMode,
      provider: llmProvider,
      model: llmProvider === "claude" ? claudeTier : undefined,
    };

      if (mode === "create" && createSub === "topic") {
        if (!topic.trim()) { setError("주제를 입력해주세요."); setGenerating(false); return; }
        body = { ...body, mode: "topic", topic };
      } else if (mode === "create" && createSub === "outline") {
        if (!outline) { setError("아웃라인을 먼저 생성해주세요."); setGenerating(false); return; }
        body = { ...body, mode: "outline", outline };
      } else if (mode === "enhance" && redesignFile) {
        // PPTX redesign: call separate API with file upload (FormData)
        const fd = new FormData();
        fd.append("file", redesignFile);
        fd.append("theme", overrideTheme ? theme : "hana");
        fd.append("presetId", presetId);
        fd.append("designMode", designMode);
        fd.append("provider", llmProvider);
        if (llmProvider === "claude") fd.append("model", claudeTier);
        if (preserveContent) fd.append("preserveContent", "true");
        if (enhancePrompt.trim()) fd.append("extraInstructions", enhancePrompt.trim());
        const redesignRes = await fetch("/api/tools/ppt/redesign", { method: "POST", body: fd });
        const redesignData = await redesignRes.json();
        if (!redesignRes.ok) throw new Error(redesignData.error ?? "재디자인 실패");
        setPresentation(redesignData.presentation);
        setGenerating(false);
        return;
      } else if (mode === "enhance" && docFile) {
        // Document → PPT
        const fd = new FormData();
        fd.append("file", docFile);
        const extractRes = await fetch("/api/tools/hwp-convert", { method: "POST", body: fd });
        const extractData = await extractRes.json();
        if (!extractRes.ok) throw new Error(extractData.error ?? "문서 텍스트 추출 실패");
        body = {
          ...body,
          mode: "document",
          documentText: extractData.text || extractData.summary || "",
          ...(preserveContent && { preserveContent: true }),
          ...(enhancePrompt.trim() && { extraInstructions: enhancePrompt.trim() }),
        };
      } else if (mode === "enhance" && selectedItem) {
        body = {
          ...body,
          mode: "data",
          existingData: {
            type: selectedItem.type === "report" ? "업무 보고서" : "견적 분석",
            title: selectedItem.title,
            content: selectedItem.content ?? selectedItem.result,
          },
          ...(preserveContent && { preserveContent: true }),
          ...(enhancePrompt.trim() && { extraInstructions: enhancePrompt.trim() }),
        };
      } else {
        setError("생성할 내용을 먼저 선택해주세요.");
        setGenerating(false);
        return;
      }

      const res = await fetch("/api/tools/ppt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "슬라이드 생성 실패");
      setPresentation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  }

  function buildTemplateConfig(): SlideTemplate | undefined {
    if (!templateUseTop && !templateUseBottom) return undefined;

    const logoBase64 = templateLogoBase64 || undefined;
    const logoSide = templateLogoSide;

    const tmpl: SlideTemplate = {};

    if (templateUseTop) {
      tmpl.topStrip = {
        left: templateTopLeft || undefined,
        center: templateTopCenter || undefined,
        right: templateTopRight || undefined,
        logoBase64,
        logoSide,
        bgColor: templateTopBg.replace("#", "") || undefined,
      };
    }

    if (templateUseBottom) {
      tmpl.bottomStrip = {
        left: templateBottomLeft || undefined,
        center: templateBottomCenter || undefined,
        right: templateBottomRight || undefined,
        logoBase64: !templateUseTop ? logoBase64 : undefined, // logo in bottom if no top strip
        logoSide,
        showPageNumber: templateBottomPageNum,
        borderTopColor: templateBottomBorder ? "E5E7EB" : undefined,
      };
    }

    return tmpl;
  }

  async function downloadPptx() {
    if (!presentation) return;
    setDownloading(true);
    try {
      const tmpl = buildTemplateConfig();
      const payload = tmpl ? { ...presentation, template: tmpl } : presentation;
      const res = await fetch("/api/tools/ppt/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "PPTX 생성 실패");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      a.download = match ? decodeURIComponent(match[1]) : "presentation.pptx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloading(false);
    }
  }

  function reset() {
    setPresentation(null);
    setError(null);
    setOutline(null);
    setDocFile(null);
    setSelectedItem(null);
    setRedesignFile(null);
    setTopic("");
    setEnhancePrompt("");
    setPreserveContent(true);
  }

  function handleLogoUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) setTemplateLogoBase64(result);
    };
    reader.readAsDataURL(file);
  }

  const canGenerate =
    (mode === "create" && createSub === "topic" && topic.trim().length > 0) ||
    (mode === "create" && createSub === "outline" && outline !== null) ||
    (mode === "enhance" && (redesignFile !== null || docFile !== null || selectedItem !== null));

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Presentation size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">AI PPT 생성</h1>
            <p className="text-xs text-gray-500">GPT-4o로 전문적인 프레젠테이션을 자동 생성</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: input */}
        <div className="w-[380px] shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Mode tabs */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setPresentation(null); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                      mode === m.id
                        ? "bg-teal-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={14} />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* AI 모델 선택: Claude (기본, 고퀄리티) vs GPT-4o */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                AI 모델
                <span className="ml-2 text-[10px] text-gray-400 font-normal">
                  슬라이드 내용·디자인을 생성할 LLM
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLlmProvider("claude")}
                  className={`px-3 py-2 rounded-lg border-2 text-left transition-all ${
                    llmProvider === "claude"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">✨</span>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-900">
                        Claude <span className="text-[10px] text-orange-600 font-normal">(권장)</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        한국어·디자인 감각 우수
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setLlmProvider("openai")}
                  className={`px-3 py-2 rounded-lg border-2 text-left transition-all ${
                    llmProvider === "openai"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤖</span>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-900">
                        GPT-4o
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        빠른 응답, 안정적 구조화
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Claude 세부 모델 선택 (Claude 선택 시만 표시) */}
              {llmProvider === "claude" && (
                <div className="mt-2 flex gap-2 items-center pl-2 border-l-2 border-orange-200">
                  <span className="text-[10px] text-gray-500 shrink-0">모델 티어</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setClaudeTier("sonnet")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        claudeTier === "sonnet"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      title="Sonnet: 균형잡힌 품질·속도, 대부분의 작업에 권장"
                    >
                      Sonnet <span className="text-[9px] opacity-80">(균형, 권장)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClaudeTier("opus")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        claudeTier === "opus"
                          ? "bg-orange-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      title="Opus: 최고 품질, 복잡한 레이아웃/긴 문서에 유리, 느리고 비쌈"
                    >
                      Opus <span className="text-[9px] opacity-80">(최고 품질, 느림)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Design engine selector: Claude Freeform (default, 고퀄리티) vs Preset */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                디자인 엔진
                <span className="ml-2 text-[10px] text-gray-400 font-normal">
                  각 슬라이드 레이아웃을 만드는 방식
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDesignMode("freeform")}
                  className={`px-3 py-2 rounded-lg border-2 text-left transition-all ${
                    designMode === "freeform"
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎨</span>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-900">
                        자유 디자인 <span className="text-[10px] text-teal-600 font-normal">(권장)</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        AI가 슬라이드마다 도형·표·차트 위치를 직접 좌표로 설계 → 다양한 레이아웃
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDesignMode("preset")}
                  className={`px-3 py-2 rounded-lg border-2 text-left transition-all ${
                    designMode === "preset"
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">📐</span>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-900">
                        프리셋 레이아웃
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        24종 고정 템플릿(grid/stats/process 등)에 텍스트만 채움 → 일관되지만 단조로움
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Common options */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">PPT 유형</label>
                <select
                  value={pptType}
                  onChange={(e) => setPptType(e.target.value as PptType)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PPT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">디자인 시안</label>
                <select
                  value={presetId}
                  onChange={(e) => setPresetId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">슬라이드 수</label>
                <select
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {[5, 7, 10, 12, 15, 20].map((n) => (
                    <option key={n} value={n}>{n}장</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preset preview swatches */}
            <div className="flex gap-1.5">
              {PRESETS.map((p) => {
                const primary   = p.tokens.colors.primary   ?? "009591";
                const secondary = p.tokens.colors.secondary ?? "ED1651";
                const bg        = p.tokens.colors.background ?? "FFFFFF";
                return (
                  <button
                    key={p.id}
                    title={p.name}
                    onClick={() => setPresetId(p.id)}
                    className={`flex-1 h-8 rounded border-2 overflow-hidden transition-all ${presetId === p.id ? "border-teal-500 scale-105" : "border-transparent"}`}
                  >
                    <div className="h-full w-full flex">
                      <div className="w-1/3 h-full" style={{ backgroundColor: `#${primary}` }} />
                      <div className="w-1/3 h-full" style={{ backgroundColor: `#${secondary}` }} />
                      <div className="w-1/3 h-full" style={{ backgroundColor: `#${bg}` }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Optional color theme override */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="overrideTheme"
                checked={overrideTheme}
                onChange={(e) => setOverrideTheme(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 accent-teal-600"
              />
              <label htmlFor="overrideTheme" className="text-xs text-gray-600 cursor-pointer select-none">
                색상 직접 지정 <span className="text-gray-400">(시안 기본 색상 무시)</span>
              </label>
            </div>
            {overrideTheme && (
              <div className="flex gap-1.5">
                {Object.values(PPT_THEMES).map((t) => (
                  <button
                    key={t.id}
                    title={t.name}
                    onClick={() => setTheme(t.id)}
                    className={`flex-1 h-8 rounded border-2 overflow-hidden transition-all ${theme === t.id ? "border-indigo-500 scale-105" : "border-transparent"}`}
                  >
                    <div className="h-full w-full flex">
                      <div className="w-1/3 h-full" style={{ backgroundColor: `#${t.colors.primary}` }} />
                      <div className="w-1/3 h-full" style={{ backgroundColor: `#${t.colors.secondary}` }} />
                      <div className="w-1/3 h-full" style={{ backgroundColor: `#${t.colors.background}` }} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Mode-specific inputs */}
            <div className="border-t border-gray-100 pt-4">

              {/* ── 새로 만들기 ─────────────────────────────────────────────── */}
              {mode === "create" && (
                <div className="space-y-3">
                  {/* Sub-mode tabs */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    {([
                      { id: "topic" as CreateSubMode, label: "주제 입력", icon: Sparkles },
                      { id: "outline" as CreateSubMode, label: "아웃라인 편집", icon: PenLine },
                    ] as { id: CreateSubMode; label: string; icon: React.ElementType }[]).map((s) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setCreateSub(s.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-all ${
                            createSub === s.id
                              ? "bg-teal-600 text-white"
                              : "bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          <Icon size={12} />
                          {s.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Topic input */}
                  {createSub === "topic" && (
                    <div className="space-y-2">
                      <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="예) AI 기반 인재 개발 트렌드 2026&#10;예) Allganize Alli 도입 효과 및 ROI 분석&#10;예) 하반기 HRD 프로그램 운영 계획"
                        rows={5}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <p className="text-xs text-gray-400">구체적으로 입력할수록 더 좋은 결과물이 생성됩니다.</p>
                    </div>
                  )}

                  {/* Outline editor */}
                  {createSub === "outline" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={outlineTopic}
                          onChange={(e) => setOutlineTopic(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && generateOutline()}
                          placeholder="주제를 입력하세요"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          onClick={generateOutline}
                          disabled={outlineLoading || !outlineTopic.trim()}
                          className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                        >
                          {outlineLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          제안
                        </button>
                      </div>
                      {outline && (
                        <OutlineEditor outline={outline} onChange={setOutline} />
                      )}
                      {!outline && !outlineLoading && (
                        <p className="text-xs text-gray-400 text-center py-4">
                          주제를 입력하고 &apos;제안&apos; 버튼을 눌러 아웃라인을 생성하세요
                        </p>
                      )}
                      {outlineLoading && (
                        <div className="flex items-center justify-center py-6 gap-2 text-teal-600">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">아웃라인 생성 중...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── 기존 자료 강화 ──────────────────────────────────────────── */}
              {mode === "enhance" && (
                <div className="space-y-4">
                  {/* Unified file drop zone */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      파일 업로드
                      <span className="text-gray-400 font-normal ml-1">(PDF · DOCX · TXT · PPTX)</span>
                    </label>
                    {!docFile && !redesignFile ? (
                      <div
                        onDrop={handleEnhanceDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                          isDragging ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-teal-300 hover:bg-teal-50/40"
                        }`}
                      >
                        <UploadCloud size={26} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">파일을 끌어다 놓거나 클릭</p>
                        <p className="text-xs text-gray-400 mt-0.5">PDF · DOCX · TXT → 내용 기반 생성<br/>PPTX → 텍스트 보존 재디자인</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.doc,.txt,.pptx"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f || !isValidEnhanceFile(f)) return;
                            const ext = f.name.split(".").pop()?.toLowerCase();
                            if (ext === "pptx") { setRedesignFile(f); setDocFile(null); }
                            else { setDocFile(f); setRedesignFile(null); }
                            setSelectedItem(null);
                          }}
                        />
                      </div>
                    ) : docFile ? (
                      <div className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-3 bg-green-50">
                        <FileText size={18} className="text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{docFile.name}</p>
                          <p className="text-xs text-gray-500">{(docFile.size / 1024).toFixed(1)} KB · 내용 기반 생성</p>
                        </div>
                        <button onClick={() => setDocFile(null)} className="text-gray-400 hover:text-red-500">
                          <X size={16} />
                        </button>
                      </div>
                    ) : redesignFile ? (
                      <div className="border border-teal-200 rounded-lg px-3 py-2.5 flex items-center gap-3 bg-teal-50">
                        <Wand2 size={18} className="text-teal-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{redesignFile.name}</p>
                          <p className="text-xs text-gray-500">{(redesignFile.size / 1024).toFixed(1)} KB · 텍스트 보존 재디자인</p>
                        </div>
                        <button onClick={() => setRedesignFile(null)} className="text-gray-400 hover:text-red-500">
                          <X size={16} />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Preserve content option */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={preserveContent}
                      onChange={(e) => setPreserveContent(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 accent-teal-600"
                    />
                    <span className="text-xs text-gray-700">내용 변경 안 하기 <span className="text-gray-400">(텍스트·슬라이드 수 원본 유지)</span></span>
                  </label>

                  {/* Extra instructions */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">추가 지시사항 <span className="text-gray-400 font-normal">(선택)</span></label>
                    <textarea
                      value={enhancePrompt}
                      onChange={(e) => setEnhancePrompt(e.target.value)}
                      placeholder="예) 색상을 더 밝게, 차트 위주로 구성, 요약 슬라이드 추가..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-gray-300"
                    />
                  </div>

                  {/* DB data */}
                  <div>
                    <button
                      onClick={() => setShowTemplatePanel(false)}
                      className="w-full flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5"
                    >
                      <Database size={12} className="text-gray-400" />
                      저장된 보고서 / 견적에서 선택
                    </button>
                    {dataLoading ? (
                      <div className="flex items-center justify-center py-4 gap-2 text-gray-500">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs">불러오는 중...</span>
                      </div>
                    ) : existingItems.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">저장된 보고서/견적 데이터가 없습니다.</p>
                    ) : (
                      <div className="space-y-1 max-h-52 overflow-y-auto">
                        {existingItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { setSelectedItem(selectedItem?.id === item.id ? null : item); setDocFile(null); setRedesignFile(null); }}
                            className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                              selectedItem?.id === item.id
                                ? "border-teal-500 bg-teal-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                item.type === "report"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {item.type === "report" ? "보고서" : "견적분석"}
                              </span>
                              <span className="text-xs text-gray-700 truncate">{item.title}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {new Date(item.created_at).toLocaleDateString("ko-KR")}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Common template (header/footer) */}
            <div className="border-t border-gray-100 pt-3">
              <button
                onClick={() => setShowTemplatePanel((v) => !v)}
                className="w-full flex items-center justify-between px-1 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 group"
              >
                <div className="flex items-center gap-1.5">
                  <Settings2 size={13} className="text-gray-400 group-hover:text-gray-600" />
                  공통 헤더/푸터 설정
                  {(templateUseTop || templateUseBottom) && (
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px] font-medium">적용 중</span>
                  )}
                </div>
                {showTemplatePanel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showTemplatePanel && (
                <div className="mt-2 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {/* Logo upload */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">로고 이미지</p>
                    <div className="flex items-center gap-2">
                      {templateLogoBase64 ? (
                        <div className="flex items-center gap-2 flex-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={templateLogoBase64} alt="logo" className="h-8 w-auto max-w-[80px] object-contain border border-gray-200 rounded bg-white p-0.5" />
                          <button
                            onClick={() => setTemplateLogoBase64("")}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                          >
                            <X size={12} /> 제거
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => logoFileRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          <ImagePlus size={13} /> 이미지 업로드 (PNG/JPG)
                        </button>
                      )}
                      <input
                        ref={logoFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleLogoUpload(f);
                        }}
                      />
                      <div>
                        <select
                          value={templateLogoSide}
                          onChange={(e) => setTemplateLogoSide(e.target.value as "left" | "right")}
                          className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white"
                          title="로고 위치"
                        >
                          <option value="left">좌측</option>
                          <option value="right">우측</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Top strip */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={templateUseTop}
                        onChange={(e) => setTemplateUseTop(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs font-medium text-gray-700">상단 스트립 (매 슬라이드 상단에 공통 라인 추가)</span>
                    </label>
                    {templateUseTop && (
                      <div className="space-y-2 pl-5">
                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            type="text"
                            value={templateTopLeft}
                            onChange={(e) => setTemplateTopLeft(e.target.value)}
                            placeholder="좌측 텍스트"
                            className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                          <input
                            type="text"
                            value={templateTopCenter}
                            onChange={(e) => setTemplateTopCenter(e.target.value)}
                            placeholder="중앙 텍스트"
                            className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                          <input
                            type="text"
                            value={templateTopRight}
                            onChange={(e) => setTemplateTopRight(e.target.value)}
                            placeholder="우측 텍스트"
                            className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">배경색</label>
                          <input
                            type="color"
                            value={templateTopBg || "#312E81"}
                            onChange={(e) => setTemplateTopBg(e.target.value)}
                            className="w-7 h-7 rounded cursor-pointer border border-gray-200"
                            title="상단 스트립 배경색"
                          />
                          <p className="text-xs text-gray-400">(기본: 테마 색상)</p>
                          {templateTopBg && (
                            <button onClick={() => setTemplateTopBg("")} className="text-xs text-gray-400 hover:text-gray-600">초기화</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom strip */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={templateUseBottom}
                        onChange={(e) => setTemplateUseBottom(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs font-medium text-gray-700">하단 푸터 (매 슬라이드 하단에 공통 라인 추가)</span>
                    </label>
                    {templateUseBottom && (
                      <div className="space-y-2 pl-5">
                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            type="text"
                            value={templateBottomLeft}
                            onChange={(e) => setTemplateBottomLeft(e.target.value)}
                            placeholder="좌측 텍스트"
                            className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                          <input
                            type="text"
                            value={templateBottomCenter}
                            onChange={(e) => setTemplateBottomCenter(e.target.value)}
                            placeholder="중앙 텍스트"
                            className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                          <input
                            type="text"
                            value={templateBottomRight}
                            onChange={(e) => setTemplateBottomRight(e.target.value)}
                            placeholder="우측 텍스트"
                            className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={templateBottomPageNum}
                              onChange={(e) => setTemplateBottomPageNum(e.target.checked)}
                              className="rounded"
                            />
                            페이지 번호 자동 표시 (우측)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={templateBottomBorder}
                              onChange={(e) => setTemplateBottomBorder(e.target.checked)}
                              className="rounded"
                            />
                            상단 구분선
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preview hint */}
                  {(templateUseTop || templateUseBottom) && (
                    <div className="text-xs text-indigo-600 bg-indigo-50 rounded px-2 py-1.5">
                      표지/마무리 슬라이드에는 자동으로 적용되지 않습니다.
                      &quot;PPTX 다운로드&quot; 시 반영됩니다.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Generate button */}
          <div className="mt-auto p-4 border-t border-gray-100">
            <button
              onClick={generate}
              disabled={!canGenerate || generating}
              className="w-full py-2.5 bg-teal-600 text-white rounded-lg font-medium text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === "enhance" && redesignFile ? "텍스트 추출 및 재디자인 중..." : "GPT-4o로 생성 중..."}
                </>
              ) : (
                <>
                  {mode === "enhance" && redesignFile ? <Wand2 size={16} /> : <Sparkles size={16} />}
                  {mode === "enhance" && redesignFile ? "PPT 재디자인" : "PPT 생성"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right panel: preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!presentation && !generating && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <Presentation size={28} className="text-indigo-400" />
              </div>
              <h3 className="font-medium text-gray-700 mb-1">슬라이드 미리보기</h3>
              <p className="text-sm text-gray-400 max-w-xs">
                왼쪽에서 생성 방식과 옵션을 선택하고<br />
                PPT 내용 생성 버튼을 누르세요
              </p>
            </div>
          )}

          {generating && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Presentation size={28} className="text-indigo-500" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Loader2 size={20} className="animate-spin text-indigo-600" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-700">
                  {llmProvider === "claude"
                    ? `Claude ${claudeTier === "opus" ? "Opus" : "Sonnet"}`
                    : "GPT-4o"}가 슬라이드를 작성하고 있습니다...
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  잠시만 기다려주세요 {llmProvider === "claude" && claudeTier === "opus"
                    ? "(Opus: 약 30~90초)"
                    : "(약 15~30초)"}
                </p>
              </div>
            </div>
          )}

          {presentation && !generating && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Preview header */}
              <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-semibold text-gray-800 text-sm">{presentation.title}</h2>
                  <p className="text-xs text-gray-500">
                    {presentation.slides.length}장 슬라이드 • {PRESETS.find(p => p.id === presentation.presetId)?.name ?? PPT_THEMES[presentation.theme]?.name ?? presentation.theme}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={reset}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RotateCcw size={14} />
                    초기화
                  </button>
                  <button
                    onClick={downloadPptx}
                    disabled={downloading}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {downloading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    {downloading ? "생성 중..." : "PPTX 다운로드"}
                  </button>
                </div>
              </div>

              {/* Slide list (텍스트 기반 — 실제 디자인은 PPTX 다운로드 후 확인) */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="mb-3 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-amber-600 text-sm leading-none mt-0.5">ℹ</span>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    아래는 생성된 슬라이드의 <strong>구조 요약</strong>입니다. 실제 디자인·레이아웃은
                    <strong> PPTX 다운로드</strong> 후 확인하세요.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {presentation.slides.map((slide, index) => (
                    <SlideListItem key={index} slide={slide} index={index} />
                  ))}
                </div>

                {/* Download button at bottom */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={downloadPptx}
                    disabled={downloading}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200"
                  >
                    {downloading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Download size={18} />
                    )}
                    {downloading ? "PPTX 파일 생성 중..." : "PPTX 다운로드"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

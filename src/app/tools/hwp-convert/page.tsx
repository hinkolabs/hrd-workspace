"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";

interface AnalysisResult {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  summary: string | null;
  questions: string[];
  isTruncated?: boolean;
  status: "analyzing" | "done" | "error";
  error?: string;
  createdAt: Date;
}

interface HistoryItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  summary: string | null;
  user_display_name: string | null;
  created_at: string;
}

const FILE_TYPES_LABEL: Record<string, string> = {
  pdf: "PDF",
  docx: "Word",
  doc: "Word",
  hwp: "HWP",
  hwpx: "HWP",
  txt: "텍스트",
};

const FILE_COLORS: Record<string, string> = {
  pdf: "bg-red-100 text-red-700",
  docx: "bg-blue-100 text-blue-700",
  doc: "bg-blue-100 text-blue-700",
  hwp: "bg-teal-100 text-teal-700",
  hwpx: "bg-teal-100 text-teal-700",
  txt: "bg-gray-100 text-gray-700",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return <p key={i} className="font-semibold text-gray-800 mt-3 mb-0.5 text-xs">{line.slice(3)}</p>;
        }
        if (line.startsWith("### ")) {
          return <p key={i} className="font-medium text-gray-700 mt-2 text-xs">{line.slice(4)}</p>;
        }
        if (line.startsWith("- **") || line.startsWith("* **")) {
          const content = line.slice(2).replace(/\*\*([^*]+)\*\*/g, "$1");
          const parts = content.split(": ");
          return (
            <div key={i} className="flex gap-1 text-xs text-gray-700 leading-relaxed">
              <span className="shrink-0 text-gray-400">•</span>
              {parts.length > 1 ? (
                <span><span className="font-medium">{parts[0]}</span>: {parts.slice(1).join(": ")}</span>
              ) : (
                <span>{content}</span>
              )}
            </div>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-1 text-xs text-gray-700 leading-relaxed">
              <span className="shrink-0 text-gray-400">•</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i} className="text-xs text-gray-700 leading-relaxed">{line.replace(/\*\*([^*]+)\*\*/g, "$1")}</p>;
      })}
    </div>
  );
}

function FileBadge({ ext }: { ext: string }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${FILE_COLORS[ext] ?? "bg-gray-100 text-gray-600"}`}>
      {FILE_TYPES_LABEL[ext] ?? ext.toUpperCase()}
    </span>
  );
}

function ResultCard({ item, onRemove }: { item: AnalysisResult; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [showQuestions, setShowQuestions] = useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <FileBadge ext={item.fileType} />
        <span className="flex-1 text-sm font-medium text-gray-800 truncate">{item.fileName}</span>
        <span className="text-xs text-gray-400">{formatBytes(item.fileSize)}</span>
        {item.status === "analyzing" && <Loader2 size={15} className="animate-spin text-blue-500 shrink-0" />}
        {item.status === "done" && <CheckCircle2 size={15} className="text-green-500 shrink-0" />}
        {item.status === "error" && <AlertCircle size={15} className="text-red-500 shrink-0" />}
        <button
          onClick={onRemove}
          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
        </button>
        <button onClick={() => setExpanded((v) => !v)} className="p-1 rounded text-gray-400 hover:bg-gray-200 transition-colors">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* 분석 중 */}
          {item.status === "analyzing" && (
            <div className="flex flex-col items-center gap-3 py-8 text-gray-400">
              <Loader2 size={28} className="animate-spin text-blue-400" />
              <p className="text-sm">AI가 문서를 분석하고 있습니다…</p>
            </div>
          )}

          {/* 오류 */}
          {item.status === "error" && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700 mb-1">분석 실패</p>
                <p className="text-xs text-red-600 leading-relaxed">{item.error}</p>
              </div>
            </div>
          )}

          {/* 요약 결과 */}
          {item.status === "done" && item.summary && (
            <>
              {item.isTruncated && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle size={12} className="shrink-0" />
                  파일이 길어 앞부분(최대 40,000자)만 분석되었습니다.
                </div>
              )}

              {/* 요약 */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={13} className="text-purple-500" />
                  <span className="text-xs font-semibold text-purple-700">AI 요약</span>
                </div>
                <div className="rounded-xl bg-purple-50/50 border border-purple-100 px-4 py-3">
                  <SimpleMarkdown text={item.summary} />
                </div>
              </div>

              {/* 핵심 확인 질문 */}
              {item.questions.length > 0 && (
                <div>
                  <button
                    className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                    onClick={() => setShowQuestions((v) => !v)}
                  >
                    <HelpCircle size={13} className="text-blue-500" />
                    핵심 확인 질문
                    {showQuestions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showQuestions && (
                    <ol className="space-y-2">
                      {item.questions.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-100 rounded px-1 py-0.5 shrink-0 mt-0.5">Q{i + 1}</span>
                          <span className="text-xs text-blue-800 leading-relaxed">{q}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const ext = item.file_type ?? "unknown";

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <FileBadge ext={ext} />
        <span className="flex-1 text-xs text-gray-800 truncate">{item.file_name}</span>
        <span className="text-[10px] text-gray-400 shrink-0">{formatDate(item.created_at)}</span>
        {item.user_display_name && (
          <span className="text-[10px] text-gray-400 shrink-0">{item.user_display_name}</span>
        )}
        {expanded ? <ChevronUp size={13} className="text-gray-400 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
      </button>
      {expanded && item.summary && (
        <div className="border-t border-gray-100 px-4 py-3">
          <SimpleMarkdown text={item.summary} />
        </div>
      )}
      {expanded && !item.summary && (
        <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400">저장된 요약이 없습니다.</div>
      )}
    </div>
  );
}

export default function HwpConvertPage() {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tab, setTab] = useState<"analyze" | "history">("analyze");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/tools/hwp-convert/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history ?? []);
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  async function analyzeFile(file: File) {
    const id = crypto.randomUUID();
    const ext = (file.name.match(/\.([^.]+)$/) ?? ["", "unknown"])[1].toLowerCase();

    const newItem: AnalysisResult = {
      id,
      fileName: file.name,
      fileType: ext,
      fileSize: file.size,
      summary: null,
      questions: [],
      status: "analyzing",
      createdAt: new Date(),
    };

    setResults((prev) => [newItem, ...prev]);
    setTab("analyze");

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/tools/hwp-convert", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || data.error) {
        setResults((prev) =>
          prev.map((r) => r.id === id ? { ...r, status: "error", error: data.error ?? "분석 실패" } : r),
        );
        return;
      }

      setResults((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "done",
                summary: data.summary,
                questions: data.questions ?? [],
                isTruncated: data.isTruncated,
              }
            : r,
        ),
      );

      // history 갱신
      fetchHistory();
    } catch (e) {
      setResults((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "error", error: e instanceof Error ? e.message : "분석 실패" } : r,
        ),
      );
    }
  }

  function handleFiles(files: FileList | File[]) {
    Array.from(files).forEach(analyzeFile);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col h-full">
      {/* 페이지 헤더 */}
      <div className="px-6 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-0.5">
          <FileText size={18} className="text-purple-600" />
          <h1 className="text-base font-semibold text-gray-900">문서 분석</h1>
        </div>
        <p className="text-xs text-gray-500">
          HWP·PDF·Word·TXT 파일을 업로드하면 AI가 요약 및 핵심 확인 질문을 생성합니다.
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-0 border-b border-gray-100 px-6">
        {(["analyze", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-purple-500 text-purple-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t === "analyze" ? (
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} />
                분석
                {results.length > 0 && (
                  <span className="bg-purple-100 text-purple-700 rounded-full px-1.5 py-0.5 text-[10px]">
                    {results.length}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                히스토리
                {history.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-[10px]">
                    {history.length}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {tab === "analyze" && (
          <>
            {/* 업로드 드롭존 */}
            <div
              className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-colors ${
                dragging
                  ? "border-purple-400 bg-purple-50"
                  : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={32} className={dragging ? "text-purple-400" : "text-gray-300"} />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">파일을 드래그하거나 클릭하여 업로드</p>
                <p className="text-xs text-gray-400 mt-1">HWP · PDF · DOCX · TXT · 여러 파일 동시 가능</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".hwp,.hwpx,.pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
              />
            </div>

            {/* 결과 목록 */}
            {results.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <FileText size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">분석된 문서가 없습니다.</p>
                <p className="text-xs mt-1">위에서 파일을 업로드해 보세요.</p>
              </div>
            )}
            {results.map((item) => (
              <ResultCard
                key={item.id}
                item={item}
                onRemove={() => setResults((prev) => prev.filter((r) => r.id !== item.id))}
              />
            ))}
          </>
        )}

        {tab === "history" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {historyLoading ? "로딩 중…" : `총 ${history.length}건`}
              </p>
              <button
                onClick={fetchHistory}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                <RotateCcw size={12} />
                새로고침
              </button>
            </div>

            {historyLoading && (
              <div className="flex justify-center py-12">
                <Loader2 size={22} className="animate-spin text-gray-400" />
              </div>
            )}

            {!historyLoading && history.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Clock size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">분석 기록이 없습니다.</p>
              </div>
            )}

            {history.map((item) => (
              <HistoryCard key={item.id} item={item} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

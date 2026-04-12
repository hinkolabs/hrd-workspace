"use client";

import { useState, useRef } from "react";
import {
  Upload, FileText, Download, Loader2, Eye, X,
  CheckCircle, AlertCircle, File, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";

type ConvertResult = {
  file: File;
  status: "pending" | "converting" | "done" | "error";
  html?: string;
  summary?: string | null;
  outputName?: string;
  error?: string;
};

const ACCEPTED_EXTENSIONS = ".hwp,.hwpx,.doc,.docx,.txt,.pdf,.rtf,.csv,.md,.log,.json,.xml,.html,.htm";

const FILE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  hwp:  { label: "HWP",  color: "bg-blue-100 text-blue-700" },
  hwpx: { label: "HWPX", color: "bg-blue-100 text-blue-700" },
  doc:  { label: "DOC",  color: "bg-sky-100 text-sky-700" },
  docx: { label: "DOCX", color: "bg-sky-100 text-sky-700" },
  txt:  { label: "TXT",  color: "bg-gray-100 text-gray-700" },
  pdf:  { label: "PDF",  color: "bg-red-100 text-red-700" },
  rtf:  { label: "RTF",  color: "bg-orange-100 text-orange-700" },
  csv:  { label: "CSV",  color: "bg-green-100 text-green-700" },
  md:   { label: "MD",   color: "bg-purple-100 text-purple-700" },
  log:  { label: "LOG",  color: "bg-gray-100 text-gray-600" },
  json: { label: "JSON", color: "bg-yellow-100 text-yellow-700" },
  xml:  { label: "XML",  color: "bg-amber-100 text-amber-700" },
  html: { label: "HTML", color: "bg-orange-100 text-orange-700" },
  htm:  { label: "HTM",  color: "bg-orange-100 text-orange-700" },
};

function getExt(name: string) {
  return (name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
}

function FileTypeBadge({ filename }: { filename: string }) {
  const ext = getExt(filename);
  const info = FILE_TYPE_LABELS[ext] || { label: ext.toUpperCase(), color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded ${info.color}`}>
      {info.label}
    </span>
  );
}

/** 마크다운 볼드·목록을 간단 렌더링 */
function SummaryText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="text-sm text-gray-700 space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        // 제목줄 (## 또는 **xxx**)
        if (line.startsWith("## ")) {
          return <p key={i} className="font-bold text-gray-900 mt-3 first:mt-0">{line.slice(3)}</p>;
        }
        if (line.startsWith("# ")) {
          return <p key={i} className="font-bold text-gray-900 text-base mt-3 first:mt-0">{line.slice(2)}</p>;
        }
        // 불릿
        if (line.startsWith("- ") || line.startsWith("• ")) {
          const content = line.slice(2);
          return (
            <div key={i} className="flex gap-2">
              <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
              <span dangerouslySetInnerHTML={{ __html: boldify(content) }} />
            </div>
          );
        }
        // 번호 목록
        if (/^\d+\.\s/.test(line)) {
          const content = line.replace(/^\d+\.\s/, "");
          return (
            <div key={i} className="flex gap-2">
              <span className="text-indigo-500 font-semibold shrink-0 min-w-[18px]">{line.match(/^\d+/)?.[0]}.</span>
              <span dangerouslySetInnerHTML={{ __html: boldify(content) }} />
            </div>
          );
        }
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i} dangerouslySetInnerHTML={{ __html: boldify(line) }} />;
      })}
    </div>
  );
}

function boldify(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export default function DocumentConvertPage() {
  const [results, setResults] = useState<ConvertResult[]>([]);
  const [converting, setConverting] = useState(false);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [summaryIdx, setSummaryIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const newResults: ConvertResult[] = Array.from(fileList).map((f) => ({
      file: f,
      status: "pending" as const,
    }));
    setResults((prev) => [...prev, ...newResults]);
    setPreviewIdx(null);
    setSummaryIdx(null);
  }

  function removeFile(idx: number) {
    setResults((prev) => prev.filter((_, i) => i !== idx));
    if (previewIdx === idx) setPreviewIdx(null);
    else if (previewIdx !== null && previewIdx > idx) setPreviewIdx(previewIdx - 1);
    if (summaryIdx === idx) setSummaryIdx(null);
    else if (summaryIdx !== null && summaryIdx > idx) setSummaryIdx(summaryIdx - 1);
  }

  function clearAll() {
    setResults([]);
    setPreviewIdx(null);
    setSummaryIdx(null);
  }

  async function convertAll() {
    const pendingIdxs = results
      .map((r, i) => (r.status === "pending" || r.status === "error" ? i : -1))
      .filter((i) => i >= 0);

    if (pendingIdxs.length === 0) return;
    setConverting(true);

    for (const idx of pendingIdxs) {
      setResults((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, status: "converting" as const } : r)),
      );

      try {
        const formData = new FormData();
        formData.append("file", results[idx].file);
        const res = await fetch("/api/tools/hwp-convert", { method: "POST", body: formData });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "변환 실패");
        }

        const data = await res.json();
        setResults((prev) =>
          prev.map((r, i) =>
            i === idx
              ? {
                  ...r,
                  status: "done" as const,
                  html: data.html,
                  summary: data.summary ?? null,
                  outputName: data.filename,
                }
              : r,
          ),
        );
        // 첫 번째 완료 시 자동으로 요약 표시
        if (summaryIdx === null && data.summary) setSummaryIdx(idx);
      } catch (err) {
        setResults((prev) =>
          prev.map((r, i) =>
            i === idx
              ? { ...r, status: "error" as const, error: err instanceof Error ? err.message : "오류" }
              : r,
          ),
        );
      }
    }

    setConverting(false);
  }

  function downloadPdf(idx: number) {
    const r = results[idx];
    if (!r.html) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(r.html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  function downloadHtml(idx: number) {
    const r = results[idx];
    if (!r.html) return;
    const blob = new Blob([r.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.file.name.replace(/\.[^.]+$/, ".html");
    a.click();
    URL.revokeObjectURL(url);
  }

  const pendingCount = results.filter((r) => r.status === "pending" || r.status === "error").length;
  const doneCount = results.filter((r) => r.status === "done").length;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-xl font-bold text-gray-900">문서 → PDF 변환</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          HWP, DOC, TXT, PDF, CSV, MD 등 다양한 문서를 AI가 변환 + 요약합니다
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        {/* 업로드 영역 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-indigo-400", "bg-indigo-50"); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove("border-indigo-400", "bg-indigo-50"); }}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-indigo-400", "bg-indigo-50"); handleFiles(e.dataTransfer.files); }}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              multiple
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
              className="hidden"
            />
            <Upload size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">파일을 드래그하거나 클릭하세요 (여러 파일 가능)</p>
            <p className="text-xs text-gray-400 mt-1">
              HWP, HWPX, DOC, DOCX, TXT, PDF, RTF, CSV, MD, JSON, XML
            </p>
          </div>

          {results.length > 0 && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={convertAll}
                disabled={converting || pendingCount === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
              >
                {converting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {converting ? "변환 중..." : `${pendingCount}개 변환하기`}
              </button>
              <button
                onClick={clearAll}
                disabled={converting}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                전체 삭제
              </button>
              {doneCount > 0 && (
                <span className="text-xs text-green-600 font-medium">{doneCount}개 변환 완료</span>
              )}
            </div>
          )}
        </div>

        {/* 파일 목록 */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">파일 목록 ({results.length}개)</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {results.map((r, idx) => (
                <div key={idx}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      previewIdx === idx ? "bg-indigo-50" : ""
                    }`}
                  >
                    <div className="shrink-0">
                      {r.status === "pending"    && <File size={18} className="text-gray-400" />}
                      {r.status === "converting" && <Loader2 size={18} className="text-indigo-500 animate-spin" />}
                      {r.status === "done"       && <CheckCircle size={18} className="text-green-500" />}
                      {r.status === "error"      && <AlertCircle size={18} className="text-red-500" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.file.name}</p>
                        <FileTypeBadge filename={r.file.name} />
                      </div>
                      <p className="text-xs text-gray-400">
                        {(r.file.size / 1024).toFixed(1)} KB
                        {r.status === "error" && r.error && (
                          <span className="text-red-500 ml-2">{r.error}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {r.status === "done" && (
                        <>
                          {r.summary && (
                            <button
                              onClick={() => setSummaryIdx(summaryIdx === idx ? null : idx)}
                              className={`flex items-center gap-1 px-2 py-1 text-[11px] border rounded-md transition-colors ${
                                summaryIdx === idx
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <Sparkles size={11} />
                              AI 요약
                              {summaryIdx === idx ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                          )}
                          <button
                            onClick={() => setPreviewIdx(previewIdx === idx ? null : idx)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                          >
                            <Eye size={11} />
                            미리보기
                          </button>
                          <button
                            onClick={() => downloadHtml(idx)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                          >
                            <Download size={11} />
                            HTML
                          </button>
                          <button
                            onClick={() => downloadPdf(idx)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
                          >
                            <Download size={11} />
                            PDF
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => removeFile(idx)}
                        disabled={r.status === "converting"}
                        className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 인라인 AI 요약 패널 */}
                  {summaryIdx === idx && r.summary && (
                    <div className="mx-4 mb-4 mt-1 rounded-xl border border-indigo-100 bg-indigo-50 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-indigo-100 bg-indigo-100/60">
                        <Sparkles size={13} className="text-indigo-600" />
                        <span className="text-xs font-semibold text-indigo-800">AI 요약 · {r.file.name}</span>
                      </div>
                      <div className="px-5 py-4">
                        <SummaryText text={r.summary} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 미리보기 */}
        {previewIdx !== null && results[previewIdx]?.html && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">
                미리보기: {results[previewIdx].file.name}
              </h2>
              <button
                onClick={() => setPreviewIdx(null)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <iframe
                srcDoc={results[previewIdx].html}
                className="w-full border border-gray-100 rounded-lg"
                style={{ minHeight: 400 }}
                title="미리보기"
                onLoad={(e) => {
                  const iframe = e.currentTarget;
                  const height = iframe.contentDocument?.documentElement?.scrollHeight;
                  if (height) iframe.style.height = `${height + 32}px`;
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

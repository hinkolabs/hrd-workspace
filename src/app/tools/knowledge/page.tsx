"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Send,
  Loader2,
  BookOpen,
  Trash2,
  FileText,
  Upload,
  X,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

type Doc = {
  id: string;
  title: string;
  content: string | null;
  file_type?: string;
  chunk_count: number;
  created_at: string;
};
type QA = { question: string; answer: string; sources: string[] };

const FILE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  text: { label: "텍스트", color: "bg-gray-100 text-gray-600" },
  txt: { label: "TXT", color: "bg-gray-100 text-gray-700" },
  md: { label: "MD", color: "bg-purple-100 text-purple-700" },
  csv: { label: "CSV", color: "bg-green-100 text-green-700" },
  pdf: { label: "PDF", color: "bg-red-100 text-red-700" },
  hwp: { label: "HWP", color: "bg-blue-100 text-blue-700" },
  hwpx: { label: "HWPX", color: "bg-blue-100 text-blue-700" },
  doc: { label: "DOC", color: "bg-sky-100 text-sky-700" },
  docx: { label: "DOCX", color: "bg-sky-100 text-sky-700" },
};

function DocTypeBadge({ fileType }: { fileType?: string }) {
  const info = FILE_TYPE_LABELS[fileType || "text"] || {
    label: (fileType || "text").toUpperCase(),
    color: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded ${info.color}`}>
      {info.label}
    </span>
  );
}

const SCENARIO_PRESETS = [
  { key: "", label: "기본 모드", description: "인재개발실 AI 지식 도우미" },
];

export default function KnowledgePage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<"text" | "file">("file");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [history, setHistory] = useState<QA[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [scenarioContext, setScenarioContext] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchDocs = useCallback(async () => {
    const res = await fetch("/api/tools/knowledge");
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    const res = await fetch("/api/tools/knowledge/history");
    if (res.ok) setHistory(await res.json());
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    fetchDocs();
    fetchHistory();
  }, [fetchDocs, fetchHistory]);

  // 새 답변 추가 시 하단 스크롤
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, asking]);

  async function clearHistory() {
    if (!confirm("대화 히스토리를 모두 삭제할까요?")) return;
    setClearing(true);
    await fetch("/api/tools/knowledge/history", { method: "DELETE" });
    setHistory([]);
    setClearing(false);
  }

  async function addDocumentText() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tools/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      if (res.ok) {
        resetForm();
        fetchDocs();
      }
    } finally {
      setSaving(false);
    }
  }

  async function addDocumentFile() {
    if (!uploadFile) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (title.trim()) formData.append("title", title.trim());

      const res = await fetch("/api/tools/knowledge", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        resetForm();
        fetchDocs();
      } else {
        const err = await res.json();
        alert(err.error || "업로드 실패");
      }
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setTitle("");
    setContent("");
    setUploadFile(null);
    setShowUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deleteDocument(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/tools/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
      }
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  }

  async function askQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setAsking(true);
    try {
      const res = await fetch("/api/tools/knowledge/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (res.ok) {
        const data = await res.json();
        setHistory((prev) => [...prev, { question: q, answer: data.answer, sources: data.sources }]);
      }
    } finally {
      setAsking(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    if (!title.trim()) setTitle(file.name);
  }

  function handleLegacyTextFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTitle(file.name);
    const reader = new FileReader();
    reader.onload = () => setContent(reader.result as string);
    reader.readAsText(file);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-xl font-bold text-gray-900">지식 베이스</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          팀 문서를 등록하고 AI에게 질문하세요 (PDF, HWP, TXT, MD, CSV 지원)
        </p>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* 좌측: 문서 목록 */}
        <div className="lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col bg-white">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">
              등록된 문서 ({docs.length})
            </span>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {showUpload ? <X size={12} /> : <Plus size={12} />}
              {showUpload ? "닫기" : "추가"}
            </button>
          </div>

          {showUpload && (
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              {/* 모드 토글 */}
              <div className="flex gap-1 mb-3 p-0.5 bg-gray-200 rounded-lg">
                <button
                  onClick={() => setUploadMode("file")}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                    uploadMode === "file"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Upload size={10} className="inline mr-1" />
                  파일 업로드
                </button>
                <button
                  onClick={() => setUploadMode("text")}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                    uploadMode === "text"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <FileText size={10} className="inline mr-1" />
                  텍스트 입력
                </button>
              </div>

              <input
                type="text"
                placeholder="문서 제목 (선택)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 focus:border-indigo-400 focus:outline-none"
              />

              {uploadMode === "file" ? (
                <div className="mb-2">
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.csv,.pdf,.hwp,.hwpx,.doc,.docx,.rtf,.json,.xml"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText size={16} className="text-indigo-500" />
                        <div className="text-left">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {uploadFile.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {(uploadFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="p-0.5 text-gray-400 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={20} className="mx-auto text-gray-300 mb-1" />
                        <p className="text-[11px] text-gray-500">
                          PDF, HWP, DOC, TXT, MD, CSV
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={addDocumentFile}
                    disabled={saving || !uploadFile}
                    className="w-full mt-2 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg disabled:opacity-50 font-medium"
                  >
                    {saving ? "업로드 중..." : "등록"}
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    placeholder="문서 내용을 붙여넣으세요"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 resize-none focus:border-indigo-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 px-2 py-1 text-[10px] border border-gray-200 rounded cursor-pointer hover:bg-gray-100">
                      <FileText size={10} /> 텍스트 파일
                      <input
                        type="file"
                        accept=".txt,.md,.csv"
                        onChange={handleLegacyTextFile}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={addDocumentText}
                      disabled={saving || !title.trim() || !content.trim()}
                      className="ml-auto px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg disabled:opacity-50 font-medium"
                    >
                      {saving ? "저장..." : "등록"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">
                <BookOpen size={24} className="mx-auto mb-2 text-gray-300" />
                문서를 등록해주세요
              </div>
            ) : (
              docs.map((doc) => (
                <div
                  key={doc.id}
                  className="group p-2.5 rounded-lg hover:bg-gray-50 transition-colors mb-1 relative"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate min-w-0 flex-1">
                          {doc.title}
                        </p>
                        <span className="shrink-0"><DocTypeBadge fileType={doc.file_type} /></span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(doc.created_at).toLocaleDateString("ko-KR")} · 청크{" "}
                        {doc.chunk_count}개
                      </p>
                    </div>

                    {deleteConfirm === doc.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          disabled={deleting === doc.id}
                          className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded font-medium hover:bg-red-600 disabled:opacity-50"
                        >
                          {deleting === doc.id ? "..." : "삭제"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-1.5 py-0.5 text-[10px] border border-gray-200 rounded text-gray-500 hover:bg-gray-100"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(doc.id)}
                        className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="문서 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 우측: Q&A */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Q&A 상단 바 */}
          <div className="px-4 sm:px-6 py-2 border-b border-gray-100 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">
                {historyLoading ? "불러오는 중..." : history.length > 0 ? `대화 ${history.length}건` : "대화 내역 없음"}
              </span>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  disabled={clearing}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                >
                  <RotateCcw size={11} />
                  {clearing ? "삭제 중..." : "히스토리 초기화"}
                </button>
              )}
            </div>
            {/* Scenario Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => setScenarioContext(preset.key)}
                  title={preset.description}
                  className={`shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    scenarioContext === preset.key
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {historyLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Brain size={36} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">
                    등록된 문서를 기반으로 AI에게 질문하세요
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    예: &quot;작년 AI교육 예산은?&quot;, &quot;교육장 예약 절차&quot;
                  </p>
                  {docs.length === 0 && !loading && (
                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                      <AlertCircle size={12} />
                      먼저 좌측에서 문서를 등록해주세요
                    </div>
                  )}
                </div>
              </div>
            ) : (
              history.map((qa, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm max-w-[75%]">
                      {qa.question}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md text-sm max-w-[85%] shadow-sm">
                      <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {qa.answer}
                      </div>
                      {qa.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-[10px] text-gray-400">참고 문서:</p>
                          {qa.sources.map((s, j) => (
                            <span
                              key={j}
                              className="inline-block text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-1 mt-1"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {asking && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl text-sm shadow-sm flex items-center gap-2 text-gray-400">
                  <Loader2 size={14} className="animate-spin" /> 문서 검색 중...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <div className="px-4 sm:px-6 py-3 bg-white border-t border-gray-200 shrink-0">
            <form onSubmit={askQuestion} className="flex items-center gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="문서에 대해 질문하세요..."
                disabled={asking}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none bg-gray-50"
              />
              <button
                type="submit"
                disabled={!question.trim() || asking}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Brain(props: { size: number; className?: string }) {
  return (
    <svg
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}

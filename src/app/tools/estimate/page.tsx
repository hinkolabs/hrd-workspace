"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  ArrowRight,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Star,
  Globe,
  ChevronDown,
} from "lucide-react";

// ── 견적 비교 타입 ──────────────────────────────────────────────
type VendorInput = { name: string; content: string };
type CompareResult = {
  summary: string;
  recommendation: string;
  categories: string[];
  vendors: {
    name: string;
    values: Record<string, string>;
    total: string;
    pros: string[];
    cons: string[];
  }[];
};

// ── 견적 분석 타입 ──────────────────────────────────────────────
type AnalyzeItem = {
  name: string;
  amount: string;
  status: "ok" | "warning" | "remove";
  feedback: string;
  reasoning: string;
  calculation: string;
  suggestion: string;
  isHighlighted: boolean;
};
type PlanAdjustment = {
  name: string;
  before: string;
  after: string;
  reason: string;
};
type AnalyzePlan = {
  id: "A" | "B" | "C";
  title: string;
  description: string;
  estimatedTotal: string;
  savings: string;
  adjustments: PlanAdjustment[];
  pros: string[];
  cons: string[];
};
type AnalyzeResult = {
  summary: string;
  totalAmount: string;
  overallRisk: "low" | "medium" | "high";
  items: AnalyzeItem[];
  generalFeedback: string[];
  riskItems: string[];
  comparisonInsights: string[];
  plans: AnalyzePlan[];
  recommendedPlan: string;
  recommendationReason: string;
  marketResearch: string;
  highlightCount: number;
  hasRefDocs: boolean;
  analysisId?: string;
};

// ── 히스토리 타입 ────────────────────────────────────────────────
type HistoryItem = {
  id: string;
  title: string;
  file_name: string | null;
  result: AnalyzeResult;
  created_at: string;
};

// ── 탭 ─────────────────────────────────────────────────────────
type Tab = "compare" | "analyze" | "history";

// ── 견적 비교 컴포넌트 ──────────────────────────────────────────
function CompareTab() {
  const [items, setItems] = useState<VendorInput[]>([
    { name: "", content: "" },
    { name: "", content: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState("");

  function updateItem(idx: number, field: keyof VendorInput, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { name: "", content: "" }]);
  }
  function removeItem(idx: number) {
    if (items.length <= 2) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function compare() {
    if (items.some((it) => !it.name.trim() || !it.content.trim())) {
      setError("모든 업체명과 견적 내용을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/tools/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "분석 실패");
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500">업체 {i + 1}</span>
              {items.length > 2 && (
                <button
                  onClick={() => removeItem(i)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="업체명"
              value={item.name}
              onChange={(e) => updateItem(i, "name", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-2 focus:border-indigo-400 focus:outline-none"
            />
            <textarea
              placeholder="견적서 내용을 붙여넣으세요 (텍스트, 항목별 가격 등)"
              value={item.content}
              onChange={(e) => updateItem(i, "content", e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg resize-none focus:border-indigo-400 focus:outline-none bg-gray-50"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Plus size={13} />
          업체 추가
        </button>
        <button
          onClick={compare}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
          {loading ? "AI 분석 중..." : "비교 분석하기"}
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-2">분석 요약</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
            <div className="mt-3 p-3 bg-indigo-50 rounded-xl">
              <p className="text-sm font-medium text-indigo-800">{result.recommendation}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">항목별 비교표</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs whitespace-nowrap">항목</th>
                    {result.vendors.map((v) => (
                      <th key={v.name} className="text-left px-4 py-3 font-semibold text-gray-600 text-xs whitespace-nowrap">
                        {v.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.categories.map((cat) => (
                    <tr key={cat} className="border-t border-gray-100">
                      <td className="px-4 py-2.5 font-medium text-gray-700 text-xs whitespace-nowrap">{cat}</td>
                      {result.vendors.map((v) => (
                        <td key={v.name} className="px-4 py-2.5 text-gray-600 text-xs">
                          {v.values[cat] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                    <td className="px-4 py-3 text-gray-700 text-xs">합계</td>
                    {result.vendors.map((v) => (
                      <td key={v.name} className="px-4 py-3 text-indigo-600 text-xs">{v.total}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.vendors.map((v) => (
              <div key={v.name} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">{v.name}</h3>
                {v.pros.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-green-600 mb-1 flex items-center gap-1">
                      <ThumbsUp size={10} /> 장점
                    </p>
                    {v.pros.map((p, i) => (
                      <p key={i} className="text-xs text-gray-600 ml-4">• {p}</p>
                    ))}
                  </div>
                )}
                {v.cons.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-red-500 mb-1 flex items-center gap-1">
                      <ThumbsDown size={10} /> 단점
                    </p>
                    {v.cons.map((c, i) => (
                      <p key={i} className="text-xs text-gray-600 ml-4">• {c}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 상태 뱃지 ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: AnalyzeItem["status"] }) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
        <CheckCircle size={10} /> 적정
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">
        <AlertTriangle size={10} /> 검토 필요
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600">
      <XCircle size={10} /> 제외 권고
    </span>
  );
}

function RiskBadge({ risk }: { risk: AnalyzeResult["overallRisk"] }) {
  const map = {
    low: { label: "위험도 낮음", cls: "bg-green-100 text-green-700" },
    medium: { label: "위험도 보통", cls: "bg-yellow-100 text-yellow-700" },
    high: { label: "위험도 높음", cls: "bg-red-100 text-red-600" },
  };
  const { label, cls } = map[risk] ?? map.medium;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <AlertCircle size={12} />
      {label}
    </span>
  );
}

// ── 웹 검색 결과 섹션 ────────────────────────────────────────────
function MarketResearchSection({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe size={15} className="text-indigo-500" />
          <span className="text-sm font-semibold text-gray-900">웹 검색 시장 가격 조사</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            검토 필요·제외 권고 항목 대상
          </span>
        </div>
        <ChevronDown
          size={15}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mt-4">{content}</p>
        </div>
      )}
    </div>
  );
}

// ── 검토 플랜 섹션 ────────────────────────────────────────────────
const PLAN_COLORS: Record<string, { border: string; bg: string; badge: string; text: string }> = {
  A: { border: "border-orange-200", bg: "bg-orange-50/50", badge: "bg-orange-100 text-orange-700", text: "text-orange-700" },
  B: { border: "border-indigo-200", bg: "bg-indigo-50/50", badge: "bg-indigo-600 text-white", text: "text-indigo-700" },
  C: { border: "border-emerald-200", bg: "bg-emerald-50/50", badge: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" },
};

function PlansSection({
  plans,
  recommendedPlan,
  recommendationReason,
}: {
  plans: AnalyzePlan[];
  recommendedPlan: string;
  recommendationReason: string;
}) {
  return (
    <div className="space-y-3">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2 px-1">
        <Star size={15} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-gray-900">검토 방향 플랜</h2>
        <span className="text-[10px] text-gray-400">이 견적을 어떻게 처리할지 3가지 접근법</span>
      </div>

      {/* 추천 플랜 배너 */}
      {recommendedPlan && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <Star size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-0.5">
              권고: 플랜 {recommendedPlan}
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">{recommendationReason}</p>
          </div>
        </div>
      )}

      {/* 플랜 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {plans.map((plan) => {
          const colors = PLAN_COLORS[plan.id] ?? PLAN_COLORS.C;
          const isRecommended = plan.id === recommendedPlan;
          return (
            <PlanCard key={plan.id} plan={plan} colors={colors} isRecommended={isRecommended} />
          );
        })}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  colors,
  isRecommended,
}: {
  plan: AnalyzePlan;
  colors: { border: string; bg: string; badge: string; text: string };
  isRecommended: boolean;
}) {
  const [open, setOpen] = useState(isRecommended);

  // savings가 "변경 없음"이거나 비어있으면 절감 배지 숨김
  const showSavings = plan.savings && plan.savings !== "변경 없음" && !plan.savings.includes("없음");
  const isKeep = plan.savings?.includes("변경 없음") || plan.savings?.includes("유지");

  return (
    <div
      className={`rounded-2xl border-2 ${isRecommended ? colors.border : "border-gray-200"} ${isRecommended ? colors.bg : "bg-white"} shadow-sm overflow-hidden`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isRecommended ? colors.badge : "bg-gray-100 text-gray-600"}`}>
            플랜 {plan.id}
            {isRecommended && " ★ 권고"}
          </span>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
        <p className="text-sm font-semibold text-gray-900 mb-1">{plan.title}</p>
        <p className={`text-xs font-medium ${isRecommended ? colors.text : "text-gray-500"}`}>
          {plan.estimatedTotal}
        </p>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-600 leading-relaxed">{plan.description}</p>

          {/* 금액 변동 표시 — 절감이 있을 때는 주황, 현행 유지면 초록 */}
          {plan.savings && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${isKeep ? "bg-emerald-50" : "bg-orange-50"}`}>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${isKeep ? "text-emerald-700" : "text-orange-700"}`}>
                {isKeep ? "금액 현행 유지" : "금액 조정"}
              </span>
              {showSavings && (
                <span className={`text-xs font-bold ${isKeep ? "text-emerald-700" : "text-orange-700"}`}>{plan.savings}</span>
              )}
            </div>
          )}

          {plan.adjustments && plan.adjustments.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                항목별 검토 결정
              </p>
              <div className="space-y-2">
                {plan.adjustments.map((adj, i) => {
                  const isKept = adj.after === "현행 유지" || adj.after?.includes("유지");
                  const isRemoved = adj.after === "제외";
                  return (
                    <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                        <span className="text-[11px] font-semibold text-gray-700">{adj.name}</span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-gray-400">{adj.before}</span>
                          <span className="text-gray-300">→</span>
                          <span className={`font-bold ${isRemoved ? "text-red-600" : isKept ? "text-emerald-600" : "text-indigo-600"}`}>
                            {adj.after}
                          </span>
                        </div>
                      </div>
                      {adj.reason && (
                        <div className="px-3 py-2 bg-white">
                          <p className="text-[11px] text-gray-600 leading-relaxed">{adj.reason}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {plan.pros.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-green-600 mb-1">장점</p>
                {plan.pros.map((p, i) => (
                  <p key={i} className="text-[11px] text-gray-600">• {p}</p>
                ))}
              </div>
            )}
            {plan.cons.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-red-500 mb-1">단점</p>
                {plan.cons.map((c, i) => (
                  <p key={i} className="text-[11px] text-gray-600">• {c}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 견적 분석 컴포넌트 ──────────────────────────────────────────
function FileChip({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 bg-indigo-50 rounded-xl">
      <div className="flex items-center gap-2 min-w-0">
        <FileText size={14} className="text-indigo-500 shrink-0" />
        <span className="text-xs text-indigo-800 font-medium truncate">{file.name}</span>
        <span className="text-[10px] text-indigo-400 shrink-0">
          ({(file.size / 1024).toFixed(0)} KB)
        </span>
      </div>
      <button
        onClick={onRemove}
        className="p-1 text-indigo-300 hover:text-red-500 transition-colors shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function AnalyzeTab() {
  const [text, setText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [refDocs, setRefDocs] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  }

  function handleRefChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setRefDocs((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  async function analyze() {
    if (!file && !text.trim()) {
      setError("견적서 파일을 업로드하거나 텍스트를 붙여넣으세요.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("text", text);
      refDocs.forEach((d) => formData.append("refDoc", d));

      const res = await fetch("/api/tools/estimate/analyze", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error || "분석 실패");
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 견적서 파일 업로드 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-700">견적서</p>
          {file && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
              PDF 형광 표시 자동 감지
            </span>
          )}
        </div>
        {file ? (
          <FileChip file={file} onRemove={() => setFile(null)} />
        ) : (
          <div
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={20} className="mx-auto text-gray-400 mb-1.5" />
            <p className="text-xs text-gray-600">
              파일을 드래그하거나 <span className="text-indigo-600 font-medium">클릭하여 선택</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">PDF, HWP, DOCX, TXT · PDF 형광 표시 자동 감지</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.hwp,.hwpx,.doc,.docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* 텍스트 붙여넣기 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-700">
            텍스트 직접 입력 {file ? "(파일 내용에 추가)" : ""}
          </p>
          <button
            onClick={() => setShowTextInput((v) => !v)}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {showTextInput ? "접기" : "펼치기"}
          </button>
        </div>
        {showTextInput && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="견적서 내용을 붙여넣으세요. 항목명, 수량, 단가, 합계 등이 포함될수록 분석 정확도가 높아집니다."
            rows={6}
            autoFocus
            className="w-full mt-3 px-3 py-2.5 text-xs border border-gray-200 rounded-xl resize-none focus:border-indigo-400 focus:outline-none bg-gray-50 leading-relaxed"
          />
        )}
        {!showTextInput && (
          <p className="text-[10px] text-gray-400 mt-1">
            파일 없이 텍스트만 붙여넣을 때 사용하세요
          </p>
        )}
      </div>

      {/* 비교 참고 문서 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-700">비교 참고 문서 (선택, 최대 5건)</p>
          {refDocs.length < 5 && (
            <button
              onClick={() => refInputRef.current?.click()}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Plus size={12} /> 추가
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mb-3">
          유사 교육 견적서, 시장 단가표 등을 올리면 비교 분석 결과를 함께 제공합니다.
        </p>
        {refDocs.length > 0 ? (
          <div className="space-y-2">
            {refDocs.map((f, i) => (
              <FileChip
                key={i}
                file={f}
                onRemove={() => setRefDocs((prev) => prev.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>
        ) : (
          <div
            className="border border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => refInputRef.current?.click()}
          >
            <p className="text-xs text-gray-400">
              비교할 참고 문서를 추가하세요 <span className="text-indigo-500">(PDF, HWP, DOCX, TXT)</span>
            </p>
          </div>
        )}
        <input
          ref={refInputRef}
          type="file"
          accept=".pdf,.hwp,.hwpx,.doc,.docx,.txt"
          multiple
          className="hidden"
          onChange={handleRefChange}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={analyze}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
          {loading ? "AI 분석 중..." : "견적 분석하기"}
        </button>
        {loading && (
          <p className="text-xs text-gray-400">
            시장 단가 조사 → 인재개발실 기준 대조 → o3 심층 분석 순으로 진행됩니다 (1~3분 소요)
          </p>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

      {/* 자동 저장 알림 */}
      {result?.analysisId && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
          <CheckCircle size={14} className="text-green-600 shrink-0" />
          <p className="text-xs text-green-700">
            분석 결과가 히스토리에 자동 저장되었습니다. <span className="font-medium">&apos;분석 히스토리&apos;</span> 탭에서 다시 확인할 수 있습니다.
          </p>
        </div>
      )}

      {/* 분석 결과 */}
      {result && <AnalyzeResultView result={result} />}
    </div>
  );
}

// ── 분석 결과 표시 (공통: AnalyzeTab + HistoryTab에서 재사용) ───
function AnalyzeResultView({ result }: { result: AnalyzeResult }) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  function toggleExpand(idx: number) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  const okCount = result.items.filter((i) => i.status === "ok").length;
  const warnCount = result.items.filter((i) => i.status === "warning").length;
  const removeCount = result.items.filter((i) => i.status === "remove").length;
  const highlightedCount = result.items.filter((i) => i.isHighlighted).length;

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-base font-semibold text-gray-900">분석 결과</h2>
          <RiskBadge risk={result.overallRisk} />
        </div>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">{result.summary}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {result.totalAmount && (
            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
              총 금액: {result.totalAmount}
            </span>
          )}
          {okCount > 0 && (
            <span className="px-3 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700">
              적정 {okCount}건
            </span>
          )}
          {warnCount > 0 && (
            <span className="px-3 py-1 bg-yellow-100 rounded-full text-xs font-medium text-yellow-700">
              검토 필요 {warnCount}건
            </span>
          )}
          {removeCount > 0 && (
            <span className="px-3 py-1 bg-red-100 rounded-full text-xs font-medium text-red-600">
              제외 권고 {removeCount}건
            </span>
          )}
          {(result.highlightCount ?? 0) > 0 && (
            <span className="px-3 py-1 bg-amber-100 rounded-full text-xs font-medium text-amber-700">
              형광 표시 {result.highlightCount}곳 감지
            </span>
          )}
          {result.hasRefDocs && (
            <span className="px-3 py-1 bg-purple-100 rounded-full text-xs font-medium text-purple-700">
              비교 문서 분석 포함
            </span>
          )}
        </div>
      </div>

      {/* 항목별 피드백 */}
      {result.items.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">항목별 검토 결과</h2>
            <span className="text-[10px] text-gray-400">항목 클릭 시 판단 근거 확인</span>
          </div>
          <div className="divide-y divide-gray-100">
            {result.items.map((item, i) => {
              const expanded = expandedItems.has(i);
              return (
                <div
                  key={i}
                  className={`${
                    item.status === "remove"
                      ? "bg-red-50/40"
                      : item.status === "warning"
                      ? "bg-yellow-50/40"
                      : ""
                  }`}
                >
                  <button
                    className="w-full text-left p-4 hover:bg-black/[0.02] transition-colors"
                    onClick={() => toggleExpand(i)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <StatusBadge status={item.status} />
                        {item.isHighlighted && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                            ★ 형광 표시
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-800">{item.name}</span>
                        {item.amount && (
                          <span className="text-xs text-gray-500">{item.amount}</span>
                        )}
                      </div>
                      <ChevronRight
                        size={14}
                        className={`text-gray-400 shrink-0 mt-0.5 transition-transform ${expanded ? "rotate-90" : ""}`}
                      />
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mt-1.5 text-left">
                      {item.feedback}
                    </p>
                  </button>

                  {expanded && (item.reasoning || item.calculation || item.suggestion) && (
                    <div className={`px-4 pb-4 pt-3 border-t space-y-3 ${
                      item.status === "remove"
                        ? "border-red-100 bg-red-50/60"
                        : item.status === "warning"
                        ? "border-yellow-100 bg-yellow-50/60"
                        : "border-gray-100 bg-gray-50/60"
                    }`}>
                      {item.reasoning && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            판단 근거
                          </p>
                          <p className="text-xs text-gray-700 leading-relaxed">{item.reasoning}</p>
                        </div>
                      )}
                      {item.calculation && (
                        <div className="bg-blue-50 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-1">
                            단가 계산
                          </p>
                          <p className="text-xs text-blue-800 leading-relaxed font-mono whitespace-pre-wrap">{item.calculation}</p>
                        </div>
                      )}
                      {item.suggestion && (
                        <div className="bg-indigo-50 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                            개선 제안
                          </p>
                          <p className="text-xs text-indigo-800 leading-relaxed">{item.suggestion}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 형광 표시 안내 */}
      {highlightedCount > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1.5">
            ★ 형광 표시 항목 {highlightedCount}건 집중 분석
          </p>
          <p className="text-xs text-amber-600">
            위 항목 목록에서 <span className="font-semibold">★ 형광 표시</span> 뱃지가 붙은 항목들은 PDF에서 검토자가 표시한 부분으로, 판단 근거를 클릭하여 상세 분석을 확인하세요.
          </p>
        </div>
      )}

      {/* 비교 문서 분석 */}
      {result.comparisonInsights && result.comparisonInsights.length > 0 && (
        <div className="bg-purple-50 rounded-2xl border border-purple-100 p-5">
          <h2 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-1.5">
            <FileText size={14} />
            비교 문서 대비 분석
          </h2>
          <ul className="space-y-2">
            {result.comparisonInsights.map((item, i) => (
              <li key={i} className="text-xs text-purple-700 flex items-start gap-1.5 leading-relaxed">
                <span className="text-purple-400 shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 위험 항목 */}
      {result.riskItems.length > 0 && (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
          <h2 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            반드시 검토 필요
          </h2>
          <ul className="space-y-2">
            {result.riskItems.map((item, i) => (
              <li key={i} className="text-xs text-red-700 flex items-start gap-1.5 leading-relaxed">
                <span className="text-red-400 shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 전반적 개선 제안 */}
      {result.generalFeedback.length > 0 && (
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
          <h2 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-1.5">
            <AlertCircle size={14} />
            개선 제안
          </h2>
          <ul className="space-y-2">
            {result.generalFeedback.map((item, i) => (
              <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5 leading-relaxed">
                <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 웹 검색 시장 가격 조사 */}
      {result.marketResearch && (
        <MarketResearchSection content={result.marketResearch} />
      )}

      {/* 대안 플랜 A / B / C */}
      {result.plans && result.plans.length > 0 && (
        <PlansSection
          plans={result.plans}
          recommendedPlan={result.recommendedPlan}
          recommendationReason={result.recommendationReason}
        />
      )}
    </div>
  );
}

// ── 히스토리 탭 ─────────────────────────────────────────────────
function HistoryTab() {
  const [list, setList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch("/api/tools/estimate/history");
      if (res.ok) setList(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("이 분석 기록을 삭제하시겠습니까?")) return;
    setDeletingId(id);
    await fetch(`/api/tools/estimate/history/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    setList((prev) => prev.filter((item) => item.id !== id));
    setDeletingId(null);
  }

  async function loadDetail(item: HistoryItem) {
    const res = await fetch(`/api/tools/estimate/history/${item.id}`);
    if (res.ok) {
      const data = await res.json();
      setSelected(data);
    }
  }

  useEffect(() => { fetchList(); }, []);

  const riskMap = {
    low: { label: "위험도 낮음", cls: "bg-green-100 text-green-700" },
    medium: { label: "위험도 보통", cls: "bg-yellow-100 text-yellow-700" },
    high: { label: "위험도 높음", cls: "bg-red-100 text-red-600" },
  };

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            <ChevronRight size={13} className="rotate-180" />
            목록으로
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{selected.title}</h3>
            <p className="text-[10px] text-gray-400">
              {new Date(selected.created_at).toLocaleString("ko-KR")}
              {selected.file_name && ` · ${selected.file_name}`}
            </p>
          </div>
          <button
            onClick={() => deleteItem(selected.id)}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <Trash2 size={13} />
            삭제
          </button>
        </div>
        <AnalyzeResultView result={selected.result} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText size={32} className="text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">저장된 분석 결과가 없습니다</p>
        <p className="text-xs text-gray-400 mt-1">견적 분석을 실행하면 자동으로 저장됩니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-500">총 {list.length}건의 분석 기록</p>
        <button onClick={fetchList} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
          새로고침
        </button>
      </div>
      {list.map((item) => {
        const risk = (item.result?.overallRisk ?? "medium") as keyof typeof riskMap;
        const { label, cls } = riskMap[risk] ?? riskMap.medium;
        const okCount = item.result?.items?.filter((i) => i.status === "ok").length ?? 0;
        const warnCount = item.result?.items?.filter((i) => i.status === "warning").length ?? 0;
        const removeCount = item.result?.items?.filter((i) => i.status === "remove").length ?? 0;
        return (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-3">
              <button
                className="flex-1 text-left min-w-0"
                onClick={() => loadDetail(item)}
              >
                <p className="text-sm font-semibold text-gray-900 truncate mb-0.5">{item.title}</p>
                {item.file_name && (
                  <p className="text-[10px] text-gray-400 truncate mb-2 flex items-center gap-1">
                    <FileText size={10} />
                    {item.file_name}
                  </p>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                  {item.result?.totalAmount && (
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {item.result.totalAmount}
                    </span>
                  )}
                  {okCount > 0 && (
                    <span className="text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full">적정 {okCount}</span>
                  )}
                  {warnCount > 0 && (
                    <span className="text-[10px] text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">검토 {warnCount}</span>
                  )}
                  {removeCount > 0 && (
                    <span className="text-[10px] text-red-600 bg-red-100 px-2 py-0.5 rounded-full">제외 {removeCount}</span>
                  )}
                </div>
              </button>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="text-[10px] text-gray-400 whitespace-nowrap">
                  {new Date(item.created_at).toLocaleDateString("ko-KR")}
                </p>
                <button
                  onClick={() => deleteItem(item.id)}
                  disabled={deletingId === item.id}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                >
                  {deletingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 페이지 ─────────────────────────────────────────────────
export default function EstimatePage() {
  const [activeTab, setActiveTab] = useState<Tab>("compare");

  const tabs: { id: Tab; label: string; desc: string }[] = [
    { id: "compare", label: "견적 비교", desc: "여러 업체 견적을 비교 분석" },
    { id: "analyze", label: "견적 분석", desc: "인재개발실 기준으로 견적 검토" },
    { id: "history", label: "분석 히스토리", desc: "과거 분석 결과 조회" },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-xl font-bold text-gray-900">견적</h1>
        <p className="text-sm text-gray-500 mt-0.5">AI 기반 견적 비교 및 분석 도구</p>

        {/* 탭 */}
        <div className="flex gap-1 mt-4 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {tabs.find((t) => t.id === activeTab)?.desc}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {activeTab === "compare" && <CompareTab />}
        {activeTab === "analyze" && <AnalyzeTab />}
        {activeTab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}

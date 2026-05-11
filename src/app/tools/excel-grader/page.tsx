"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Trophy,
  UploadCloud,
  XCircle,
} from "lucide-react";
import type { GradeResult, GradeItem, StepResult } from "@/app/api/tools/excel-grader/route";

// ─── 숫자 포맷 ────────────────────────────────────────────────────────────────

function fmt(v: number | string | null): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (Math.abs(v) < 10 && !Number.isInteger(v)) return v.toFixed(4);
  if (Math.abs(v) >= 1_000_000) return new Intl.NumberFormat("ko-KR").format(v);
  return String(v);
}

// ─── 점수 색상 ────────────────────────────────────────────────────────────────

function scoreColor(ratio: number) {
  if (ratio >= 0.9) return "text-emerald-600";
  if (ratio >= 0.7) return "text-amber-500";
  return "text-rose-500";
}

function scoreRingColor(ratio: number) {
  if (ratio >= 0.9) return "stroke-emerald-500";
  if (ratio >= 0.7) return "stroke-amber-400";
  return "stroke-rose-400";
}

// ─── CircleProgress ───────────────────────────────────────────────────────────

function CircleProgress({ score, total }: { score: number; total: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const ratio = total > 0 ? score / total : 0;
  const dash = circ * ratio;
  const pct = Math.round(ratio * 100);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className={`transition-all duration-700 ${scoreRingColor(ratio)}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${scoreColor(ratio)}`}>{pct}%</span>
        <span className="text-sm text-gray-500 font-medium">{score} / {total}</span>
      </div>
    </div>
  );
}

// ─── GradeItemRow ─────────────────────────────────────────────────────────────

function GradeItemRow({ item }: { item: GradeItem }) {
  const [open, setOpen] = useState(false);

  const Icon =
    item.pass === true ? CheckCircle2 :
    item.pass === false ? XCircle :
    CircleDashed;

  const iconColor =
    item.pass === true  ? "text-emerald-500" :
    item.pass === false ? "text-rose-500" :
    "text-gray-300";

  const rowBg =
    item.pass === true  ? "bg-emerald-50/50 border-emerald-100" :
    item.pass === false ? "bg-rose-50/50 border-rose-100" :
    "bg-gray-50 border-gray-100";

  return (
    <div className={`border rounded-lg overflow-hidden text-sm transition-all ${rowBg}`}>
      <button
        onClick={() => item.pass === false && setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left"
      >
        <Icon size={16} className={`flex-none ${iconColor}`} />
        <span className="flex-1 text-gray-700 truncate">{item.label}</span>
        {item.pass === null && (
          <span className="text-xs text-gray-400 mr-1">미작성</span>
        )}
        {item.pass === false && (
          <>
            <span className="text-xs text-rose-400 font-mono mr-1">
              {fmt(item.actual)}
            </span>
            {open ? <ChevronDown size={12} className="text-gray-400 flex-none" /> : <ChevronRight size={12} className="text-gray-400 flex-none" />}
          </>
        )}
        {item.pass === true && (
          <span className="text-xs text-emerald-500 font-mono">
            {fmt(item.actual)}
          </span>
        )}
      </button>

      {/* 오답 상세 */}
      {item.pass === false && open && (
        <div className="px-4 pb-3 border-t border-rose-100 pt-2 space-y-1">
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-gray-400">정답</span>
              <span className="ml-2 font-semibold text-emerald-700 font-mono">{fmt(item.expected)}</span>
            </div>
            <div>
              <span className="text-gray-400">내 답</span>
              <span className="ml-2 font-semibold text-rose-600 font-mono">
                {item.actual === null ? "빈칸" : fmt(item.actual)}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-1 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
            <span className="font-medium flex-none">힌트</span>
            <span className="text-blue-500">{item.hint}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StepCard ─────────────────────────────────────────────────────────────────

const STEP_COLORS: Record<number, { ring: string; badge: string; bar: string }> = {
  1: { ring: "ring-blue-200",   badge: "bg-blue-100 text-blue-700",   bar: "bg-blue-400" },
  2: { ring: "ring-violet-200", badge: "bg-violet-100 text-violet-700", bar: "bg-violet-400" },
  3: { ring: "ring-orange-200", badge: "bg-orange-100 text-orange-700", bar: "bg-orange-400" },
};

function StepCard({ stepResult }: { stepResult: StepResult }) {
  const [expanded, setExpanded] = useState(true);
  const { step, title, items, score, total } = stepResult;
  const ratio = total > 0 ? score / total : 0;
  const c = STEP_COLORS[step];

  const wrong = items.filter((i) => i.pass === false);
  const blank = items.filter((i) => i.pass === null);
  const correct = items.filter((i) => i.pass === true);

  return (
    <div className={`bg-white rounded-xl border ring-1 ${c.ring} shadow-sm overflow-hidden`}>
      {/* 헤더 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
          STEP {step}
        </span>
        <span className="flex-1 text-left font-semibold text-gray-800">{title}</span>

        {/* 미니 진행바 + 점수 */}
        <div className="flex items-center gap-3 mr-2">
          <div className="w-24 h-1.5 rounded-full bg-gray-100 hidden sm:block">
            <div
              className={`h-full rounded-full ${c.bar} transition-all duration-500`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <span className={`text-sm font-bold ${scoreColor(ratio)}`}>
            {score}<span className="text-gray-400 font-normal">/{total}</span>
          </span>
        </div>

        {expanded
          ? <ChevronDown size={16} className="text-gray-400 flex-none" />
          : <ChevronRight size={16} className="text-gray-400 flex-none" />}
      </button>

      {/* 아이템 목록 */}
      {expanded && (
        <div className="px-4 pb-4 space-y-1.5">
          {/* 오답 먼저 */}
          {wrong.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-rose-500 mb-1 flex items-center gap-1">
                <XCircle size={12} /> 오답 {wrong.length}개
              </p>
              {wrong.map((item) => <GradeItemRow key={item.id} item={item} />)}
            </div>
          )}
          {blank.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1">
                <CircleDashed size={12} /> 미작성 {blank.length}개
              </p>
              {blank.map((item) => <GradeItemRow key={item.id} item={item} />)}
            </div>
          )}
          {correct.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold text-emerald-600 mb-1 flex items-center gap-1 list-none">
                <CheckCircle2 size={12} />
                정답 {correct.length}개
                <ChevronDown size={10} className="ml-auto group-open:rotate-180 transition-transform" />
              </summary>
              <div className="space-y-1 mt-1">
                {correct.map((item) => <GradeItemRow key={item.id} item={item} />)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ─── UploadZone ───────────────────────────────────────────────────────────────

function UploadZone({
  onFile,
  loading,
}: {
  onFile: (f: File) => void;
  loading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-4
        w-full max-w-lg mx-auto rounded-2xl border-2 border-dashed
        cursor-pointer transition-all duration-200 py-14 px-8
        ${dragging
          ? "border-blue-400 bg-blue-50 scale-[1.01]"
          : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40"}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {loading ? (
        <>
          <Loader2 size={44} className="text-blue-500 animate-spin" />
          <p className="text-base font-semibold text-blue-600">채점 중…</p>
          <p className="text-sm text-gray-400">잠시만 기다려 주세요</p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
            <FileSpreadsheet size={32} className="text-blue-500" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-700">
              엑셀 파일을 여기에 끌어다 놓거나 클릭하세요
            </p>
            <p className="text-sm text-gray-400 mt-1">
              학생용 실습 파일 <span className="font-mono bg-gray-100 px-1 rounded">.xlsx</span> 만 지원
            </p>
          </div>
          <div className="flex gap-2 text-xs text-gray-400 flex-wrap justify-center">
            <span className="bg-white border rounded px-2 py-0.5">결과작성_STEP1_보고용집계</span>
            <span className="bg-white border rounded px-2 py-0.5">결과작성_STEP2_오류찾기</span>
            <span className="bg-white border rounded px-2 py-0.5">거래원장_RAW (K열)</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExcelGraderPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setResult(null);
    setError(null);
    setFileName(file.name);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/tools/excel-grader", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "서버 오류");
      setResult(data as GradeResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = () => {
    setResult(null);
    setError(null);
    setFileName(null);
  };

  const totalRatio = result
    ? result.totalItems > 0 ? result.totalScore / result.totalItems : 0
    : 0;

  const gradeLabel = (r: number) => {
    if (r >= 0.9) return { label: "우수", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    if (r >= 0.7) return { label: "양호", color: "text-amber-600 bg-amber-50 border-amber-200" };
    if (r >= 0.5) return { label: "보통", color: "text-orange-600 bg-orange-50 border-orange-200" };
    return { label: "재도전", color: "text-rose-600 bg-rose-50 border-rose-200" };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <FileSpreadsheet size={18} className="text-blue-500" />
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                하나증권 AI 교육 · 3교시
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">엑셀 실습 자동 채점</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              로그인 없이 사용 가능
            </span>
            {result && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors"
              >
                <RefreshCw size={14} />
                다시 채점
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* 업로드 (결과 없을 때) */}
        {!result && !loading && (
          <>
            <UploadZone onFile={handleFile} loading={false} />

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle size={14} /> 채점 방법
              </p>
              <ul className="list-disc list-inside space-y-1 text-blue-600 text-xs leading-relaxed">
                <li><strong>결과작성_STEP1</strong> 직원별 집계표와 <strong>거래원장_RAW K열</strong>을 채운 뒤 업로드하세요.</li>
                <li>파일에 수식이 있으면 저장 전 <strong>전체 재계산(Ctrl+Alt+F9)</strong> 후 저장하세요.</li>
                <li>오답 항목을 클릭하면 정답과 힌트를 확인할 수 있습니다.</li>
                <li>STEP 2는 K열 오류 표시(8행) + <strong>결과작성_STEP2</strong> 발견 건수(2개) 모두 채점합니다.</li>
              </ul>
            </div>
          </>
        )}

        {/* 로딩 */}
        {loading && <UploadZone onFile={handleFile} loading={true} />}

        {/* 에러 */}
        {error && (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">
            <AlertCircle size={16} className="flex-none mt-0.5" />
            <div>
              <p className="font-semibold">오류가 발생했습니다</p>
              <p className="text-rose-500 mt-0.5">{error}</p>
              <button onClick={handleReset} className="mt-2 text-xs underline">
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <>
            {/* 누락 시트 경고 */}
            {result.sheetsMissing.length > 0 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                <AlertCircle size={14} className="flex-none mt-0.5" />
                <span>
                  <strong>시트를 찾을 수 없습니다:</strong>{" "}
                  {result.sheetsMissing.join(", ")} — 해당 STEP은 채점에서 제외됩니다.
                </span>
              </div>
            )}

            {/* 총점 카드 */}
            <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6">
              <CircleProgress score={result.totalScore} total={result.totalItems} />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <Trophy size={18} className="text-amber-400" />
                  <span className="text-sm text-gray-500 font-medium">최종 점수</span>
                </div>
                <p className={`text-4xl font-bold ${scoreColor(totalRatio)}`}>
                  {result.totalScore}
                  <span className="text-xl font-normal text-gray-300"> / {result.totalItems}</span>
                </p>
                <div className="mt-3 flex items-center justify-center sm:justify-start gap-3">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full border ${gradeLabel(totalRatio).color}`}>
                    {gradeLabel(totalRatio).label}
                  </span>
                  {fileName && (
                    <span className="text-xs text-gray-400 truncate max-w-[200px]">{fileName}</span>
                  )}
                </div>
                {/* STEP별 미니 요약 */}
                <div className="mt-4 flex gap-3 justify-center sm:justify-start">
                  {result.steps.map((s) => (
                    <div key={s.step} className="text-center">
                      <p className="text-xs text-gray-400">STEP {s.step}</p>
                      <p className={`text-sm font-bold ${scoreColor(s.total > 0 ? s.score / s.total : 0)}`}>
                        {s.score}/{s.total}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* STEP별 상세 */}
            {result.steps.map((s) => (
              <StepCard key={s.step} stepResult={s} />
            ))}

            {/* 마무리 메시지 */}
            <div className="text-center py-4">
              {totalRatio >= 0.9 ? (
                <p className="text-sm text-emerald-600 font-medium">
                  훌륭합니다! AI와 협업해 정확한 결과를 만들어냈네요. 🎉
                </p>
              ) : totalRatio >= 0.7 ? (
                <p className="text-sm text-amber-600 font-medium">
                  잘 했어요. 오답 항목을 클릭해 힌트를 확인하고 수정해보세요.
                </p>
              ) : (
                <p className="text-sm text-rose-500 font-medium">
                  처리상태=정상 조건이 수식에 들어갔는지, RAW 시트 범위(5행~204행)가 맞는지 확인해보세요.
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                채점 시각: {new Date(result.gradeAt).toLocaleString("ko-KR")}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

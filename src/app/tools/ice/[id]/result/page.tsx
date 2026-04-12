"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Download, Zap, CheckCircle2, Clock, AlertCircle,
  Loader2, BarChart2,
} from "lucide-react";

type Score = {
  id: string;
  pain_point: string;
  impact: number;
  confidence: number;
  ease: number;
  note: string | null;
  scored_by: string | null;
  created_at: string;
};

type Session = { id: string; title: string; description: string | null; status: string };

function calcTotal(s: Pick<Score, "impact" | "confidence" | "ease">) {
  return s.impact * s.confidence * s.ease;
}

function getPriority(total: number) {
  if (total >= 500) return { label: "즉시 실행", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: <Zap size={11} className="text-emerald-600" />, groupColor: "emerald" };
  if (total >= 200) return { label: "우선 검토", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: <CheckCircle2 size={11} className="text-indigo-600" />, groupColor: "indigo" };
  if (total >= 100) return { label: "장기 과제", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: <Clock size={11} className="text-amber-600" />, groupColor: "amber" };
  return { label: "보류", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: <AlertCircle size={11} className="text-gray-400" />, groupColor: "gray" };
}

// Simple SVG quadrant chart
function QuadrantChart({ scores }: { scores: Score[] }) {
  const W = 320, H = 280;
  const pad = { t: 30, r: 20, b: 40, l: 50 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;

  function toX(ease: number) { return pad.l + ((ease - 1) / 9) * cw; }
  function toY(impact: number) { return pad.t + ch - ((impact - 1) / 9) * ch; }

  const midX = pad.l + cw / 2;
  const midY = pad.t + ch / 2;

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Background quadrants */}
      <rect x={pad.l} y={pad.t} width={cw / 2} height={ch / 2} fill="#fef9c3" opacity={0.5} />
      <rect x={midX} y={pad.t} width={cw / 2} height={ch / 2} fill="#d1fae5" opacity={0.5} />
      <rect x={pad.l} y={midY} width={cw / 2} height={ch / 2} fill="#fee2e2" opacity={0.5} />
      <rect x={midX} y={midY} width={cw / 2} height={ch / 2} fill="#e0e7ff" opacity={0.5} />

      {/* Quadrant labels */}
      <text x={pad.l + cw * 0.25} y={pad.t + 14} textAnchor="middle" fontSize={9} fill="#92400e" fontWeight="600">장기 과제</text>
      <text x={pad.l + cw * 0.75} y={pad.t + 14} textAnchor="middle" fontSize={9} fill="#065f46" fontWeight="600">Quick Win ★</text>
      <text x={pad.l + cw * 0.25} y={H - pad.b + 18} textAnchor="middle" fontSize={9} fill="#991b1b">보류</text>
      <text x={pad.l + cw * 0.75} y={H - pad.b + 18} textAnchor="middle" fontSize={9} fill="#3730a3">우선 검토</text>

      {/* Axes */}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ch} stroke="#94a3b8" strokeWidth={1} />
      <line x1={pad.l} y1={pad.t + ch} x2={pad.l + cw} y2={pad.t + ch} stroke="#94a3b8" strokeWidth={1} />
      <line x1={midX} y1={pad.t} x2={midX} y2={pad.t + ch} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={pad.l} y1={midY} x2={pad.l + cw} y2={midY} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" />

      {/* Axis labels */}
      <text x={pad.l + cw / 2} y={H - 5} textAnchor="middle" fontSize={10} fill="#64748b">Ease →</text>
      <text x={12} y={pad.t + ch / 2} textAnchor="middle" fontSize={10} fill="#64748b" transform={`rotate(-90, 12, ${pad.t + ch / 2})`}>Impact →</text>

      {/* Points */}
      {scores.map((s, i) => {
        const total = calcTotal(s);
        const x = toX(s.ease);
        const y = toY(s.impact);
        const color = COLORS[i % COLORS.length];
        return (
          <g key={s.id}>
            <circle cx={x} cy={y} r={total >= 500 ? 7 : total >= 200 ? 5.5 : 4} fill={color} fillOpacity={0.8} />
            <text x={x + 9} y={y + 4} fontSize={8} fill="#374151">{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [sRes, scRes] = await Promise.all([
        fetch(`/api/tools/ice/${id}`),
        fetch(`/api/tools/ice/${id}/scores`),
      ]);
      const sData = await sRes.json();
      const scData = await scRes.json();
      setSession(sData.session);
      setScores(scData.scores ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  const sorted = useMemo(
    () => [...scores].sort((a, b) => calcTotal(b) - calcTotal(a)),
    [scores]
  );

  const groups = useMemo(() => ({
    quick:  sorted.filter((s) => calcTotal(s) >= 500),
    prior:  sorted.filter((s) => calcTotal(s) >= 200 && calcTotal(s) < 500),
    long:   sorted.filter((s) => calcTotal(s) >= 100 && calcTotal(s) < 200),
    hold:   sorted.filter((s) => calcTotal(s) < 100),
  }), [sorted]);

  function exportCSV() {
    const header = ["순위", "Pain Point", "Impact", "Confidence", "Ease", "ICE Score", "판정", "메모"];
    const rows = sorted.map((s, i) => [
      i + 1, `"${s.pain_point}"`, s.impact, s.confidence, s.ease,
      calcTotal(s), getPriority(calcTotal(s)).label, `"${s.note ?? ""}"`
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ice_result_${id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center text-gray-400">
      <Loader2 size={20} className="animate-spin mr-2" /> 불러오는 중...
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/tools/ice" className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">{session?.title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">ICE 결과</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 rounded-xl px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> CSV 내보내기
          </button>
          <Link
            href={`/tools/ice/${id}/score`}
            className="flex items-center gap-1.5 text-sm border border-indigo-200 text-indigo-600 rounded-xl px-3 py-1.5 hover:bg-indigo-50 transition-colors"
          >
            <BarChart2 size={14} /> 채점 수정
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "즉시 실행", count: groups.quick.length, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: <Zap size={14} className="text-emerald-600" /> },
            { label: "우선 검토", count: groups.prior.length, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: <CheckCircle2 size={14} className="text-indigo-600" /> },
            { label: "장기 과제", count: groups.long.length, color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: <Clock size={14} className="text-amber-600" /> },
            { label: "보류", count: groups.hold.length, color: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: <AlertCircle size={14} className="text-gray-400" /> },
          ].map(({ label, count, color, bg, icon }) => (
            <div key={label} className={`${bg} border rounded-xl p-3 text-center`}>
              <div className="flex justify-center mb-1">{icon}</div>
              <div className={`text-xl font-extrabold ${color}`}>{count}</div>
              <div className={`text-[10px] font-medium ${color}`}>{label}</div>
            </div>
          ))}
        </div>

        {/* Quadrant chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Impact × Ease 사분면</h2>
          <QuadrantChart scores={sorted} />
        </div>

        {/* Ranking list */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">우선순위 랭킹</h2>
          <div className="space-y-2">
            {sorted.map((s, i) => {
              const total = calcTotal(s);
              const { label, color, bg, icon } = getPriority(total);
              return (
                <div key={s.id} className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i < 3 ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.pain_point}</p>
                    {s.note && <p className="text-xs text-gray-400 truncate mt-0.5">{s.note}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-rose-500 font-medium">I·{s.impact}</span>
                      <span className="text-[10px] text-indigo-500 font-medium">C·{s.confidence}</span>
                      <span className="text-[10px] text-emerald-500 font-medium">E·{s.ease}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-gray-800 tabular-nums">{total}</div>
                    <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${bg} ${color}`}>
                      {icon}{label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

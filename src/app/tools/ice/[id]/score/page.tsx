"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Loader2, Zap, Shield, Wrench, Info,
  CheckCircle2, AlertCircle, Clock, Plus, Trash2, Save,
} from "lucide-react";

type ScoreItem = {
  id?: string;
  pain_point: string;
  source_response_id?: string | null;
  impact: number;
  confidence: number;
  ease: number;
  note: string;
};

function calcTotal(s: Pick<ScoreItem, "impact" | "confidence" | "ease">) {
  return s.impact * s.confidence * s.ease;
}

function getPriority(total: number) {
  if (total >= 500) return { label: "즉시 실행", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: <Zap size={11} className="text-emerald-600" /> };
  if (total >= 200) return { label: "우선 검토", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: <CheckCircle2 size={11} className="text-indigo-600" /> };
  if (total >= 100) return { label: "장기 과제", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: <Clock size={11} className="text-amber-600" /> };
  return { label: "보류", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: <AlertCircle size={11} className="text-gray-400" /> };
}

function uid() { return Math.random().toString(36).slice(2, 9); }

function ScoreSlider({ label, abbr, value, onChange, color, icon }: {
  label: string; abbr: string; value: number;
  onChange: (v: number) => void; color: string; icon: React.ReactNode;
}) {
  const pct = ((value - 1) / 9) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">{icon}<span className="text-[11px] font-semibold text-gray-600">{abbr}</span><span className="text-[10px] text-gray-400">({label})</span></div>
        <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, currentColor ${pct}%, #e5e7eb ${pct}%)` }}
      />
    </div>
  );
}

export default function ScorePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sessionTitle, setSessionTitle] = useState("");
  const [items, setItems] = useState<(ScoreItem & { _uid: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [sRes, scRes] = await Promise.all([
        fetch(`/api/tools/ice/${id}`),
        fetch(`/api/tools/ice/${id}/scores`),
      ]);
      const sData = await sRes.json();
      const scData = await scRes.json();
      setSessionTitle(sData.session?.title ?? "");
      const scores = scData.scores ?? [];
      setItems(
        scores.length > 0
          ? scores.map((s: ScoreItem) => ({ ...s, _uid: uid() }))
          : [{ _uid: uid(), pain_point: "", source_response_id: null, impact: 5, confidence: 5, ease: 5, note: "" }]
      );
      setLoading(false);
    }
    load();
  }, [id]);

  const update = useCallback((uid: string, field: keyof ScoreItem, value: unknown) => {
    setItems((prev) => prev.map((item) => item._uid === uid ? { ...item, [field]: value } : item));
  }, []);

  const addItem = () => setItems((prev) => [...prev, { _uid: uid(), pain_point: "", source_response_id: null, impact: 5, confidence: 5, ease: 5, note: "" }]);
  const removeItem = (uid: string) => setItems((prev) => prev.filter((i) => i._uid !== uid));

  async function handleSave(complete = false) {
    const valid = items.filter((i) => i.pain_point.trim());
    if (valid.length === 0) { alert("Pain Point를 입력해주세요."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/tools/ice/${id}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: valid.map(({ _uid: _, ...s }) => s) }),
      });
      if (!res.ok) throw new Error("저장 실패");
      if (complete) router.push(`/tools/ice/${id}/result`);
      else alert("저장되었습니다.");
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const AXES = [
    { abbr: "I", label: "Impact", color: "text-rose-600", icon: <Zap size={13} className="text-rose-500" />, tips: ["10: 주 5h↑ 절감 or 리스크 직결","7: 주 2~4h 절감","4: 주 1h 이하","1: 체감 효과 미미"] },
    { abbr: "C", label: "Confidence", color: "text-indigo-600", icon: <Shield size={13} className="text-indigo-500" />, tips: ["10: 데이터로 입증 가능","7: 과반이 동일 경험","4: 일부만 경험","1: 추측 수준"] },
    { abbr: "E", label: "Ease", color: "text-emerald-600", icon: <Wrench size={13} className="text-emerald-500" />, tips: ["10: 문서 Q&A (1~2h)","7: 노드 3~5개 워크플로우","4: API 연동 필요","1: 핵심 데이터 없음"] },
  ];

  if (loading) return (
    <div className="h-full flex items-center justify-center text-gray-400">
      <Loader2 size={20} className="animate-spin mr-2" /> 불러오는 중...
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/tools/ice/${id}/responses`} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">{sessionTitle}</h1>
            <p className="text-xs text-gray-500 mt-0.5">ICE 채점</p>
          </div>
          <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
            <Save size={13} /> 임시저장
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700 disabled:opacity-40 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            채점 완료
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 max-w-3xl mx-auto w-full">
        {/* Axis guide cards */}
        <div className="grid grid-cols-3 gap-2">
          {AXES.map(({ abbr, label, icon, color, tips }) => (
            <div key={abbr} className="bg-white border border-gray-200 rounded-xl p-2.5 shadow-sm relative">
              <button onClick={() => setActiveInfo(activeInfo === abbr ? null : abbr)} className="absolute top-2 right-2 text-gray-300 hover:text-gray-500">
                <Info size={12} />
              </button>
              <div className="flex items-center gap-1 mb-1">{icon}<span className={`text-xs font-bold ${color}`}>{abbr} · {label}</span></div>
              {activeInfo === abbr && (
                <ul className="space-y-0.5 mt-1">
                  {tips.map((t) => <li key={t} className="text-[10px] text-gray-500">{t}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Score items */}
        <div className="space-y-3">
          {items.map((item, idx) => {
            const total = calcTotal(item);
            const { label, color, bg, icon } = getPriority(total);
            return (
              <div key={item._uid} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-start gap-3 px-4 pt-4 pb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.pain_point}
                      onChange={(e) => update(item._uid, "pain_point", e.target.value)}
                      placeholder="Pain Point를 입력하세요"
                      className="w-full text-sm font-medium text-gray-800 border-0 focus:outline-none placeholder-gray-300"
                    />
                    <input
                      type="text"
                      value={item.note ?? ""}
                      onChange={(e) => update(item._uid, "note", e.target.value)}
                      placeholder="메모 (선택)"
                      className="w-full text-xs text-gray-400 border-0 focus:outline-none placeholder-gray-200 mt-0.5"
                    />
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-extrabold text-gray-800 tabular-nums">{total}</div>
                    <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${bg} ${color}`}>
                      {icon}{label}
                    </div>
                  </div>
                  <button onClick={() => removeItem(item._uid)} disabled={items.length === 1} className="p-1 text-gray-200 hover:text-red-400 disabled:opacity-20 transition-colors mt-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="px-4 pb-4 grid grid-cols-3 gap-3 border-t border-gray-50 pt-3">
                  <ScoreSlider label="Impact" abbr="I" value={item.impact} onChange={(v) => update(item._uid, "impact", v)} color="text-rose-600" icon={<Zap size={11} className="text-rose-400" />} />
                  <ScoreSlider label="Confidence" abbr="C" value={item.confidence} onChange={(v) => update(item._uid, "confidence", v)} color="text-indigo-600" icon={<Shield size={11} className="text-indigo-400" />} />
                  <ScoreSlider label="Ease" abbr="E" value={item.ease} onChange={(v) => update(item._uid, "ease", v)} color="text-emerald-600" icon={<Wrench size={11} className="text-emerald-400" />} />
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={addItem} className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
          <Plus size={15} /> Pain Point 추가
        </button>

        <button onClick={() => handleSave(true)} disabled={saving} className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          채점 완료 — 결과 보기
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Save, MessageSquare } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import type { GrowthRetro } from "@/lib/growth-types";

const PROMPTS = {
  achievements: [
    "이번 달 가장 뿌듯했던 일은?",
    "처음 성공한 업무가 있었나요?",
    "동료에게 칭찬받은 순간은?",
  ],
  learnings: [
    "어떤 새로운 것을 배웠나요?",
    "실수에서 배운 점은?",
    "앞으로 더 발전하고 싶은 부분은?",
  ],
  next_goals: [
    "다음 달 꼭 해보고 싶은 것은?",
    "개선하고 싶은 습관이나 행동은?",
    "도움이 필요한 부분은?",
  ],
};

export default function RetroPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = use(params);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [retro, setRetro] = useState<GrowthRetro | null>(null);
  const [achievements, setAchievements] = useState("");
  const [learnings, setLearnings] = useState("");
  const [nextGoals, setNextGoals] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [year, mo] = month.split("-");

  useEffect(() => {
    if (!user) return;
    fetch(`/api/growth/retros?user_id=${user.id}&month=${month}`)
      .then((r) => r.json())
      .then((data: GrowthRetro[]) => {
        const found = data[0] ?? null;
        setRetro(found);
        if (found) {
          setAchievements(found.achievements ?? "");
          setLearnings(found.learnings ?? "");
          setNextGoals(found.next_goals ?? "");
        }
        setLoading(false);
      });
  }, [user, month]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/growth/retros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        achievements,
        learnings,
        next_goals: nextGoals,
      }),
    });
    if (res.ok) {
      const data: GrowthRetro = await res.json();
      setRetro(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/growth/me" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={15} /> 내 공간으로
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{year}년 {parseInt(mo)}월 회고</h2>
          <p className="text-xs text-gray-400 mt-0.5">한 달을 돌아보고 다음 달을 준비해요</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Save size={14} />
          {saved ? "저장됨 ✓" : saving ? "저장 중..." : "저장"}
        </button>
      </div>

      <div className="space-y-5">
        {/* Achievements */}
        <RetroSection
          icon="🌟"
          title="이번 달 성과"
          subtitle="잘 한 것, 해낸 것, 뿌듯한 것"
          prompts={PROMPTS.achievements}
          value={achievements}
          onChange={setAchievements}
          color="indigo"
        />

        {/* Learnings */}
        <RetroSection
          icon="📚"
          title="배운 것"
          subtitle="새로 알게 된 것, 실수에서 얻은 것"
          prompts={PROMPTS.learnings}
          value={learnings}
          onChange={setLearnings}
          color="emerald"
        />

        {/* Next goals */}
        <RetroSection
          icon="🎯"
          title="다음 달 목표"
          subtitle="도전할 것, 개선할 것, 필요한 도움"
          prompts={PROMPTS.next_goals}
          value={nextGoals}
          onChange={setNextGoals}
          color="amber"
        />

        {/* Mentor feedback section */}
        {retro?.mentor_feedback ? (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={14} className="text-violet-600" />
              <h3 className="text-sm font-semibold text-violet-800">멘토 피드백</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{retro.mentor_feedback}</p>
          </div>
        ) : isAdmin ? (
          <MentorFeedbackInput retro={retro} onSaved={setRetro} />
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
            <MessageSquare size={20} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">멘토 피드백이 아직 없습니다</p>
            <p className="text-[10px] text-gray-300 mt-0.5">회고를 저장하면 멘토가 피드백을 남길 수 있어요</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MentorFeedbackInput({
  retro,
  onSaved,
}: {
  retro: GrowthRetro | null;
  onSaved: (r: GrowthRetro) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  if (!retro) return null; // 본인 회고가 없으면 피드백 불가

  const handleSave = async () => {
    if (!feedback.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/growth/retros`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: retro.id, mentor_feedback: feedback.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      onSaved(updated);
    }
    setSaving(false);
  };

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare size={14} className="text-violet-600" />
        <h3 className="text-sm font-semibold text-violet-800">멘토 피드백 작성</h3>
        <span className="ml-auto text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">멘토 전용</span>
      </div>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="신입사원의 이번 달 회고에 대한 피드백을 남겨주세요..."
        rows={3}
        className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-xl focus:border-violet-400 focus:outline-none resize-none leading-relaxed mb-3"
      />
      <button
        onClick={handleSave}
        disabled={saving || !feedback.trim()}
        className="px-4 py-2 text-xs font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "저장 중..." : "피드백 저장"}
      </button>
    </div>
  );
}

function RetroSection({
  icon,
  title,
  subtitle,
  prompts,
  value,
  onChange,
  color,
}: {
  icon: string;
  title: string;
  subtitle: string;
  prompts: string[];
  value: string;
  onChange: (v: string) => void;
  color: "indigo" | "emerald" | "amber";
}) {
  const colorMap = {
    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      badge: "bg-indigo-100 text-indigo-700",
      focus: "focus:border-indigo-400",
    },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      badge: "bg-emerald-100 text-emerald-700",
      focus: "focus:border-emerald-400",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-700",
      focus: "focus:border-amber-400",
    },
  }[color];

  return (
    <div className={`${colorMap.bg} ${colorMap.border} border rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">{subtitle}</p>

      {/* Prompt chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange((value ? value + "\n" : "") + p + "\n")}
            className={`text-[10px] px-2 py-1 rounded-full ${colorMap.badge} hover:opacity-80 transition-opacity`}
          >
            + {p}
          </button>
        ))}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="자유롭게 작성해보세요..."
        rows={4}
        className={`w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl ${colorMap.focus} focus:outline-none resize-none leading-relaxed`}
      />
    </div>
  );
}

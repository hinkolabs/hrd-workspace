"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Target, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

type Question = {
  id: string;
  question_text: string;
  question_type: "text" | "textarea" | "select";
  options: string[] | null;
  sort_order: number;
  required: boolean;
};

type SessionData = {
  id: string;
  title: string;
  survey_intro: string | null;
  status: string;
};

export default function SurveyPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/tools/ice/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setSession(d.session);
        setQuestions(d.questions ?? []);
      })
      .catch(() => setError("설문을 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { alert("이름을 입력해주세요."); return; }

    // Validate required
    for (const q of questions) {
      if (q.required && !answers[q.id]?.trim()) {
        alert(`"${q.question_text}" 항목은 필수입니다.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tools/ice/${id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respondent_name: name, respondent_dept: dept, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "제출 실패");
      setSubmitted(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <AlertCircle size={32} className="text-red-400 mx-auto" />
          <p className="text-sm text-gray-500">{error ?? "설문을 찾을 수 없습니다."}</p>
        </div>
      </div>
    );
  }

  if (session.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <CheckCircle2 size={32} className="text-gray-400 mx-auto" />
          <p className="text-base font-semibold text-gray-700">이미 마감된 설문입니다</p>
          <p className="text-sm text-gray-400">소중한 관심 감사합니다.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">응답이 제출되었습니다</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            {name}님의 소중한 의견이 등록되었습니다.<br />
            AI 에이전트 개발 우선순위 선정에 반영하겠습니다. 감사합니다!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Target size={18} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-500">HRD Workspace · ICE 설문</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{session.title}</h1>
          {session.survey_intro && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line bg-white border border-gray-200 rounded-xl px-4 py-3 text-left">
              {session.survey_intro}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Respondent info */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">응답자 정보</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  이름 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">부서 (선택)</label>
                <input
                  type="text"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  placeholder="인재개발실"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-semibold text-gray-800 mb-0.5 leading-relaxed">
                <span className="text-indigo-500 mr-1.5">Q{idx + 1}.</span>
                {q.question_text}
                {q.required && <span className="text-red-400 ml-1">*</span>}
              </label>

              {q.question_type === "text" && (
                <input
                  type="text"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className="mt-3 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="답변을 입력하세요"
                />
              )}

              {q.question_type === "textarea" && (
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  rows={4}
                  className="mt-3 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="자세히 적어주실수록 더 정확한 에이전트를 만들 수 있습니다"
                />
              )}

              {q.question_type === "select" && (
                <div className="mt-3 space-y-2">
                  {(Array.isArray(q.options) ? q.options : typeof q.options === "string" ? JSON.parse(q.options) : []).map((opt: string) => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          answers[q.id] === opt
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-gray-300 group-hover:border-indigo-400"
                        }`}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      >
                        {answers[q.id] === opt && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span
                        className="text-sm text-gray-700 cursor-pointer"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      >
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-indigo-600 text-white font-semibold text-base rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {submitting ? "제출 중..." : "응답 제출하기"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6 pb-4">
          HRD Workspace · ICE 우선순위 채점 시스템
        </p>
      </div>
    </div>
  );
}

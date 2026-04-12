"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, GripVertical,
  CheckCircle2, Copy, ExternalLink, Loader2,
} from "lucide-react";

type QuestionType = "text" | "textarea" | "select";

type Question = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  required: boolean;
};

const DEFAULT_QUESTIONS: Omit<Question, "id">[] = [
  {
    question_text: "현재 업무에서 가장 반복적이고 시간이 많이 걸리는 작업은 무엇인가요?",
    question_type: "textarea",
    options: [],
    required: true,
  },
  {
    question_text: "AI가 자동화해줬으면 하는 업무를 구체적으로 적어주세요 (최대 3가지)",
    question_type: "textarea",
    options: [],
    required: true,
  },
  {
    question_text: "위 업무를 처리하는 데 주당 몇 시간 정도 소요되나요?",
    question_type: "select",
    options: ["1시간 미만", "1~3시간", "3~5시간", "5~10시간", "10시간 이상"],
    required: true,
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function NewICEPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Step 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [surveyIntro, setSurveyIntro] = useState(
    "안녕하세요. 올거나이즈(Alli) AI 에이전트 개발 우선순위 선정을 위한 설문입니다.\n솔직한 답변을 부탁드립니다. 응답 시간은 약 3~5분입니다."
  );

  // Step 2
  const [questions, setQuestions] = useState<Question[]>(
    DEFAULT_QUESTIONS.map((q) => ({ ...q, id: uid() }))
  );

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { id: uid(), question_text: "", question_type: "textarea", options: [], required: true },
    ]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, field: keyof Question, value: unknown) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  }

  function addOption(qid: string) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qid ? { ...q, options: [...q.options, ""] } : q))
    );
  }

  function updateOption(qid: string, idx: number, val: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.map((o, i) => (i === idx ? val : o)) }
          : q
      )
    );
  }

  function removeOption(qid: string, idx: number) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q
      )
    );
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch("/api/tools/ice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          survey_intro: surveyIntro,
          questions: questions
            .filter((q) => q.question_text.trim())
            .map((q) => ({
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options.filter(Boolean),
              required: q.required,
            })),
        }),
      });
      if (!res.ok) throw new Error("생성 실패");
      const data = await res.json();
      setCreatedId(data.session.id);
      setStep(3);
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const surveyUrl = typeof window !== "undefined" && createdId
    ? `${window.location.origin}/tools/ice/survey/${createdId}`
    : "";

  function copyLink() {
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canNext1 = title.trim().length > 0;
  const canCreate = questions.filter((q) => q.question_text.trim()).length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step > 1 ? setStep((s) => (s - 1) as 1 | 2) : router.push("/tools/ice"))}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">새 ICE 만들기</h1>
            <p className="text-sm text-gray-500 mt-0.5">설문을 설계하고 참가자에게 배포하세요</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mt-4 flex items-center gap-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  s === step
                    ? "bg-indigo-600 text-white"
                    : s < step
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {s < step ? <CheckCircle2 size={12} /> : <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px]">{s}</span>}
                {["기본 정보", "설문 설계", "완료"][s - 1]}
              </div>
              {s < 3 && <ChevronRight size={13} className="text-gray-300 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* ── Step 1: 기본 정보 ── */}
        {step === 1 && (
          <div className="max-w-xl mx-auto space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                세션 제목 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 2026 AX Sprint - 인재개발실 Pain Point 수집"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">설명 (선택)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="이 ICE 세션의 목적이나 대상을 간단히 적어주세요"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">설문 안내 메시지</label>
              <textarea
                value={surveyIntro}
                onChange={(e) => setSurveyIntro(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">설문 페이지 상단에 표시되는 안내 문구입니다</p>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!canNext1}
              className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              다음: 설문 설계 <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 2: 설문 설계 ── */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
              기본 질문 3개가 제공됩니다. 수정하거나 원하는 질문을 추가하세요.
            </div>

            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <GripVertical size={16} className="text-gray-300 mt-2.5 shrink-0 cursor-grab" />
                    <div className="flex-1 space-y-3">
                      {/* Question number + type */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          Q{idx + 1}
                        </span>
                        <select
                          value={q.question_type}
                          onChange={(e) => updateQuestion(q.id, "question_type", e.target.value as QuestionType)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-600"
                        >
                          <option value="text">단답형</option>
                          <option value="textarea">장문형</option>
                          <option value="select">선택형</option>
                        </select>
                        <label className="flex items-center gap-1 text-xs text-gray-500 ml-auto cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) => updateQuestion(q.id, "required", e.target.checked)}
                            className="rounded"
                          />
                          필수
                        </label>
                      </div>

                      {/* Question text */}
                      <input
                        type="text"
                        value={q.question_text}
                        onChange={(e) => updateQuestion(q.id, "question_text", e.target.value)}
                        placeholder="질문을 입력하세요"
                        className="w-full text-sm border-0 border-b border-gray-200 pb-1.5 focus:outline-none focus:border-indigo-400 text-gray-800"
                      />

                      {/* Options for select type */}
                      {q.question_type === "select" && (
                        <div className="space-y-1.5 pl-2">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <span className="text-[11px] text-gray-400 w-4">{oi + 1}.</span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateOption(q.id, oi, e.target.value)}
                                placeholder={`선택지 ${oi + 1}`}
                                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                              <button onClick={() => removeOption(q.id, oi)} className="text-gray-300 hover:text-red-400">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addOption(q.id)}
                            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-1"
                          >
                            <Plus size={11} />
                            선택지 추가
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      disabled={questions.length === 1}
                      className="p-1.5 text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors mt-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addQuestion}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
            >
              <Plus size={15} />
              질문 추가
            </button>

            <button
              onClick={handleCreate}
              disabled={!canCreate || saving}
              className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {saving ? "생성 중..." : "설문 생성하기"}
            </button>
          </div>
        )}

        {/* ── Step 3: 완료 ── */}
        {step === 3 && createdId && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center pt-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">설문이 생성되었습니다!</h2>
              <p className="text-sm text-gray-500 mt-1">아래 링크를 참가자들에게 공유하세요</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">설문 링크</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-indigo-700 break-all">
                  {surveyUrl}
                </code>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={copyLink}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-xl border transition-colors ${
                    copied
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? "복사됨!" : "링크 복사"}
                </button>
                <a
                  href={surveyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  <ExternalLink size={14} />
                  미리보기
                </a>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
              <p className="font-medium mb-1">다음 단계</p>
              <p className="text-xs leading-relaxed text-indigo-600">
                링크를 팀원들에게 공유하고 응답을 수집하세요.
                충분한 응답이 모이면 "응답 모니터링" 페이지에서 마감 후 ICE 채점을 시작할 수 있습니다.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/tools/ice/${createdId}/responses`)}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                응답 모니터링 보기
              </button>
              <button
                onClick={() => router.push("/tools/ice")}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors"
              >
                대시보드로
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

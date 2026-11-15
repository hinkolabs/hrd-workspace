"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import LiveQuizConsole from "@/components/admin/live-quiz-console";
import {
  type AdminEvent,
  type QuestionInput,
  type TeamWrite,
  MAX_QUESTIONS,
  MAX_TEAMS,
  MIN_QUESTIONS,
  MIN_TEAMS,
  choiceOptions,
  defaultQuestions,
  defaultTeams,
} from "@/lib/live-quiz";

async function fileToJpeg(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let quality = 0.72;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > 900_000 && quality > 0.4) {
    quality -= 0.08;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  return data.length > 900_000 ? null : data;
}

export default function LiveQuizEditor({ quizId }: { quizId: string | null }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [teams, setTeams] = useState<TeamWrite[]>(defaultTeams);
  const [questions, setQuestions] = useState<QuestionInput[]>(defaultQuestions);
  const [status, setStatus] = useState<AdminEvent["status"] | null>(quizId ? null : "draft");
  const [phase, setPhase] = useState<AdminEvent["phase"]>("edit");
  const [rosterLocked, setRosterLocked] = useState(false);
  const [mode, setMode] = useState<"edit" | "run">(quizId ? "run" : "edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openIndex, setOpenIndex] = useState(0);

  const load = useCallback(async () => {
    if (!quizId) return;
    const res = await fetch(`/api/admin/live-quizzes/${quizId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "퀴즈를 불러오지 못했습니다");
      return;
    }
    const event = data as AdminEvent;
    setTitle(event.title);
    setTeams(event.teams.map((team) => ({ id: team.id, name: team.name, expectedSize: team.expectedSize })));
    setQuestions(
      event.questions.map((question) => ({
        kind: question.kind,
        prompt: question.prompt,
        options: question.options,
        correctOptionId: question.correctOptionId,
        acceptedAnswers: question.acceptedAnswers,
        ignoreSpaces: question.ignoreSpaces,
        timeLimit: question.timeLimit,
        points: question.points,
        explanation: question.explanation,
        imageData: question.imageData,
      })),
    );
    setStatus(event.status);
    setPhase(event.phase);
    setRosterLocked(event.rosterLocked);
    if (event.status === "draft") setMode("edit");
  }, [quizId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateQuestion(index: number, patch: Partial<QuestionInput>) {
    setQuestions((prev) => prev.map((question, i) => (i === index ? { ...question, ...patch } : question)));
  }

  async function attachOptionImage(index: number, optionId: string, file: File | null, input: HTMLInputElement) {
    input.value = "";
    if (!file) return;
    const image = await fileToJpeg(file);
    if (!image) {
      setError("사진은 jpg로 줄인 뒤에도 너무 큽니다.");
      return;
    }
    setError("");
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === index
          ? { ...question, options: question.options.map((item) => (item.id === optionId ? { ...item, imageData: image } : item)) }
          : question,
      ),
    );
  }

  async function persist(publish: boolean) {
    setBusy(true);
    setError("");
    try {
      const payload = { title, teams, questions };
      const res = await fetch(quizId ? `/api/admin/live-quizzes/${quizId}` : "/api/admin/live-quizzes", {
        method: quizId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장하지 못했습니다");
      const id = (data as AdminEvent).id;
      if (publish) {
        const published = await fetch(`/api/admin/live-quizzes/${id}/publish`, { method: "POST" });
        const publishedData = await published.json();
        if (!published.ok) {
          if (!quizId) router.replace(`/admin/quiz/${id}`);
          throw new Error(publishedData.error || "발행하지 못했습니다");
        }
      }
      if (!quizId) {
        router.replace(`/admin/quiz/${id}`);
        return;
      }
      if (publish) {
        setMode("run");
        setStatus("live");
        setPhase("lobby");
        return;
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "저장하지 못했습니다");
    } finally {
      setBusy(false);
    }
  }

  if (quizId && status && status !== "draft" && mode === "run") {
    return <LiveQuizConsole eventId={quizId} onEditSetup={!rosterLocked && phase === "lobby" ? () => setMode("edit") : undefined} />;
  }

  if (quizId && status === null) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" />
        불러오는 중
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{quizId ? "퀴즈 준비" : "새 퀴즈"}</h1>
          <p className="mt-2 text-sm text-gray-600">
            문제는 {MIN_QUESTIONS}~{MAX_QUESTIONS}개, 조는 {MIN_TEAMS}개 이상입니다. 추천 배점은 앞 3문제 100점, 다음 3문제 150점, 7번 200점, 8번 250점입니다.
          </p>
        </div>
        {quizId && status === "live" && (
          <button type="button" onClick={() => setMode("run")} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            운영 화면
          </button>
        )}
      </div>
      {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <label className="mt-5 block text-sm font-medium">
        행사 제목
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2" />
      </label>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">참가 조</h2>
          <button
            type="button"
            disabled={teams.length >= MAX_TEAMS}
            onClick={() => setTeams((prev) => [...prev, { name: `${prev.length + 1}조`, expectedSize: 5 }])}
            className="inline-flex items-center gap-1 text-sm text-indigo-700 disabled:opacity-40"
          >
            <Plus size={14} /> 조 추가
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {teams.map((team, index) => (
            <li key={team.id ?? index} className="flex items-center gap-2">
              <input value={team.name} onChange={(event) => setTeams((prev) => prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))} className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input type="number" min={1} max={99} value={team.expectedSize} onChange={(event) => setTeams((prev) => prev.map((item, i) => (i === index ? { ...item, expectedSize: Number(event.target.value) } : item)))} className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <span className="text-xs text-gray-500">명 예상</span>
              <button type="button" onClick={() => setTeams((prev) => prev.filter((_, i) => i !== index))} className="ml-auto text-gray-400"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 space-y-2">
        {questions.map((question, index) => (
          <article key={index} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setOpenIndex(index)} className="min-w-0 flex-1 text-left">
                <span className="font-semibold">{index + 1}번</span>
                <span className="ml-2 text-sm text-gray-500">{questionLabel(question)}</span>
                <span className="ml-2 truncate text-sm text-gray-700">{question.prompt || "내용 없음"}</span>
              </button>
              <div className="flex gap-1">
                <button type="button" onClick={() => { if (index === 0) return; setQuestions((prev) => swap(prev, index, index - 1)); setOpenIndex(index - 1); }} className="rounded border px-2 py-1"><ChevronUp size={14} /></button>
                <button type="button" onClick={() => { if (index === questions.length - 1) return; setQuestions((prev) => swap(prev, index, index + 1)); setOpenIndex(index + 1); }} className="rounded border px-2 py-1"><ChevronDown size={14} /></button>
                <button type="button" onClick={() => { setQuestions((prev) => prev.filter((_, i) => i !== index)); setOpenIndex((current) => Math.max(0, Math.min(current, questions.length - 2))); }} className="rounded border px-2 py-1 text-rose-600"><Trash2 size={14} /></button>
              </div>
            </div>
            {openIndex === index && (
              <>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <button type="button" onClick={() => updateQuestion(index, { kind: "choice", options: choiceOptions(2, question.options), correctOptionId: question.correctOptionId === "a" || question.correctOptionId === "b" ? question.correctOptionId : null })} className={`rounded-full px-3 py-1 ${question.kind === "choice" && question.options.length === 2 ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>2지선다</button>
              <button type="button" onClick={() => updateQuestion(index, { kind: "choice", options: choiceOptions(4, question.options) })} className={`rounded-full px-3 py-1 ${question.kind === "choice" && question.options.length !== 2 ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>4지선다</button>
              <button type="button" onClick={() => updateQuestion(index, { kind: "short" })} className={`rounded-full px-3 py-1 ${question.kind === "short" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>단답형</button>
              <label className="ml-auto">
                {question.timeLimit}초
                <input type="range" min={10} max={90} value={question.timeLimit} onChange={(event) => updateQuestion(index, { timeLimit: Number(event.target.value) })} className="ml-2 align-middle" />
              </label>
              <label>
                배점
                <input type="number" min={1} max={1000} value={question.points} onChange={(event) => updateQuestion(index, { points: Number(event.target.value) })} className="ml-2 w-20 rounded-lg border border-gray-300 px-2 py-1" />
              </label>
            </div>
            <textarea value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} placeholder="문제 내용" className="mt-3 h-20 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
            {question.kind === "choice" ? (
              <ul className="mt-3 space-y-2">
                {question.options.map((option) => (
                  <li key={option.id} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${index}`} checked={question.correctOptionId === option.id} onChange={() => updateQuestion(index, { correctOptionId: option.id })} />
                    <input value={option.text} onChange={(event) => updateQuestion(index, { options: question.options.map((item) => (item.id === option.id ? { ...item, text: event.target.value } : item)) })} placeholder={`보기 ${option.id.toUpperCase()}`} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-gray-600">
                      <ImagePlus size={14} />
                      사진
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void attachOptionImage(index, option.id, event.target.files?.[0] ?? null, event.target)} />
                    </label>
                    {option.imageData && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={option.imageData} alt="" className="h-10 w-10 rounded object-cover" />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <label className="mt-3 block text-sm">
                허용 정답. 한 줄에 하나씩
                <textarea value={question.acceptedAnswers.join("\n")} onChange={(event) => updateQuestion(index, { acceptedAnswers: event.target.value.split("\n") })} className="mt-1 h-20 w-full rounded-xl border border-gray-300 px-3 py-2" />
                <span className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <input type="checkbox" checked={question.ignoreSpaces} onChange={(event) => updateQuestion(index, { ignoreSpaces: event.target.checked })} />
                  공백을 무시하고 대소문자를 같게 봅니다
                </span>
              </label>
            )}
            <label className="mt-3 block text-sm">
              해설 (선택)
              <input value={question.explanation} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <ImagePlus size={16} />
              문제 사진
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const image = await fileToJpeg(file);
                if (!image) {
                  setError("사진은 jpg로 줄인 뒤에도 너무 큽니다.");
                  return;
                }
                updateQuestion(index, { imageData: image });
              }} />
            </label>
            {question.imageData && (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={question.imageData} alt="" className="max-h-32 rounded-lg" />
                <button type="button" onClick={() => updateQuestion(index, { imageData: null })} className="mt-1 text-xs text-rose-600">사진 제거</button>
              </div>
            )}
              </>
            )}
          </article>
        ))}
        <button type="button" disabled={questions.length >= MAX_QUESTIONS} onClick={() => { setQuestions((prev) => [...prev, { ...defaultQuestions()[0], points: 100 }]); setOpenIndex(questions.length); }} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 disabled:opacity-40">
          <Plus size={14} /> 문제 추가
        </button>
      </section>

      <div className="mt-6 flex gap-2">
        <button type="button" disabled={busy} onClick={() => persist(false)} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium disabled:opacity-50">저장</button>
        <button type="button" disabled={busy} onClick={() => persist(true)} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "저장 중" : "발행하고 입장 받기"}
        </button>
      </div>
    </div>
  );
}

function questionLabel(question: QuestionInput) {
  if (question.kind === "short") return "단답형";
  return question.options.length === 2 ? "2지선다" : "4지선다";
}

function swap<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

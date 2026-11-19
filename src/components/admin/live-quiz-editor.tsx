"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Plus, Trash2, Video } from "lucide-react";
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
  isQuizVideoRef,
} from "@/lib/live-quiz";
import { QUIZ_SAMPLES, recommendedSamples, type QuizSample } from "@/lib/live-quiz-samples";

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
  const [videoBusy, setVideoBusy] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);

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
        scope: question.scope === "individual" ? "individual" : "team",
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

  async function uploadQuizVideo(file: File) {
    if (file.size > 40 * 1024 * 1024) throw new Error("영상은 40MB 이하만 올릴 수 있습니다.");
    if (file.type !== "video/mp4" && file.type !== "video/webm") throw new Error("영상은 mp4 또는 webm만 올릴 수 있습니다.");
    const ticketRes = await fetch("/api/admin/live-quizzes/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, size: file.size }),
    });
    const ticket = await ticketRes.json();
    if (!ticketRes.ok) throw new Error(ticket.error || "영상 업로드 주소를 만들지 못했습니다.");
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    const uploaded = await fetch(ticket.signedUrl, {
      method: "PUT",
      body,
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
    });
    if (!uploaded.ok) throw new Error("영상을 저장하지 못했습니다.");
    return ticket.ref as string;
  }

  async function attachVideo(index: number, file: File | null, input: HTMLInputElement) {
    input.value = "";
    if (!file) return;
    setVideoBusy(true);
    setError("");
    try {
      updateQuestion(index, { imageData: await uploadQuizVideo(file) });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "영상을 올리지 못했습니다.");
    } finally {
      setVideoBusy(false);
    }
  }

  function isBlankQuestion(question: QuestionInput) {
    return !question.prompt.trim() && !question.correctOptionId && question.acceptedAnswers.every((answer) => !answer.trim()) && !question.imageData;
  }

  async function materializeSample(sample: QuizSample) {
    const next: QuestionInput = {
      ...sample.question,
      options: sample.question.options.map((option) => ({ ...option })),
      acceptedAnswers: [...sample.question.acceptedAnswers],
    };
    if (sample.videoPath) {
      const res = await fetch(sample.videoPath);
      if (!res.ok) throw new Error("샘플 영상을 불러오지 못했습니다.");
      const blob = await res.blob();
      const file = new File([blob], "sample.mp4", { type: "video/mp4" });
      next.imageData = await uploadQuizVideo(file);
      return next;
    }
    if (!sample.imagePath) return next;
    const res = await fetch(sample.imagePath);
    if (!res.ok) throw new Error("샘플 사진을 불러오지 못했습니다.");
    const blob = await res.blob();
    const file = new File([blob], "sample.jpg", { type: blob.type || "image/jpeg" });
    const image = await fileToJpeg(file);
    if (!image) throw new Error("샘플 사진이 너무 큽니다.");
    next.imageData = image;
    return next;
  }

  async function insertSample(sample: QuizSample) {
    const blank = questions.findIndex(isBlankQuestion);
    if (blank < 0 && questions.length >= MAX_QUESTIONS) {
      setError("문제는 10개까지입니다. 빈 문제를 지운 뒤 넣으세요.");
      return;
    }
    setSampleBusy(true);
    setError("");
    try {
      const next = await materializeSample(sample);
      if (blank >= 0) {
        setQuestions((prev) => prev.map((item, index) => (index === blank ? next : item)));
        setOpenIndex(blank);
      } else {
        setQuestions((prev) => [...prev, next]);
        setOpenIndex(questions.length);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "샘플을 넣지 못했습니다.");
    } finally {
      setSampleBusy(false);
    }
  }

  async function fillRecommended() {
    if (questions.some((question) => !isBlankQuestion(question)) && !window.confirm("지금 적힌 문제를 추천 샘플 8개로 바꿀까요?")) return;
    setSampleBusy(true);
    setError("");
    try {
      setQuestions(await Promise.all(recommendedSamples().map((sample) => materializeSample(sample))));
      setOpenIndex(0);
      setSamplesOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "샘플을 넣지 못했습니다.");
    } finally {
      setSampleBusy(false);
    }
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

      <section className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">샘플 문제 {QUIZ_SAMPLES.length}개</h2>
            <p className="mt-1 text-sm text-gray-600">초성, 넌센스, 주관식, 2지선다, 사진 맞추기, AI 영상 맞추기입니다. 추천 세트로 채우거나 하나씩 넣고, 그 다음 직접 고쳐도 됩니다. 영상 정답은 목록의 태그에 적혀 있습니다.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={sampleBusy} onClick={() => void fillRecommended()} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">추천 8문제 채우기</button>
            <button type="button" onClick={() => setSamplesOpen((open) => !open)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">{samplesOpen ? "목록 접기" : "하나씩 고르기"}</button>
          </div>
        </div>
        {samplesOpen && (
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {QUIZ_SAMPLES.map((sample) => (
              <li key={sample.id} className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2">
                <div className="min-w-0">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sample.question.scope === "individual" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>{sample.tag}</span>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-800">{sample.question.prompt}</p>
                </div>
                <button type="button" disabled={sampleBusy} onClick={() => void insertSample(sample)} className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">넣기</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 space-y-2">
        {questions.map((question, index) => (
          <article key={index} className={`rounded-2xl border bg-white p-4 ${question.scope === "individual" ? "border-amber-400" : "border-gray-200"}`}>
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
              <button type="button" onClick={() => updateQuestion(index, { scope: "team" })} className={`rounded-full px-3 py-1 ${question.scope !== "individual" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>조별전</button>
              <button type="button" onClick={() => updateQuestion(index, { scope: "individual" })} className={`rounded-full px-3 py-1 ${question.scope === "individual" ? "bg-amber-500 text-white" : "bg-gray-100"}`}>개인전</button>
              <button type="button" onClick={() => updateQuestion(index, { kind: "choice", options: choiceOptions(2, question.options), correctOptionId: question.correctOptionId === "a" || question.correctOptionId === "b" ? question.correctOptionId : null })} className={`rounded-full px-3 py-1 ${question.kind === "choice" && question.options.length === 2 ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>2지선다</button>
              <button type="button" onClick={() => updateQuestion(index, { kind: "choice", options: choiceOptions(4, question.options) })} className={`rounded-full px-3 py-1 ${question.kind === "choice" && question.options.length !== 2 ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>4지선다</button>
              <button type="button" onClick={() => updateQuestion(index, { kind: "short" })} className={`rounded-full px-3 py-1 ${question.kind === "short" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>단답형</button>
              <label className="ml-auto">
                {question.timeLimit}초
                <input type="range" min={10} max={90} value={question.timeLimit} onChange={(event) => updateQuestion(index, { timeLimit: Number(event.target.value) })} className="ml-2 align-middle" />
              </label>
              {question.scope === "individual" ? (
                <span className="text-amber-700">조별 점수에 포함되지 않습니다</span>
              ) : (
                <label>
                  배점
                  <input type="number" min={1} max={1000} value={question.points} onChange={(event) => updateQuestion(index, { points: Number(event.target.value) })} className="ml-2 w-20 rounded-lg border border-gray-300 px-2 py-1" />
                </label>
              )}
            </div>
            <textarea value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} placeholder="문제 내용" className="mt-3 h-20 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
            {question.kind === "choice" && question.options.length === 2 ? (
              <div className="mt-3">
                <p className="text-sm text-gray-500">사진 두 장 중 정답을 고르세요. 글은 비워도 됩니다.</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {question.options.map((option) => (
                    <div key={option.id} className={`rounded-2xl border p-3 ${question.correctOptionId === option.id ? "border-indigo-600 ring-2 ring-indigo-600" : "border-gray-200"}`}>
                      <label className="flex min-h-40 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                        {option.imageData ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={option.imageData} alt="" className="max-h-52 w-full object-contain" />
                        ) : (
                          <span className="flex flex-col items-center gap-1 text-sm text-gray-500">
                            <ImagePlus size={18} />
                            사진 올리기
                          </span>
                        )}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void attachOptionImage(index, option.id, event.target.files?.[0] ?? null, event.target)} />
                      </label>
                      <input value={option.text} onChange={(event) => updateQuestion(index, { options: question.options.map((item) => (item.id === option.id ? { ...item, text: event.target.value } : item)) })} placeholder="설명 (선택)" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button type="button" onClick={() => updateQuestion(index, { correctOptionId: option.id })} className={`rounded-full px-3 py-1 text-xs font-semibold ${question.correctOptionId === option.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                          {question.correctOptionId === option.id ? "정답" : "정답으로 선택"}
                        </button>
                        {option.imageData && (
                          <button type="button" onClick={() => updateQuestion(index, { options: question.options.map((item) => (item.id === option.id ? { ...item, imageData: null } : item)) })} className="text-xs text-rose-600">사진 제거</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : question.kind === "choice" ? (
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
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <label className="inline-flex cursor-pointer items-center gap-2">
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
              <label className={`inline-flex cursor-pointer items-center gap-2 ${videoBusy ? "opacity-50" : ""}`}>
                <Video size={16} />
                {videoBusy ? "영상 올리는 중" : "문제 영상"}
                <input type="file" accept="video/mp4,video/webm" disabled={videoBusy} className="sr-only" onChange={(event) => void attachVideo(index, event.target.files?.[0] ?? null, event.target)} />
              </label>
              <span className="text-xs text-gray-400">mp4, webm · 40MB 이하. 사진과 영상 중 하나만 남습니다.</span>
            </div>
            {question.imageData && !isQuizVideoRef(question.imageData) && (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={question.imageData} alt="" className="max-h-32 rounded-lg" />
                <button type="button" onClick={() => updateQuestion(index, { imageData: null })} className="mt-1 text-xs text-rose-600">사진 제거</button>
              </div>
            )}
            {isQuizVideoRef(question.imageData) && (
              <div className="mt-2">
                <VideoPreview mediaRef={question.imageData} />
                <button type="button" onClick={() => updateQuestion(index, { imageData: null })} className="mt-1 text-xs text-rose-600">영상 제거</button>
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

function VideoPreview({ mediaRef }: { mediaRef: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancel = false;
    void fetch(`/api/admin/live-quizzes/media?ref=${encodeURIComponent(mediaRef)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { videoUrl?: string } | null) => {
        if (!cancel) setSrc(data?.videoUrl ?? null);
      });
    return () => {
      cancel = true;
    };
  }, [mediaRef]);
  if (!src) return <p className="text-xs text-gray-500">영상을 불러오는 중</p>;
  return <video src={src} controls playsInline className="max-h-48 w-full rounded-lg bg-black" />;
}

function questionLabel(question: QuestionInput) {
  const format = question.kind === "short" ? "단답형" : question.options.length === 2 ? "2지선다" : "4지선다";
  return question.scope === "individual" ? `개인전 · ${format}` : `조별 · ${format}`;
}

function swap<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { type PublicState, formatScaled, remainingSeconds } from "@/lib/live-quiz";
import { OptionImage } from "@/components/live-quiz/option-image";
import { useServerClock } from "@/components/live-quiz/use-server-clock";
import { useQuizRealtime } from "@/components/live-quiz/use-quiz-sync";

function storageKey(code: string) {
  return `hrd-live-quiz:${code}`;
}

export default function LiveQuizPlayPage() {
  const params = useParams<{ code: string }>();
  const code = (Array.isArray(params.code) ? params.code[0] : params.code)?.toLowerCase() ?? "";
  const [state, setState] = useState<PublicState | null>(null);
  const [missing, setMissing] = useState(false);
  const [fatal, setFatal] = useState("");
  const [choice, setChoice] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const stopPolling = useRef(false);
  const aligned = useServerClock(state?.serverNow ?? null);

  const hasState = useRef(false);

  const load = useCallback(async () => {
    if (!code || stopPolling.current) return;
    const token = window.localStorage.getItem(storageKey(code)) ?? "";
    const res = await fetch(`/api/live-quiz/${code}`, {
      cache: "no-store",
      headers: token ? { "x-quiz-token": token } : {},
    });
    if (res.status === 404) {
      setMissing(true);
      stopPolling.current = true;
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      if (!hasState.current) {
        setFatal(data.error || "퀴즈를 열 수 없습니다");
        if (res.status === 503) stopPolling.current = true;
      }
      return;
    }
    const next = data as PublicState;
    if (next.invalidToken) window.localStorage.removeItem(storageKey(code));
    hasState.current = true;
    setState(next);
    setFatal("");
  }, [code]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 2000);
    return () => clearInterval(id);
  }, [load]);

  useQuizRealtime(code, () => void load(), state?.participant ? { participantId: state.participant.id, teamId: state.participant.teamId } : null);

  useEffect(() => {
    setChoice("");
    setText("");
  }, [state?.question?.id]);

  useEffect(() => {
    const question = state?.question;
    if (!question?.hasImage || !code) {
      setImage(null);
      return;
    }
    const token = window.localStorage.getItem(storageKey(code)) ?? "";
    let cancel = false;
    void fetch(`/api/live-quiz/${code}/image?question=${question.id}`, {
      cache: "no-store",
      headers: token ? { "x-quiz-token": token } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { imageData?: string } | null) => {
        if (!cancel) setImage(data?.imageData ?? null);
      });
    return () => {
      cancel = true;
    };
  }, [code, state?.question]);

  async function join(teamId: string) {
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/live-quiz/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "입장하지 못했습니다");
      window.localStorage.setItem(storageKey(code), data.token);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "입장하지 못했습니다");
    } finally {
      setJoining(false);
    }
  }

  async function submit() {
    if (!state?.question || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const token = window.localStorage.getItem(storageKey(code)) ?? "";
      const res = await fetch(`/api/live-quiz/${code}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-quiz-token": token },
        body: JSON.stringify({
          questionId: state.question.id,
          optionId: state.question.kind === "choice" ? choice : null,
          text: state.question.kind === "short" ? text : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "제출하지 못했습니다");
      setChoice("");
      setText("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "제출하지 못했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  if (missing) return <Notice text="이 주소의 퀴즈를 찾을 수 없습니다." />;
  if (fatal) return <Notice text={fatal} />;
  if (!state) return <Notice text="입장 화면을 준비하는 중" spinner />;

  const question = state.question;
  const remain = remainingSeconds(state.endsAt, aligned, question?.timeLimit ?? 30);
  const mine = state.questionResults?.find((result) => result.teamId === state.participant?.teamId);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-gray-50 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-gray-900">
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-semibold text-indigo-700">{state.title}</p>
        {state.participant && <p className="mt-1 text-base text-gray-500">{state.participant.teamName}</p>}
        {error && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-base text-rose-700">{error}</p>}

        {!state.joined && state.teams.length > 0 && (
          <section className="mt-8">
            <h1 className="text-3xl font-bold leading-tight">조를 선택하세요</h1>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {state.teams.map((team) => (
                <button key={team.id} type="button" disabled={joining} onClick={() => join(team.id)} className="min-h-24 touch-manipulation rounded-2xl bg-white px-3 py-5 text-2xl font-bold shadow-sm active:scale-[0.98] disabled:opacity-50">
                  {team.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {!state.joined && state.teams.length === 0 && <h1 className="mt-16 text-center text-3xl font-bold leading-tight">입장이 마감되었습니다</h1>}
        {state.joined && state.phase === "lobby" && <h1 className="mt-16 text-center text-3xl font-bold leading-tight">시작을 기다리고 있습니다</h1>}

        {question && state.phase === "question" && (
          <section className="mt-4">
            <div className="sticky top-0 z-10 -mx-4 flex items-end justify-between bg-gray-50/95 px-4 py-3 backdrop-blur">
              <p className="text-base text-gray-500">{question.index}번 · {question.points}점</p>
              <p className={`text-6xl font-black tabular-nums leading-none ${remain <= 5 ? "text-rose-600" : "text-indigo-700"}`}>{remain}</p>
            </div>
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="mt-2 max-h-52 w-full rounded-2xl object-contain" />
            )}
            <h1 className="mt-3 text-3xl font-bold leading-snug">{question.prompt}</h1>
            {state.submitted ? (
              <p className="mt-6 rounded-2xl bg-white px-4 py-8 text-center text-xl font-semibold shadow-sm">제출 완료</p>
            ) : question.kind === "choice" ? (
              <div className="mt-5 space-y-3 pb-24">
                {question.options.map((option) => (
                  <button key={option.id} type="button" onClick={() => setChoice(option.id)} className={`block min-h-16 w-full touch-manipulation rounded-2xl px-4 py-4 text-left text-xl shadow-sm active:scale-[0.99] ${choice === option.id ? "bg-indigo-600 text-white" : "bg-white"}`}>
                    {option.hasImage && <OptionImage code={code} questionId={question.id} optionId={option.id} storageKey={storageKey(code)} className="mb-2 max-h-44 w-full rounded-xl object-contain" />}
                    {option.text}
                  </button>
                ))}
                <div className="fixed inset-x-0 bottom-0 z-20 bg-gray-50/95 px-4 pt-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <button type="button" disabled={!choice || submitting} onClick={submit} className="mx-auto block min-h-14 w-full max-w-md touch-manipulation rounded-2xl bg-gray-900 text-lg font-semibold text-white disabled:opacity-40">
                    제출
                  </button>
                </div>
              </div>
            ) : (
              <form className="mt-5 pb-28" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  autoFocus
                  enterKeyHint="send"
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg"
                  placeholder="답을 입력하세요"
                />
                <div className="fixed inset-x-0 bottom-0 z-20 bg-gray-50/95 px-4 pt-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <button type="submit" disabled={!text.trim() || submitting} className="mx-auto block min-h-14 w-full max-w-md touch-manipulation rounded-2xl bg-gray-900 text-lg font-semibold text-white disabled:opacity-40">
                    제출
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {state.joined && state.phase === "closed" && <h1 className="mt-16 text-center text-3xl font-bold leading-tight">마감되었습니다. 정답 공개를 기다립니다.</h1>}

        {question && !state.ceremony && state.phase !== "question" && state.phase !== "lobby" && state.phase !== "closed" && (
          <section className="mt-6">
            <h1 className="text-3xl font-bold leading-snug">{question.prompt}</h1>
            {question.kind === "choice" && (
              <div className="mt-4 space-y-3">
                {question.options.map((option) => (
                  <div key={option.id} className={`min-h-16 rounded-2xl px-4 py-4 text-xl ${option.id === question.correctOptionId ? "bg-indigo-600 font-semibold text-white" : "bg-white text-gray-500"}`}>
                    {option.hasImage && <OptionImage code={code} questionId={question.id} optionId={option.id} storageKey={storageKey(code)} className="mb-2 max-h-44 w-full rounded-xl object-contain" />}
                    {option.text}
                  </div>
                ))}
              </div>
            )}
            {question.kind === "short" && question.answerLabel && <p className="mt-4 rounded-2xl bg-indigo-600 px-4 py-5 text-xl font-semibold text-white">정답 {question.answerLabel}</p>}
            {state.myCorrect != null && <p className="mt-4 text-lg">{state.myCorrect ? "맞혔습니다" : "아쉽습니다"}</p>}
            {mine && <p className="mt-2 text-base text-gray-600">{mine.teamName} {formatScaled(mine.pointsScaled)}점{mine.allCorrect ? " · 전원 정답" : ""}</p>}
            {question.explanation && <p className="mt-3 text-base leading-6 text-gray-600">{question.explanation}</p>}
          </section>
        )}

        {state.ceremony && state.ceremony.length > 0 && (
          <section className="mt-8 space-y-3">
            {[...state.ceremony].sort((a, b) => a.place - b.place).map((item) => (
              <div key={item.place} className="rounded-2xl bg-white px-4 py-5 text-center shadow-sm">
                <p className="text-sm text-gray-500">{item.place}등</p>
                <p className="text-2xl font-black">{item.teams.map((team) => team.teamName).join(", ")}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function Notice({ text, spinner = false }: { text: string; spinner?: boolean }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-center text-base leading-6 text-gray-600">
      {spinner && <Loader2 size={18} className="mr-2 animate-spin" />}
      {text}
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { type PublicState, MAX_NICKNAME, formatScaled, remainingSeconds } from "@/lib/live-quiz";
import { AnswerSpreadPanel } from "@/components/live-quiz/answer-spread";
import { IndividualFinalPanel, RoundWinnersPanel } from "@/components/live-quiz/individual-board";
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
  const [teamId, setTeamId] = useState("");
  const [nickname, setNickname] = useState("");
  const [choice, setChoice] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ kind: "image" | "video"; src: string } | null>(null);
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
      .then((data: { imageData?: string; videoUrl?: string } | null) => {
        if (cancel) return;
        if (data?.videoUrl) setImage({ kind: "video", src: data.videoUrl });
        else if (data?.imageData) setImage({ kind: "image", src: data.imageData });
        else setImage(null);
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
        body: JSON.stringify({ teamId, nickname }),
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

  return (
    <main className="min-h-dvh overflow-x-hidden bg-gray-50 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-gray-900">
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-semibold text-indigo-700">{state.title}</p>
        {state.participant && (
          <p className="mt-1 text-base text-gray-500">
            {state.participant.teamName}
            {state.participant.nickname ? ` · ${state.participant.nickname}` : ""}
          </p>
        )}
        {error && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-base text-rose-700">{error}</p>}

        {!state.joined && state.teams.length > 0 && (
          <section className="mt-8">
            <h1 className="text-3xl font-bold leading-tight">조를 선택하세요</h1>
            <select value={teamId} onChange={(event) => setTeamId(event.target.value)} className="mt-5 min-h-14 w-full rounded-2xl border border-gray-300 bg-white px-4 text-xl">
              <option value="">조 선택</option>
              {state.teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            {state.askNickname && (
              <div className="mt-4">
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  maxLength={MAX_NICKNAME}
                  autoComplete="off"
                  autoCorrect="off"
                  enterKeyHint="done"
                  placeholder="닉네임 (개인전에 보입니다)"
                  className="min-h-14 w-full rounded-2xl border border-gray-300 bg-white px-4 text-xl"
                />
                <p className="mt-2 text-sm text-gray-500">개인전 결과에 이 닉네임이 나옵니다. 최대 {MAX_NICKNAME}자.</p>
              </div>
            )}
            <button type="button" disabled={!teamId || joining || (state.askNickname && !nickname.trim())} onClick={() => join(teamId)} className="mt-4 min-h-14 w-full touch-manipulation rounded-2xl bg-gray-900 text-lg font-semibold text-white disabled:opacity-40">
              준비
            </button>
          </section>
        )}

        {!state.joined && state.teams.length === 0 && <h1 className="mt-16 text-center text-3xl font-bold leading-tight">입장이 마감되었습니다</h1>}
        {state.joined && state.phase === "lobby" && <h1 className="mt-16 text-center text-3xl font-bold leading-tight">준비를 마쳤습니다. 시작을 기다려 주세요.</h1>}

        {question && state.phase === "question" && (
          <section className="mt-4">
            <div className="sticky top-0 z-10 -mx-4 flex items-end justify-between bg-gray-50/95 px-4 py-3 backdrop-blur">
              <p className="text-base text-gray-500">{question.index}번 · {question.scope === "individual" ? "개인전" : `${question.points}점`}</p>
              <p className={`text-6xl font-black tabular-nums leading-none ${remain <= 5 ? "text-rose-600" : "text-indigo-700"}`}>{remain}</p>
            </div>
            {image?.kind === "video" ? (
              <video src={image.src} controls autoPlay playsInline className="mt-2 max-h-52 w-full rounded-2xl bg-black object-contain" />
            ) : image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.src} alt="" className="mt-2 max-h-52 w-full rounded-2xl object-contain" />
            ) : null}
            {question.scope === "individual" && <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">개인전 · 조 점수에 들어가지 않습니다</p>}
            <h1 className="mt-3 whitespace-pre-line text-3xl font-bold leading-snug">{question.prompt}</h1>
            {state.submitted ? (
              <p className="mt-6 rounded-2xl bg-white px-4 py-8 text-center text-xl font-semibold shadow-sm">제출 완료</p>
            ) : question.kind === "choice" ? (
              <div className={`mt-5 pb-24 ${question.options.length === 2 && question.options.some((option) => option.hasImage) ? "grid grid-cols-2 gap-3" : "space-y-3"}`}>
                {question.options.map((option) => (
                  <button key={option.id} type="button" onClick={() => setChoice(option.id)} className={`block min-h-16 w-full touch-manipulation rounded-2xl px-3 py-3 text-left text-xl shadow-sm active:scale-[0.99] ${choice === option.id ? "bg-white ring-4 ring-indigo-600" : "bg-white"}`}>
                    {option.hasImage && <OptionImage code={code} questionId={question.id} optionId={option.id} storageKey={storageKey(code)} className="mb-2 max-h-52 w-full rounded-xl object-contain" />}
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

        {state.joined && state.phase === "closed" && (
          <section className="mt-10">
            <h1 className="text-center text-3xl font-bold leading-tight">시간이 종료되었습니다. 잠시만 기다려 주세요.</h1>
            {question && <p className="mt-4 whitespace-pre-line text-center text-xl font-semibold">{question.prompt}</p>}
            {state.spread && <AnswerSpreadPanel spread={state.spread} />}
          </section>
        )}

        {question && state.phase === "reveal" && (
          <section className="mt-6">
            {question.scope === "individual" && <p className="mb-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">개인전 · 조별 점수에 반영되지 않습니다</p>}
            <h1 className="whitespace-pre-line text-3xl font-bold leading-snug">{question.prompt}</h1>
            {question.kind === "choice" && (
              <div className={`mt-4 ${question.options.length === 2 && question.options.some((option) => option.hasImage) ? "grid grid-cols-2 gap-3" : "space-y-3"}`}>
                {question.options.map((option) => (
                  <div key={option.id} className={`min-h-16 rounded-2xl bg-white px-3 py-3 text-xl ${option.id === question.correctOptionId ? "font-semibold text-gray-900 ring-4 ring-indigo-600" : "text-gray-500"}`}>
                    {option.hasImage && <OptionImage code={code} questionId={question.id} optionId={option.id} storageKey={storageKey(code)} className="mb-2 max-h-52 w-full rounded-xl object-contain" />}
                    {option.text || (option.id === question.correctOptionId ? "정답" : "")}
                  </div>
                ))}
              </div>
            )}
            {question.kind === "short" && question.answerLabel && <p className="mt-4 rounded-2xl bg-indigo-600 px-4 py-5 text-xl font-semibold text-white">정답 {question.answerLabel}</p>}
            {state.myCorrect != null && <p className="mt-4 text-lg">{state.myCorrect ? "맞혔습니다" : "아쉽습니다"}</p>}
            {question.explanation && <p className="mt-3 text-base leading-6 text-gray-600">{question.explanation}</p>}
            {state.spread && <AnswerSpreadPanel spread={state.spread} />}
            {state.roundWinners && <RoundWinnersPanel people={state.roundWinners} mine={state.participant?.nickname} />}
            {state.standings && state.standings.length > 0 && (
              <p className="mt-6 text-center text-2xl font-black">{question.scope === "individual" ? "조별 현재 1등" : "현재 1등"} {state.standings.map((row) => row.teamName).join(", ")}</p>
            )}
            {state.awaitingFinal && <p className="mt-4 text-center text-base text-gray-500">최종 결과 집계를 기다립니다.</p>}
          </section>
        )}

        {state.phase === "ended" && state.standings && (
          <section className="mt-8">
            <h1 className="text-center text-3xl font-black">최종 결과</h1>
            <ol className="mt-5 space-y-2">
              {state.standings.map((row) => (
                <li key={row.teamId} className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 text-xl shadow-sm">
                  <span className="font-bold">{row.rank}등 {row.teamName}</span>
                  <span className="tabular-nums">{formatScaled(row.totalScaled)}점</span>
                </li>
              ))}
            </ol>
            {state.individualFinal && (
              <div className="mt-6">
                <IndividualFinalPanel summary={state.individualFinal} mine={state.participant?.nickname} />
              </div>
            )}
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

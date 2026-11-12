"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { type PublicState, formatScaled, remainingSeconds } from "@/lib/live-quiz";
import { useServerClock } from "@/components/live-quiz/use-server-clock";
import { useQuizRealtime } from "@/components/live-quiz/use-quiz-sync";

export default function LiveQuizScreenPage() {
  const params = useParams<{ code: string }>();
  const code = (Array.isArray(params.code) ? params.code[0] : params.code)?.toLowerCase() ?? "";
  const [state, setState] = useState<PublicState | null>(null);
  const [qr, setQr] = useState("");
  const [image, setImage] = useState<{ id: string; data: string } | null>(null);
  const shownImage = state?.question?.hasImage && image?.id === state.question.id ? image.data : null;
  const stopPolling = useRef(false);
  const aligned = useServerClock(state?.serverNow ?? null);

  const load = useCallback(async () => {
    if (!code || stopPolling.current) return;
    const res = await fetch(`/api/live-quiz/${code}`, { cache: "no-store", headers: { "x-quiz-view": "screen" } });
    if (res.status === 404 || res.status === 503) {
      stopPolling.current = true;
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as PublicState;
    setState(data);
  }, [code]);

  useEffect(() => {
    const pull = () => void load();
    const start = window.setTimeout(pull, 0);
    const id = window.setInterval(pull, 2000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, [load]);

  useQuizRealtime(code, () => void load());

  useEffect(() => {
    if (!code) return;
    let cancel = false;
    void QRCode.toDataURL(`${window.location.origin}/q/${code}`, { width: 360, margin: 1 }).then((url) => {
      if (!cancel) setQr(url);
    });
    return () => {
      cancel = true;
    };
  }, [code]);

  useEffect(() => {
    const question = state?.question;
    if (!question?.hasImage) return;
    let cancel = false;
    void fetch(`/api/live-quiz/${code}/image?question=${question.id}`, {
      cache: "no-store",
      headers: { "x-quiz-view": "screen" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { imageData?: string } | null) => {
        if (!cancel && data?.imageData) setImage({ id: question.id, data: data.imageData });
      });
    return () => {
      cancel = true;
    };
  }, [code, state?.question]);

  const question = state?.question;
  const remain = remainingSeconds(state?.endsAt ?? null, aligned, question?.timeLimit ?? 30);
  const maxScore = Math.max(1, ...(state?.standings ?? []).map((row) => row.totalScaled));

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 px-10 py-8 text-white">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{state?.title || "실시간 퀴즈"}</h1>
        <button type="button" onClick={() => void document.documentElement.requestFullscreen()} className="rounded-lg border border-white/20 px-3 py-2 text-sm">
          전체화면
        </button>
      </header>

      {state?.phase === "lobby" && (
        <section className="flex flex-1 flex-col items-center justify-center">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="참가 QR코드" className="h-72 w-72 rounded-2xl bg-white p-3" />
          )}
          <p className="mt-6 text-2xl">스마트폰으로 참가하세요</p>
        </section>
      )}

      {question && state?.phase === "question" && (
        <section className="flex flex-1 flex-col">
          <div className="flex items-end justify-between">
            <p className="text-2xl text-white/70">{question.index}번 · {question.points}점</p>
            <p className={`font-black tabular-nums leading-none ${remain <= 5 ? "animate-pulse text-8xl text-rose-400" : "text-7xl text-emerald-300"}`}>{remain}</p>
          </div>
          {shownImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownImage} alt="" className="mt-6 max-h-64 object-contain" />
          )}
          <h2 className="mt-6 text-5xl font-bold leading-tight">{question.prompt}</h2>
          {question.kind === "choice" && (
            <div className="mt-8 grid grid-cols-2 gap-4">
              {question.options.map((option) => (
                <div key={option.id} className="rounded-2xl bg-white/10 px-6 py-5 text-3xl">{option.text}</div>
              ))}
            </div>
          )}
        </section>
      )}

      {state?.phase === "closed" && <h2 className="m-auto text-6xl font-black">마감</h2>}

      {question && (state?.phase === "reveal" || state?.phase === "ended") && (
        <section className="mt-8">
          <h2 className="text-4xl font-bold">{question.prompt}</h2>
          {question.kind === "choice" ? (
            <div className="mt-6 grid grid-cols-2 gap-4">
              {question.options.map((option) => (
                <div key={option.id} className={`rounded-2xl px-6 py-5 text-3xl ${option.id === question.correctOptionId ? "bg-emerald-400 font-black text-zinc-950" : "bg-white/10"}`}>{option.text}</div>
              ))}
            </div>
          ) : question.answerLabel ? (
            <p className="mt-4 rounded-2xl bg-emerald-400 px-6 py-4 text-4xl font-black text-zinc-950">정답 {question.answerLabel}</p>
          ) : null}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {state.questionResults?.map((result) => (
              <div key={result.teamId} className="rounded-2xl bg-white/10 px-5 py-4">
                <div className="flex justify-between text-2xl font-semibold">
                  <span>{result.teamName}</span>
                  <span>{formatScaled(result.pointsScaled)}</span>
                </div>
                <p className="mt-1 text-white/70">정답 {result.correctCount}/{result.rosterSize}{result.allCorrect ? " · 전원 정답" : ""}</p>
              </div>
            ))}
          </div>
          {state.standings && (
            <ol className="mt-6 space-y-2">
              {state.standings.map((row) => {
                const delta = row.previousRank == null ? 0 : row.previousRank - row.rank;
                return (
                  <li key={row.teamId} className="grid grid-cols-[6rem_1fr_6rem] items-center gap-4 text-xl">
                    <span>{row.rank}등 {delta > 0 ? "↑" : delta < 0 ? "↓" : ""}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-emerald-400" style={{ width: `${(row.totalScaled / maxScore) * 100}%` }} />
                    </div>
                    <span className="text-right tabular-nums">{formatScaled(row.totalScaled)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}

      {state?.phase === "final" && state.finalStep === 0 && <h2 className="m-auto text-5xl font-black">결과를 준비하고 있습니다</h2>}
      {state?.ceremony && state.ceremony.length > 0 && (
        <section className="m-auto w-full max-w-4xl space-y-4 text-center">
          {[...state.ceremony].sort((a, b) => b.place - a.place).map((item) => (
            <div key={item.place} className={item.place === 1 ? "rounded-3xl bg-emerald-400 px-8 py-10 text-zinc-950" : "rounded-3xl bg-white/10 px-8 py-8"}>
              <p className="text-2xl">{item.place}등</p>
              <p className="mt-2 text-6xl font-black">{item.teams.map((team) => team.teamName).join(" · ")}</p>
              <p className="mt-2 text-2xl tabular-nums">{formatScaled(item.teams[0]?.totalScaled ?? 0)}</p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

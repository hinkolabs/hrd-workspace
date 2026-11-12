"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import {
  type AdminEvent,
  type ConsoleState,
  type StoredQuestion,
  emptyOptions,
  formatScaled,
  phaseLabel,
  questionReady,
  remainingSeconds,
} from "@/lib/live-quiz";
import { useServerClock } from "@/components/live-quiz/use-server-clock";
import { useQuizRealtime } from "@/components/live-quiz/use-quiz-sync";

type Action = "lock_roster" | "unlock_roster" | "start" | "end" | "reveal" | "show_second" | "show_first" | "end_event" | "add_tiebreak" | "cancel";

export default function LiveQuizConsole({ eventId, onEditSetup }: { eventId: string; onEditSetup?: () => void }) {
  const [live, setLive] = useState<ConsoleState | null>(null);
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [online, setOnline] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");
  const [origin, setOrigin] = useState("");
  const aligned = useServerClock(live?.serverNow ?? null);

  const refresh = useCallback(async () => {
    const [liveRes, eventRes] = await Promise.all([
      fetch(`/api/admin/live-quizzes/${eventId}/live`, { cache: "no-store" }),
      fetch(`/api/admin/live-quizzes/${eventId}`, { cache: "no-store" }),
    ]);
    if (liveRes.ok) setLive((await liveRes.json()) as ConsoleState);
    if (eventRes.ok) setEvent((await eventRes.json()) as AdminEvent);
  }, [eventId]);

  useEffect(() => {
    setOrigin(window.location.origin);
    void refresh();
    const id = setInterval(() => void refresh(), 1000);
    return () => clearInterval(id);
  }, [refresh]);

  useQuizRealtime(live?.code ?? "", () => void refresh(), null, setOnline);

  useEffect(() => {
    if (!live?.publicPath || !origin) return;
    let cancel = false;
    void QRCode.toDataURL(`${origin}${live.publicPath}`, { width: 280, margin: 1 }).then((url) => {
      if (!cancel) setQr(url);
    });
    return () => {
      cancel = true;
    };
  }, [live?.publicPath, origin]);

  async function run(action: Action, confirmText?: string) {
    if (busy) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/live-quizzes/${eventId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "진행하지 못했습니다");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "진행하지 못했습니다");
    } finally {
      setBusy(false);
    }
  }

  async function review(answerId: string, correct: boolean) {
    const res = await fetch(`/api/admin/live-quizzes/${eventId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerId, correct }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "판정을 바꾸지 못했습니다");
      return;
    }
    await refresh();
  }

  if (!live) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" />
        운영 화면을 불러오는 중
      </div>
    );
  }

  const currentImage = event?.questions.find((question) => question.id === live.currentQuestion?.id)?.imageData ?? null;
  const remain = remainingSeconds(live.endsAt, aligned, live.currentQuestion?.timeLimit ?? 30);
  const maxScore = Math.max(1, ...live.standings.map((row) => row.totalScaled));
  const tie = live.awardTie.first || live.awardTie.second;
  const joinUrl = live.publicPath ? `${origin}${live.publicPath}` : "";

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-indigo-700">실시간 퀴즈</p>
          <h1 className="text-2xl font-bold text-gray-900">{live.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {phaseLabel(live.status, live.phase)} · 조 {live.teamCount} · 참가 {live.participantCount}명 · 화면 접속 {online}명 · 문제 {live.playedCount}/{live.questionCount}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {live.publicPath && (
            <a href={`${live.publicPath}/screen`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium">
              <ExternalLink size={14} />
              발표 화면 열기
            </a>
          )}
          {onEditSetup && live.phase === "lobby" && !live.rosterLocked && (
            <button type="button" onClick={onEditSetup} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium">
              문제 수정
            </button>
          )}
          <a href={`/api/admin/live-quizzes/${eventId}/export`} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium">
            결과 다운로드
          </a>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          {live.phase === "lobby" && qr && (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="참가 QR코드" className="mx-auto h-44 w-44" />
              )}
              <p className="mt-2 break-all text-xs text-gray-500">{joinUrl}</p>
            </section>
          )}
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold">조별 현황</h2>
            <ul className="mt-3 space-y-3">
              {live.teams.map((team) => {
                const denom = team.lockedSize || team.expectedSize || 1;
                const width = Math.min(100, Math.round(((live.phase === "question" ? team.submitted : team.joined) / denom) * 100));
                return (
                  <li key={team.id}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{team.name}</span>
                      <span className="tabular-nums text-gray-500">
                        {live.rosterLocked ? `확정 ${team.lockedSize} · 제출 ${team.submitted}` : `입장 ${team.joined}/${team.expectedSize}`}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full bg-indigo-500" style={{ width: `${width}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          {live.phase === "question" && live.currentQuestion && (
            <div className="mb-4 flex items-end justify-between">
              <p className="text-sm text-gray-500">{live.currentQuestion.index}번 · {live.currentQuestion.points}점 · 제출 {live.submittedCount}/{live.participantCount}</p>
              <p className={`text-6xl font-black tabular-nums leading-none ${remain <= 5 ? "text-rose-600" : "text-indigo-700"}`}>{remain}</p>
            </div>
          )}
          {currentImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentImage} alt="" className="mb-4 max-h-48 rounded-xl object-contain" />
          )}
          <p className="text-xl font-bold">{live.currentQuestion?.prompt || (live.phase === "lobby" ? "참가자가 조를 선택하면 여기에 인원이 모입니다." : "대기")}</p>
          {live.currentQuestion && live.phase !== "question" && live.currentQuestion.answerLabel && (
            <p className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800">정답 {live.currentQuestion.answerLabel}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {live.phase === "lobby" && !live.rosterLocked && (
              <button type="button" disabled={busy} onClick={() => run("lock_roster", "지금 입장한 인원을 점수 분모로 확정할까요?")} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                인원 확정
              </button>
            )}
            {live.phase === "lobby" && live.rosterLocked && (
              <button type="button" disabled={busy} onClick={() => run("start")} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {live.nextIndex ?? 1}번 문제 시작
              </button>
            )}
            {live.phase === "question" && (
              <button type="button" disabled={busy} onClick={() => run("end", "지금 문제를 마감할까요?")} className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                문제 마감
              </button>
            )}
            {live.phase === "closed" && (
              <button type="button" disabled={busy} onClick={() => run("reveal")} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                정답 공개
              </button>
            )}
            {live.phase === "reveal" && live.nextIndex && (
              <button type="button" disabled={busy} onClick={() => run("start")} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {live.nextIndex}번 문제 시작
              </button>
            )}
            {live.phase === "reveal" && !live.nextIndex && (
              <button type="button" disabled={busy || (tie && live.questionCount < 10)} onClick={() => run("show_second")} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                2등 발표
              </button>
            )}
            {live.phase === "final" && live.finalStep === 1 && (
              <button type="button" disabled={busy} onClick={() => run("show_first")} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                1등 발표
              </button>
            )}
            {live.phase === "final" && live.finalStep === 2 && (
              <button type="button" disabled={busy} onClick={() => run("end_event", "행사를 종료할까요?")} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                행사 종료
              </button>
            )}
            {live.phase !== "question" && live.phase !== "ended" && live.questionCount < 10 && (
              <button type="button" disabled={busy} onClick={() => run("add_tiebreak")} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium disabled:opacity-50">
                추가 문제
              </button>
            )}
            {live.phase === "lobby" && live.rosterLocked && (
              <button type="button" disabled={busy} onClick={() => run("unlock_roster")} className="rounded-xl border border-gray-300 px-4 py-3 text-sm disabled:opacity-50">
                인원 확정 해제
              </button>
            )}
            {live.status === "live" && (
              <button type="button" disabled={busy} onClick={() => run("cancel", "행사를 취소할까요? 참가자는 더 이상 답할 수 없습니다.")} className="rounded-xl border border-rose-200 px-4 py-3 text-sm text-rose-700 disabled:opacity-50">
                행사 취소
              </button>
            )}
          </div>
          {tie && live.phase !== "question" && live.phase !== "lobby" && (
            <p className="mt-3 text-sm text-amber-700">1등 또는 2등이 동점입니다. 추가 문제로 순위를 가를 수 있습니다.</p>
          )}
          <p className="mt-4 text-xs leading-5 text-gray-400">
            조 점수 = 정답 인원 / 확정 인원 × 배점. 미제출은 오답이고, 인원이 달라도 만점은 같습니다.
          </p>
        </section>
      </div>

      {live.questionResults && (
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold">이번 문제</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {live.questionResults.map((result) => (
              <div key={result.teamId} className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{result.teamName}</span>
                  <span className="tabular-nums">{formatScaled(result.pointsScaled)}점</span>
                </div>
                <p className="text-xs text-gray-500">
                  정답 {result.correctCount}/{result.rosterSize}
                  {result.allCorrect ? " · 전원 정답" : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {live.standings.length > 0 && (
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold">누적 순위</h2>
          <ol className="mt-3 space-y-2">
            {live.standings.map((row) => {
              const delta = row.previousRank == null ? 0 : row.previousRank - row.rank;
              return (
                <li key={row.teamId} className="grid grid-cols-[4rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-semibold">{row.rank}등 {delta > 0 ? "↑" : delta < 0 ? "↓" : ""}</span>
                  <div>
                    <div className="mb-1 flex justify-between"><span>{row.teamName}</span><span className="tabular-nums">{formatScaled(row.totalScaled)}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(row.totalScaled / maxScore) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{row.rosterSize}명</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {live.review && live.review.length > 0 && (
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold">답변 검토</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {live.review.map((answer) => (
              <li key={answer.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="text-gray-500">{answer.teamName}</span> {answer.answerText || answer.optionId}
                  {answer.overridden ? " · 수정됨" : ""}
                </span>
                <button type="button" onClick={() => review(answer.id, !answer.isCorrect)} className={`rounded-lg px-2 py-1 text-xs font-medium ${answer.isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {answer.isCorrect ? "정답" : "오답"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PendingQuestion
        key={event?.questions.find((question) => question.sortOrder === live.nextIndex)?.id ?? "none"}
        eventId={eventId}
        question={event?.questions.find((question) => question.sortOrder === live.nextIndex) ?? null}
        onSaved={() => void refresh()}
      />
    </div>
  );
}

function PendingQuestion({
  eventId,
  question,
  onSaved,
}: {
  eventId: string;
  question: StoredQuestion | null;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<StoredQuestion | null>(question);
  const [message, setMessage] = useState("");
  if (!question || !draft || !questionReady(question)) return null;
  const current = question;

  async function save() {
    const res = await fetch(`/api/admin/live-quizzes/${eventId}/question`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, questionId: current.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "문제를 저장하지 못했습니다");
      return;
    }
    setMessage("저장했습니다");
    onSaved();
  }

  return (
    <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold">{current.sortOrder}번 문제를 채워야 시작할 수 있습니다</h2>
      <textarea value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} className="mt-3 h-20 w-full rounded-xl border border-amber-200 px-3 py-2 text-sm" />
      {draft.kind === "choice" ? (
        <ul className="mt-2 space-y-2">
          {(draft.options.length === 4 ? draft.options : emptyOptions()).map((option) => (
            <li key={option.id} className="flex items-center gap-2">
              <input type="radio" checked={draft.correctOptionId === option.id} onChange={() => setDraft({ ...draft, correctOptionId: option.id })} />
              <input value={option.text} onChange={(event) => setDraft({ ...draft, options: draft.options.map((item) => (item.id === option.id ? { ...item, text: event.target.value } : item)) })} className="flex-1 rounded-lg border border-amber-200 px-3 py-2 text-sm" />
            </li>
          ))}
        </ul>
      ) : (
        <textarea value={draft.acceptedAnswers.join("\n")} onChange={(event) => setDraft({ ...draft, acceptedAnswers: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })} className="mt-2 h-20 w-full rounded-xl border border-amber-200 px-3 py-2 text-sm" />
      )}
      {message && <p className="mt-2 text-sm">{message}</p>}
      <button type="button" onClick={() => void save()} className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">문제 저장</button>
    </section>
  );
}

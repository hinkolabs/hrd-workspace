"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Loader2, Plus, Timer } from "lucide-react";
import { type AdminListItem, phaseLabel } from "@/lib/live-quiz";

export default function AdminQuizListPage() {
  const [quizzes, setQuizzes] = useState<AdminListItem[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [sql, setSql] = useState("");
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/live-quizzes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "목록을 불러오지 못했습니다");
      setNeedsSetup(Boolean(data.needsSetup));
      setSql(typeof data.sql === "string" ? data.sql : "");
      setQuizzes(data.quizzes ?? []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "목록을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    void load();
  }, []);

  async function setup() {
    setSettingUp(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/live-quizzes/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setSql(data.sql || "");
        throw new Error(data.message || data.error || "테이블을 만들지 못했습니다");
      }
      setNeedsSetup(false);
      setMessage("테이블을 만들었습니다.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "테이블을 만들지 못했습니다");
    } finally {
      setSettingUp(false);
    }
  }

  async function copyLink(path: string) {
    await navigator.clipboard.writeText(`${origin}${path}`);
    setCopied(path);
  }

  async function remove(quiz: AdminListItem) {
    if (!window.confirm(`"${quiz.title}" 퀴즈를 삭제할까요? 참가 기록도 함께 삭제됩니다.`)) return;
    const res = await fetch(`/api/admin/live-quizzes/${quiz.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || "삭제에 실패했습니다");
      return;
    }
    setQuizzes((prev) => prev.filter((item) => item.id !== quiz.id));
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">실시간 퀴즈</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            문제를 발행하면 로그인 없는 참가 주소와 QR이 생깁니다. 참가자는 조를 고르고, 운영 화면에서 문제를 시작할 때마다 같은 문제가 열립니다. 조 점수는 확정 인원 대비 정답률에 배점을 곱합니다.
          </p>
        </div>
        <Link
          href="/admin/quiz/new"
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          새 퀴즈
        </Link>
      </div>

      {message && <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">{message}</p>}

      {needsSetup && (
        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-950">Supabase SQL Editor에 아래 쿼리를 붙여 넣고 실행하세요.</p>
          <p className="mt-1 text-sm text-amber-900">실행 후 이 화면을 새로고침하면 퀴즈를 만들 수 있습니다.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!sql}
              onClick={async () => {
                await navigator.clipboard.writeText(sql);
                setCopied("sql");
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Copy size={14} />
              {copied === "sql" ? "복사됨" : "SQL 복사"}
            </button>
            <button
              type="button"
              onClick={setup}
              disabled={settingUp}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950 disabled:opacity-50"
            >
              {settingUp && <Loader2 size={14} className="animate-spin" />}
              자동 생성 다시 시도
            </button>
          </div>
          <textarea
            readOnly
            value={sql}
            className="mt-3 h-96 w-full rounded-lg border border-amber-200 bg-white p-3 font-mono text-xs leading-5"
          />
        </section>
      )}

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          불러오는 중
        </div>
      ) : quizzes.length === 0 && !needsSetup ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <Timer className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-600">아직 만든 퀴즈가 없습니다.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {quizzes.map((quiz) => (
            <li key={quiz.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/quiz/${quiz.id}`} className="text-base font-semibold text-gray-900 hover:underline">
                      {quiz.title}
                    </Link>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {phaseLabel(quiz.status, quiz.phase)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    문제 {quiz.questionCount} · 조 {quiz.teamCount} · 입장 {quiz.participantCount}명
                  </p>
                  {quiz.publicPath && (
                    <p className="mt-1 break-all text-xs text-indigo-700">{origin}{quiz.publicPath}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {quiz.publicPath && (
                    <button
                      type="button"
                      onClick={() => copyLink(quiz.publicPath!)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Copy size={13} />
                      {copied === quiz.publicPath ? "복사됨" : "주소 복사"}
                    </button>
                  )}
                  <Link
                    href={`/admin/quiz/${quiz.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    열기
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(quiz)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

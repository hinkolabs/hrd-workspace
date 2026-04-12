"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft, Users, Copy, ExternalLink, ChevronDown, ChevronUp,
  Loader2, BarChart2, CheckCircle2, Clock, MessageSquare,
} from "lucide-react";
import Link from "next/link";

type Response = {
  id: string;
  respondent_name: string;
  respondent_dept: string | null;
  answers: Record<string, string>;
  created_at: string;
};

type Question = {
  id: string;
  question_text: string;
  sort_order: number;
};

type Session = {
  id: string;
  title: string;
  status: string;
};

export default function ResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);

  const surveyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/tools/ice/survey/${id}`
    : "";

  useEffect(() => {
    async function load() {
      const [sessionRes, responsesRes] = await Promise.all([
        fetch(`/api/tools/ice/${id}`),
        fetch(`/api/tools/ice/${id}/responses`),
      ]);
      const sData = await sessionRes.json();
      const rData = await responsesRes.json();
      setSession(sData.session);
      setQuestions(sData.questions ?? []);
      setResponses(rData.responses ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  // Poll every 10s while collecting
  useEffect(() => {
    if (session?.status !== "collecting") return;
    const interval = setInterval(async () => {
      const r = await fetch(`/api/tools/ice/${id}/responses`);
      const d = await r.json();
      setResponses(d.responses ?? []);
    }, 10000);
    return () => clearInterval(interval);
  }, [id, session?.status]);

  function toggleExpand(rid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(rid) ? next.delete(rid) : next.add(rid);
      return next;
    });
  }

  async function handleClose() {
    if (!confirm(`설문을 마감하고 채점을 시작할까요?\n수집된 응답 ${responses.length}개가 Pain Point 목록으로 변환됩니다.`)) return;
    setClosing(true);
    try {
      // 1. 세션 상태 → scoring
      await fetch(`/api/tools/ice/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scoring" }),
      });

      // 2. 각 응답의 첫 번째 textarea 질문 답변을 Pain Point로 추출
      const firstTextQ = questions.find((q) => true); // 순서 기준 첫 질문
      const scores = responses.map((resp) => {
        const painPoint = firstTextQ
          ? (resp.answers[firstTextQ.id] || Object.values(resp.answers)[0] || "").slice(0, 200)
          : Object.values(resp.answers)[0] ?? "";
        return {
          pain_point: painPoint || `${resp.respondent_name}의 Pain Point`,
          source_response_id: resp.id,
          impact: 5,
          confidence: 5,
          ease: 5,
        };
      }).filter((s) => s.pain_point.trim());

      // 3. 채점 초기 데이터 생성
      await fetch(`/api/tools/ice/${id}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores }),
      });

      // 4. 채점 페이지로 이동
      router.push(`/tools/ice/${id}/score`);
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setClosing(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function answerLength(answers: Record<string, string>) {
    return Object.values(answers).join("").length;
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" /> 불러오는 중...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/tools/ice" className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">{session?.title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">응답 모니터링</p>
          </div>
          {session?.status === "collecting" && (
            <button
              onClick={handleClose}
              disabled={closing || responses.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {closing ? <Loader2 size={14} className="animate-spin" /> : <BarChart2 size={14} />}
              {closing ? "처리 중..." : "설문 마감 + 채점 시작"}
            </button>
          )}
          {session?.status === "scoring" && (
            <Link
              href={`/tools/ice/${id}/score`}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors"
            >
              <BarChart2 size={14} />
              채점 계속하기
            </Link>
          )}
          {session?.status === "completed" && (
            <Link
              href={`/tools/ice/${id}/result`}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 size={14} />
              결과 보기
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl font-extrabold text-indigo-600">{responses.length}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">총 응답</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl font-extrabold text-gray-700">
              {responses.length > 0 ? Math.round(responses.reduce((s, r) => s + answerLength(r.answers), 0) / responses.length) : 0}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">평균 글자 수</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <div className={`text-xl font-extrabold ${
              session?.status === "collecting" ? "text-blue-600" :
              session?.status === "scoring" ? "text-amber-600" :
              session?.status === "completed" ? "text-emerald-600" : "text-gray-500"
            }`}>
              {session?.status === "collecting" ? "수집중" :
               session?.status === "scoring" ? "채점중" :
               session?.status === "completed" ? "완료" : "임시"}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">현재 상태</div>
          </div>
        </div>

        {/* Survey link */}
        {session?.status === "collecting" && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <MessageSquare size={16} className="text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-700 mb-0.5">설문 수집 중</p>
              <p className="text-[11px] text-blue-600 truncate">{surveyUrl}</p>
            </div>
            <button onClick={copyLink} className="text-[11px] flex items-center gap-1 text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2 py-1 shrink-0">
              {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
              {copied ? "복사됨" : "복사"}
            </button>
            <a href={surveyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0">
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* Response list */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">응답자 목록</h2>
          </div>

          {responses.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-12 flex flex-col items-center gap-2 text-gray-400">
              <Clock size={24} className="text-gray-300" />
              <p className="text-sm">아직 응답이 없습니다</p>
              <p className="text-xs">설문 링크를 팀원들에게 공유해보세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {responses.map((resp, idx) => (
                <div key={resp.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleExpand(resp.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {resp.respondent_name}
                        {resp.respondent_dept && (
                          <span className="text-xs text-gray-400 ml-2">({resp.respondent_dept})</span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatDate(resp.created_at)} · {answerLength(resp.answers)}자
                      </p>
                    </div>
                    {expanded.has(resp.id) ? (
                      <ChevronUp size={15} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown size={15} className="text-gray-400 shrink-0" />
                    )}
                  </button>

                  {expanded.has(resp.id) && (
                    <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50">
                      {questions.map((q, qi) => (
                        <div key={q.id}>
                          <p className="text-[11px] font-semibold text-gray-500 mb-1">
                            Q{qi + 1}. {q.question_text}
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white border border-gray-100 rounded-lg px-3 py-2">
                            {resp.answers[q.id] || <span className="text-gray-300 italic">미응답</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { CtaButton } from "./cta-button";
import { ShareButton } from "./share-button";

interface Option {
  text: string;
  emoji: string;
  scores: Record<string, number>;
}

interface Question {
  id: string;
  question_text: string;
  question_emoji: string;
  sort_order: number;
  options: Option[];
}

interface QuizResult {
  id: string;
  result_key: string;
  result_emoji: string;
  title: string;
  description: string;
}

interface Campaign {
  id: string;
  title: string;
  cover_emoji: string;
  theme_color: string;
  og_description: string;
  cta_text: string;
  cta_url: string;
  cta_description: string;
  questions: Question[];
  results: QuizResult[];
}

type Phase = "cover" | "quiz" | "loading" | "result";

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function QuizPlayer({ campaign }: { campaign: Campaign }) {
  const [phase, setPhase] = useState<Phase>("cover");
  const [currentQ, setCurrentQ] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  const { questions, results, theme_color } = campaign;
  const rgb = hexToRgb(theme_color);

  useEffect(() => {
    fetch(`/api/promo/${campaign.id}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "view" }),
    });
  }, [campaign.id]);

  function handleStart() {
    setPhase("quiz");
    setCurrentQ(0);
    setScores({});
  }

  function handleOption(option: Option, idx: number) {
    if (selected !== null || animating) return;
    setSelected(idx);

    const newScores = { ...scores };
    for (const [key, val] of Object.entries(option.scores)) {
      newScores[key] = (newScores[key] ?? 0) + val;
    }

    setTimeout(() => {
      setAnimating(true);
      setTimeout(() => {
        setScores(newScores);
        setSelected(null);
        setAnimating(false);

        if (currentQ + 1 >= questions.length) {
          setPhase("loading");
          setTimeout(() => {
            const topKey = Object.entries(newScores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "A";
            const found = results.find((r) => r.result_key === topKey) ?? results[0];
            setResult(found);
            setPhase("result");
          }, 2000);
        } else {
          setCurrentQ((q) => q + 1);
        }
      }, 300);
    }, 400);
  }

  function handleRetry() {
    setPhase("cover");
    setCurrentQ(0);
    setScores({});
    setResult(null);
    setSelected(null);
  }

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  if (phase === "cover") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-white text-center"
        style={{ background: `linear-gradient(135deg, rgba(${rgb},1) 0%, rgba(${rgb},0.7) 100%)` }}
      >
        <div className="text-8xl mb-6 animate-bounce">{campaign.cover_emoji}</div>
        <h1 className="text-3xl font-black mb-4 leading-tight">{campaign.title}</h1>
        {campaign.og_description && (
          <p className="text-white/80 text-base mb-10 max-w-xs leading-relaxed">
            {campaign.og_description}
          </p>
        )}
        <button
          onClick={handleStart}
          className="w-full max-w-xs py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform"
          style={{ backgroundColor: "white", color: theme_color }}
        >
          테스트 시작하기 →
        </button>
        <p className="text-white/50 text-xs mt-6">총 {questions.length}문제 · 1분 소요</p>
      </div>
    );
  }

  if (phase === "quiz") {
    const q = questions[currentQ];
    const progress = ((currentQ) / questions.length) * 100;

    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: `linear-gradient(160deg, rgba(${rgb},0.08) 0%, white 40%)` }}
      >
        {/* 상단 진행 바 */}
        <div className="w-full h-1.5 bg-gray-100">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: theme_color }}
          />
        </div>

        <div className="flex-1 flex flex-col px-5 pt-6 pb-8 max-w-lg mx-auto w-full">
          <p className="text-xs text-gray-400 mb-4 font-medium">
            {currentQ + 1} / {questions.length}
          </p>

          {/* 질문 카드 */}
          <div
            className={`mb-8 transition-opacity duration-300 ${animating ? "opacity-0" : "opacity-100"}`}
          >
            <div className="text-5xl mb-4">{q.question_emoji}</div>
            <h2 className="text-xl font-black text-gray-900 leading-snug">{q.question_text}</h2>
          </div>

          {/* 선택지 */}
          <div className={`space-y-3 transition-opacity duration-300 ${animating ? "opacity-0" : "opacity-100"}`}>
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleOption(opt, idx)}
                className={`w-full py-4 px-5 rounded-2xl text-left font-semibold text-sm transition-all duration-200 active:scale-98 flex items-center gap-3 shadow-sm ${
                  selected === idx
                    ? "text-white shadow-lg scale-[1.02]"
                    : selected !== null
                    ? "bg-gray-50 text-gray-300 border border-gray-100"
                    : "bg-white text-gray-800 border border-gray-100 hover:border-opacity-50 hover:shadow-md"
                }`}
                style={
                  selected === idx
                    ? { backgroundColor: theme_color, borderColor: theme_color }
                    : {}
                }
              >
                <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
                <span>{opt.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center text-white"
        style={{ background: `linear-gradient(135deg, rgba(${rgb},1) 0%, rgba(${rgb},0.7) 100%)` }}
      >
        <div className="text-6xl mb-6 animate-spin">🔮</div>
        <p className="text-xl font-bold">결과 분석 중...</p>
        <p className="text-white/70 text-sm mt-2">당신의 유형을 찾고 있어요</p>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* 결과 헤더 */}
        <div
          className="pt-16 pb-10 px-6 text-white text-center"
          style={{ background: `linear-gradient(135deg, rgba(${rgb},1) 0%, rgba(${rgb},0.8) 100%)` }}
        >
          <p className="text-sm font-medium text-white/70 mb-3">나의 결과는...</p>
          <div className="text-7xl mb-4">{result.result_emoji}</div>
          <h2 className="text-2xl font-black mb-2">{result.title}</h2>
        </div>

        {/* 결과 설명 */}
        <div className="flex-1 bg-white px-6 py-8 max-w-lg mx-auto w-full">
          <p className="text-gray-700 leading-relaxed text-base whitespace-pre-line mb-8">
            {result.description}
          </p>

          {/* CTA */}
          {campaign.cta_url && (
            <div className="mb-6 p-5 rounded-2xl border border-gray-100 bg-gray-50">
              {campaign.cta_description && (
                <p className="text-sm text-gray-500 mb-3">{campaign.cta_description}</p>
              )}
              <CtaButton
                campaignId={campaign.id}
                ctaText={campaign.cta_text}
                ctaUrl={campaign.cta_url}
                themeColor={theme_color}
                className="w-full py-4 rounded-xl font-bold text-white text-base active:scale-95 transition-transform"
              />
            </div>
          )}

          {/* 공유 버튼 */}
          <ShareButton
            campaignId={campaign.id}
            title={`${result.result_emoji} ${result.title}`}
            description={`나는 "${result.title}" 유형! 너는? ${campaign.title}`}
            url={pageUrl}
            className="w-full py-4 rounded-xl font-bold text-base bg-yellow-400 text-gray-900 active:scale-95 transition-transform mb-3"
          />

          <button
            onClick={handleRetry}
            className="w-full py-3 rounded-xl font-medium text-sm text-gray-400 bg-gray-50 active:scale-95 transition-transform"
          >
            다시 테스트하기
          </button>
        </div>
      </div>
    );
  }

  return null;
}

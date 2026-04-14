"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ChevronRight, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

type CampaignType = "quiz" | "info_card";
type Tone = "funny" | "cute" | "emotional" | "serious";

const TONE_OPTIONS: { value: Tone; label: string; emoji: string; desc: string }[] = [
  { value: "funny",     label: "웃긴",   emoji: "😂", desc: "MZ 유머, 공감 폭발" },
  { value: "cute",      label: "귀여운", emoji: "🥰", desc: "친근하고 따뜻한" },
  { value: "emotional", label: "감성",   emoji: "🌙", desc: "잔잔하고 감성적인" },
  { value: "serious",   label: "진지한", emoji: "💼", desc: "신뢰감 있는" },
];

type SuggestedTopic = { title: string; description: string; emoji: string; format?: string };

type GeneratedQuiz = {
  cover_emoji: string;
  og_title: string;
  og_description: string;
  theme_color: string;
  questions: {
    question_text: string;
    question_emoji: string;
    options: { text: string; emoji: string; scores: Record<string, number> }[];
  }[];
  results: {
    result_key: string;
    result_emoji: string;
    title: string;
    description: string;
  }[];
};

type GeneratedInfoCard = {
  cover_emoji: string;
  og_title: string;
  og_description: string;
  theme_color: string;
  hero_title: string;
  hero_subtitle: string;
  cta_text: string;
  sections: { icon: string; title: string; content: string }[];
};

type Generated = GeneratedQuiz | GeneratedInfoCard;

function isQuiz(g: Generated): g is GeneratedQuiz {
  return "questions" in g;
}

export default function NewPromoPage() {
  const router = useRouter();

  const [step, setStep] = useState<"type" | "prompt" | "preview">("type");
  const [type, setType] = useState<CampaignType>("quiz");

  // 퀴즈 입력
  const [topic, setTopic] = useState("");
  const [product, setProduct] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [tone, setTone] = useState<Tone>("funny");
  // 정보카드 입력
  const [keywords, setKeywords] = useState("");

  const [generating, setGenerating] = useState(false);
  const [suggestingTopics, setSuggestingTopics] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<SuggestedTopic[]>([]);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [saving, setSaving] = useState(false);

  async function fetchTopics() {
    setSuggestingTopics(true);
    try {
      const res = await fetch("/api/promo/generate/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      const data = await res.json();
      setSuggestedTopics(data.topics ?? []);
    } finally {
      setSuggestingTopics(false);
    }
  }

  async function generate() {
    setGenerating(true);
    try {
      const body =
        type === "quiz"
          ? { type, topic, product, tone }
          : { type, product, keywords };

      const res = await fetch("/api/promo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("생성 실패");
      const data = await res.json();
      setGenerated(data);
      setStep("preview");
    } catch (e) {
      alert("AI 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!generated) return;
    setSaving(true);

    try {
      const title =
        type === "quiz"
          ? (generated as GeneratedQuiz).og_title || topic
          : product;

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 40) + "-" + Date.now().toString(36);

      const campaignRes = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          type,
          theme_color: generated.theme_color,
          cover_emoji: generated.cover_emoji,
          og_title: generated.og_title,
          og_description: generated.og_description,
          cta_url: ctaUrl || null,
          cta_text:
            type === "info_card"
              ? (generated as GeneratedInfoCard).cta_text
              : "자세히 보기",
          status: "draft",
        }),
      });

      if (!campaignRes.ok) throw new Error("캠페인 저장 실패");
      const campaign = await campaignRes.json();

      if (type === "quiz" && isQuiz(generated)) {
        await Promise.all([
          fetch(`/api/promo/${campaign.id}/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(generated.questions),
          }),
          fetch(`/api/promo/${campaign.id}/results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(generated.results),
          }),
        ]);
      }

      if (type === "info_card" && !isQuiz(generated)) {
        await fetch(`/api/promo/${campaign.id}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            generated.sections.map((s, i) => ({ ...s, sort_order: i }))
          ),
        });
      }

      router.push(`/tools/promo/${campaign.id}`);
    } catch (e) {
      alert("저장 중 오류가 발생했습니다.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/tools/promo" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-400" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">새 캠페인</h1>
      </div>

      {/* STEP 1: 타입 선택 */}
      {step === "type" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">어떤 형태로 만들까요?</p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {(
              [
                { value: "quiz" as CampaignType, emoji: "🧠", title: "심리테스트", desc: "바이럴 최강 포맷. 결과 공유 유도" },
                { value: "info_card" as CampaignType, emoji: "📋", title: "정보카드", desc: "혜택 랜딩페이지. 상품 정보 전달" },
              ] as const
            ).map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  type === t.value
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-100 bg-white hover:border-gray-200"
                }`}
              >
                <div className="text-3xl mb-3">{t.emoji}</div>
                <p className={`font-bold mb-1 ${type === t.value ? "text-indigo-700" : "text-gray-900"}`}>
                  {t.title}
                </p>
                <p className="text-xs text-gray-400">{t.desc}</p>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("prompt")}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            다음 <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* STEP 2: 프롬프트 입력 */}
      {step === "prompt" && (
        <div>
          {type === "quiz" ? (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">테스트 주제</label>
                  <button
                    onClick={fetchTopics}
                    disabled={suggestingTopics}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 disabled:opacity-50"
                    title={!product ? "상품명을 먼저 입력하면 더 정확한 주제를 추천해줘요" : ""}
                  >
                    {suggestingTopics ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {product ? "상품 맞춤 추천" : "AI 추천 받기"}
                  </button>
                </div>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="예: 전생 직업 테스트, MBTI별 점심 메뉴..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                />
                {/* AI 추천 주제 */}
                {suggestedTopics.length > 0 && (
                  <div className="mt-3">
                    {product && (
                      <p className="text-xs text-indigo-500 mb-2 font-medium">
                        💡 "{product}" 타깃에 맞춰 추천
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {suggestedTopics.map((t, i) => (
                        <button
                          key={i}
                          onClick={() => setTopic(t.title)}
                          className={`p-3 rounded-xl border text-left text-xs transition-all ${
                            topic === t.title
                              ? "border-indigo-400 bg-indigo-50"
                              : "border-gray-100 bg-white hover:border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-base">{t.emoji}</span>
                            <span className="font-semibold text-gray-800 leading-tight">{t.title}</span>
                          </div>
                          <p className="text-gray-400 leading-tight mb-1">{t.description}</p>
                          {t.format && (
                            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-400 font-medium">
                              {t.format}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="text-sm font-semibold text-gray-700 block mb-2">연결할 상품/서비스</label>
                <input
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="예: 나라사랑카드, 법인렌터카, 하나다이렉트..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                />
              </div>

              <div className="mb-6">
                <label className="text-sm font-semibold text-gray-700 block mb-2">CTA 링크 (선택)</label>
                <input
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                />
                <p className="text-xs text-gray-400 mt-1">나중에 편집 화면에서 추가할 수도 있습니다</p>
              </div>

              <div className="mb-8">
                <label className="text-sm font-semibold text-gray-700 block mb-2">톤앤매너</label>
                <div className="grid grid-cols-2 gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        tone === t.value
                          ? "border-indigo-400 bg-indigo-50"
                          : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <span className="text-xl mr-2">{t.emoji}</span>
                      <span className={`text-sm font-semibold ${tone === t.value ? "text-indigo-700" : "text-gray-800"}`}>
                        {t.label}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <label className="text-sm font-semibold text-gray-700 block mb-2">상품/서비스명</label>
                <input
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="예: 법인렌터카, 퇴직연금 IRP, 하나다이렉트 자동차보험..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                />
              </div>

              <div className="mb-6">
                <label className="text-sm font-semibold text-gray-700 block mb-2">주요 특징/혜택 키워드</label>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="예: 세제혜택, 관리편의, 비용절감, 개인명의 불필요..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white resize-none"
                />
              </div>

              <div className="mb-8">
                <label className="text-sm font-semibold text-gray-700 block mb-2">CTA 링크 (선택)</label>
                <input
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                />
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("type")}
              className="flex-1 py-3.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              이전
            </button>
            <button
              onClick={generate}
              disabled={
                generating ||
                (type === "quiz" ? !topic || !product : !product || !keywords)
              }
              className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  AI 생성 중...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  AI로 생성하기
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: 미리보기 */}
      {step === "preview" && generated && (
        <div>
          <div className="rounded-2xl border border-gray-100 overflow-hidden mb-6">
            {/* 미리보기 헤더 */}
            <div
              className="py-8 px-6 text-white text-center"
              style={{ backgroundColor: generated.theme_color }}
            >
              <div className="text-5xl mb-3">{generated.cover_emoji}</div>
              <h2 className="text-xl font-black">{generated.og_title}</h2>
              <p className="text-white/80 text-sm mt-1">{generated.og_description}</p>
            </div>

            <div className="p-5 bg-white">
              {isQuiz(generated) ? (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    질문 미리보기
                  </p>
                  <div className="space-y-3 mb-5">
                    {generated.questions.slice(0, 3).map((q, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-sm font-semibold text-gray-800">
                          {q.question_emoji} {q.question_text}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {q.options.map((o, j) => (
                            <span key={j} className="text-xs bg-white border border-gray-100 px-2 py-1 rounded-lg text-gray-600">
                              {o.emoji} {o.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {generated.questions.length > 3 && (
                      <p className="text-xs text-gray-400 text-center">+ {generated.questions.length - 3}개 더...</p>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    결과 유형
                  </p>
                  <div className="space-y-2">
                    {generated.results.map((r, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-sm font-bold text-gray-800">{r.result_emoji} {r.title}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    혜택 섹션
                  </p>
                  <div className="space-y-2">
                    {(generated as GeneratedInfoCard).sections.map((s, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                        <span className="text-xl flex-shrink-0">{s.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{s.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{s.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setStep("prompt"); setGenerated(null); }}
              className="flex items-center gap-1.5 px-4 py-3.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              다시 생성
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장하고 편집하기 →"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

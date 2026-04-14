"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  ExternalLink,
  Loader2,
  Trash2,
  GripVertical,
  Plus,
  Sparkles,
  Eye,
  MousePointerClick,
  Share2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

type CampaignType = "quiz" | "info_card";
type CampaignStatus = "draft" | "active" | "archived";

type Campaign = {
  id: string;
  title: string;
  slug: string;
  type: CampaignType;
  status: CampaignStatus;
  description: string | null;
  cta_text: string;
  cta_url: string | null;
  cta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  theme_color: string;
  cover_emoji: string;
  view_count: number;
  cta_click_count: number;
  share_count: number;
};

type Question = {
  id: string;
  question_text: string;
  question_emoji: string;
  sort_order: number;
  options: { text: string; emoji: string; scores: Record<string, number> }[];
};

type QuizResult = {
  id: string;
  result_key: string;
  result_emoji: string;
  title: string;
  description: string;
};

type Section = {
  id: string;
  sort_order: number;
  title: string;
  content: string;
  icon: string;
};

const STATUS_OPTIONS: { value: CampaignStatus; label: string; color: string }[] = [
  { value: "draft",    label: "초안",  color: "text-gray-600" },
  { value: "active",   label: "활성",  color: "text-emerald-600" },
  { value: "archived", label: "보관",  color: "text-orange-500" },
];

export default function PromoEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "content" | "stats">("basic");
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    async function load() {
      const [cRes, ...contentRes] = await Promise.all([
        fetch(`/api/promo/${id}`),
        fetch(`/api/promo/${id}/questions`),
        fetch(`/api/promo/${id}/results`),
        fetch(`/api/promo/${id}/sections`),
      ]);

      const c = await cRes.json();
      setCampaign(c);

      const [q, r, s] = await Promise.all(contentRes.map((res) => res.json()));
      setQuestions(Array.isArray(q) ? q : []);
      setResults(Array.isArray(r) ? r : []);
      setSections(Array.isArray(s) ? s : []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function saveCampaign() {
    if (!campaign) return;
    setSaving(true);
    try {
      await fetch(`/api/promo/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaign),
      });

      if (campaign.type === "quiz") {
        await Promise.all([
          fetch(`/api/promo/${id}/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(questions),
          }),
          fetch(`/api/promo/${id}/results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results),
          }),
        ]);
      } else {
        await fetch(`/api/promo/${id}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sections),
        });
      }

      alert("저장되었습니다!");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCampaign() {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await fetch(`/api/promo/${id}`, { method: "DELETE" });
    router.push("/tools/promo");
  }

  async function regenerateContent() {
    if (!campaign) return;
    const confirmRegen = confirm("AI로 콘텐츠를 다시 생성하면 현재 내용이 모두 교체됩니다. 계속할까요?");
    if (!confirmRegen) return;

    setRegenerating(true);
    try {
      const body =
        campaign.type === "quiz"
          ? { type: "quiz", topic: campaign.og_title || campaign.title, product: campaign.cta_text, tone: "funny" }
          : { type: "info_card", product: campaign.title, keywords: campaign.description || "" };

      const res = await fetch("/api/promo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      setCampaign((prev) => prev ? {
        ...prev,
        cover_emoji: data.cover_emoji,
        og_title: data.og_title,
        og_description: data.og_description,
        theme_color: data.theme_color,
      } : prev);

      if (campaign.type === "quiz" && data.questions) {
        setQuestions(data.questions.map((q: Question, i: number) => ({ ...q, id: `new-${i}`, sort_order: i })));
        setResults(data.results.map((r: QuizResult) => ({ ...r, id: `new-${r.result_key}` })));
      } else if (data.sections) {
        setSections(data.sections.map((s: Section, i: number) => ({ ...s, id: `new-${i}`, sort_order: i })));
      }
    } finally {
      setRegenerating(false);
    }
  }

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/tools/promo" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{campaign.cover_emoji}</span>
            <h1 className="text-lg font-bold text-gray-900 truncate max-w-xs">{campaign.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === "active" && (
            <a
              href={`/p/${campaign.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="미리보기"
            >
              <ExternalLink size={16} />
            </a>
          )}
          <button
            onClick={deleteCampaign}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={saveCampaign}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            저장
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        {(["basic", "content", "stats"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "basic" ? "기본 정보" : tab === "content" ? "콘텐츠" : "통계"}
          </button>
        ))}
      </div>

      {/* 기본 정보 탭 */}
      {activeTab === "basic" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">상태</label>
              <select
                value={campaign.status}
                onChange={(e) => setCampaign({ ...campaign, status: e.target.value as CampaignStatus })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">URL 슬러그</label>
              <div className="flex items-center px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
                <span className="text-gray-400">/p/</span>
                <span className="truncate">{campaign.slug}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">제목</label>
            <input
              value={campaign.title}
              onChange={(e) => setCampaign({ ...campaign, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">대표 이모지</label>
              <input
                value={campaign.cover_emoji}
                onChange={(e) => setCampaign({ ...campaign, cover_emoji: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-2xl focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">테마 색상</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={campaign.theme_color}
                  onChange={(e) => setCampaign({ ...campaign, theme_color: e.target.value })}
                  className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer p-1 bg-white"
                />
                <input
                  value={campaign.theme_color}
                  onChange={(e) => setCampaign({ ...campaign, theme_color: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">CTA 설정</p>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">버튼 텍스트</label>
            <input
              value={campaign.cta_text}
              onChange={(e) => setCampaign({ ...campaign, cta_text: e.target.value })}
              placeholder="자세히 보기"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">CTA 링크 URL</label>
            <input
              value={campaign.cta_url ?? ""}
              onChange={(e) => setCampaign({ ...campaign, cta_url: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">CTA 안내 문구 (선택)</label>
            <input
              value={campaign.cta_description ?? ""}
              onChange={(e) => setCampaign({ ...campaign, cta_description: e.target.value })}
              placeholder="예: 지금 가입하면 혜택을 드려요!"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
            />
          </div>

          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">카카오톡 미리보기 (OG 태그)</p>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">미리보기 제목</label>
            <input
              value={campaign.og_title ?? ""}
              onChange={(e) => setCampaign({ ...campaign, og_title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">미리보기 설명</label>
            <input
              value={campaign.og_description ?? ""}
              onChange={(e) => setCampaign({ ...campaign, og_description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
            />
          </div>
        </div>
      )}

      {/* 콘텐츠 탭 */}
      {activeTab === "content" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {campaign.type === "quiz" ? `질문 ${questions.length}개 · 결과 ${results.length}개` : `섹션 ${sections.length}개`}
            </p>
            <button
              onClick={regenerateContent}
              disabled={regenerating}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
            >
              {regenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              AI로 다시 생성
            </button>
          </div>

          {campaign.type === "quiz" ? (
            <QuizContentEditor
              questions={questions}
              results={results}
              themeColor={campaign.theme_color}
              onQuestionsChange={setQuestions}
              onResultsChange={setResults}
            />
          ) : (
            <InfoCardContentEditor
              sections={sections}
              themeColor={campaign.theme_color}
              onSectionsChange={setSections}
            />
          )}
        </div>
      )}

      {/* 통계 탭 */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <Eye size={20} />, value: campaign.view_count, label: "총 조회수", color: "text-blue-600 bg-blue-50" },
            { icon: <MousePointerClick size={20} />, value: campaign.cta_click_count, label: "CTA 클릭", color: "text-indigo-600 bg-indigo-50" },
            { icon: <Share2 size={20} />, value: campaign.share_count, label: "공유 횟수", color: "text-pink-600 bg-pink-50" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-3`}>
                {stat.icon}
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
          {campaign.view_count > 0 && (
            <div className="col-span-3 bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-500">
                CTA 클릭률: <span className="font-bold text-gray-700">
                  {((campaign.cta_click_count / campaign.view_count) * 100).toFixed(1)}%
                </span>
                &nbsp;· 공유율: <span className="font-bold text-gray-700">
                  {((campaign.share_count / campaign.view_count) * 100).toFixed(1)}%
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuizContentEditor({
  questions,
  results,
  themeColor,
  onQuestionsChange,
  onResultsChange,
}: {
  questions: Question[];
  results: QuizResult[];
  themeColor: string;
  onQuestionsChange: (q: Question[]) => void;
  onResultsChange: (r: QuizResult[]) => void;
}) {
  function updateQuestion(idx: number, field: keyof Question, value: unknown) {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: value };
    onQuestionsChange(updated);
  }

  function removeQuestion(idx: number) {
    onQuestionsChange(questions.filter((_, i) => i !== idx));
  }

  function updateResult(idx: number, field: keyof QuizResult, value: string) {
    const updated = [...results];
    updated[idx] = { ...updated[idx], [field]: value };
    onResultsChange(updated);
  }

  return (
    <div className="space-y-6">
      {/* 질문 목록 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">질문</p>
        <div className="space-y-3">
          {questions.map((q, qi) => (
            <div key={q.id ?? qi} className="border border-gray-100 rounded-2xl p-4 bg-white">
              <div className="flex items-start gap-3 mb-3">
                <GripVertical size={14} className="text-gray-300 mt-2 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={q.question_emoji}
                      onChange={(e) => updateQuestion(qi, "question_emoji", e.target.value)}
                      className="w-14 px-2 py-2 rounded-lg border border-gray-200 text-center text-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                    />
                    <input
                      value={q.question_text}
                      onChange={(e) => updateQuestion(qi, "question_text", e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-1">
                        <input
                          value={opt.emoji}
                          onChange={(e) => {
                            const opts = [...q.options];
                            opts[oi] = { ...opts[oi], emoji: e.target.value };
                            updateQuestion(qi, "options", opts);
                          }}
                          className="w-10 px-1 py-1.5 rounded-lg border border-gray-200 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-200 bg-white"
                        />
                        <input
                          value={opt.text}
                          onChange={(e) => {
                            const opts = [...q.options];
                            opts[oi] = { ...opts[oi], text: e.target.value };
                            updateQuestion(qi, "options", opts);
                          }}
                          className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-200 bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => removeQuestion(qi)} className="p-1 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 결과 유형 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">결과 유형</p>
        <div className="space-y-3">
          {results.map((r, ri) => (
            <div key={r.id ?? ri} className="border border-gray-100 rounded-2xl p-4 bg-white">
              <div className="flex gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: themeColor }}
                >
                  {r.result_key}
                </div>
                <input
                  value={r.result_emoji}
                  onChange={(e) => updateResult(ri, "result_emoji", e.target.value)}
                  className="w-12 px-2 py-1.5 rounded-lg border border-gray-200 text-center text-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                />
                <input
                  value={r.title}
                  onChange={(e) => updateResult(ri, "title", e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                />
              </div>
              <textarea
                value={r.description}
                onChange={(e) => updateResult(ri, "description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-gray-50 resize-none"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoCardContentEditor({
  sections,
  themeColor,
  onSectionsChange,
}: {
  sections: Section[];
  themeColor: string;
  onSectionsChange: (s: Section[]) => void;
}) {
  function update(idx: number, field: keyof Section, value: string) {
    const updated = [...sections];
    updated[idx] = { ...updated[idx], [field]: value };
    onSectionsChange(updated);
  }

  function remove(idx: number) {
    onSectionsChange(sections.filter((_, i) => i !== idx));
  }

  function add() {
    onSectionsChange([
      ...sections,
      { id: `new-${Date.now()}`, sort_order: sections.length, title: "", content: "", icon: "✨" },
    ]);
  }

  return (
    <div className="space-y-3">
      {sections.map((s, idx) => (
        <div key={s.id ?? idx} className="border border-gray-100 rounded-2xl p-4 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <input
                value={s.icon}
                onChange={(e) => update(idx, "icon", e.target.value)}
                className="w-8 text-center text-xl bg-transparent focus:outline-none"
              />
            </div>
            <input
              value={s.title}
              onChange={(e) => update(idx, "title", e.target.value)}
              placeholder="섹션 제목"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
            />
            <button onClick={() => remove(idx)} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
          <textarea
            value={s.content}
            onChange={(e) => update(idx, "content", e.target.value)}
            placeholder="혜택 설명"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-gray-50 resize-none"
          />
        </div>
      ))}

      <button
        onClick={add}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={14} />
        섹션 추가
      </button>
    </div>
  );
}

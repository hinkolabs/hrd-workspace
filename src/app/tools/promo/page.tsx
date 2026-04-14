"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  Plus,
  Eye,
  MousePointerClick,
  Share2,
  ExternalLink,
  Copy,
  Check,
  BarChart2,
  Archive,
  FileEdit,
  Loader2,
} from "lucide-react";

type CampaignStatus = "draft" | "active" | "archived";
type CampaignType = "quiz" | "info_card";

type Campaign = {
  id: string;
  title: string;
  slug: string;
  type: CampaignType;
  status: CampaignStatus;
  description: string | null;
  cover_emoji: string;
  theme_color: string;
  view_count: number;
  cta_click_count: number;
  share_count: number;
  created_at: string;
};

const STATUS_META: Record<CampaignStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: "초안",  color: "text-gray-500",   bg: "bg-gray-100" },
  active:   { label: "활성",  color: "text-emerald-600", bg: "bg-emerald-50" },
  archived: { label: "보관",  color: "text-orange-500",  bg: "bg-orange-50" },
};

const TYPE_META: Record<CampaignType, { label: string; emoji: string }> = {
  quiz:      { label: "심리테스트", emoji: "🧠" },
  info_card: { label: "정보카드",   emoji: "📋" },
};

function StatBadge({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      {icon}
      <span className="font-medium text-gray-600">{value.toLocaleString()}</span>
      <span>{label}</span>
    </div>
  );
}

export default function PromoCampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | CampaignStatus>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/promo?status=${filter}`)
      .then((r) => r.json())
      .then((d) => setCampaigns(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [filter]);

  async function copyLink(slug: string, id: string) {
    const url = `${window.location.origin}/p/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const totalViews = campaigns.reduce((s, c) => s + c.view_count, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.cta_click_count, 0);
  const totalShares = campaigns.reduce((s, c) => s + c.share_count, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Megaphone size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">홍보 캠페인</h1>
            <p className="text-xs text-gray-400">심리테스트 · 정보카드 · 바이럴 마케팅</p>
          </div>
        </div>
        <Link
          href="/tools/promo/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} />
          새 캠페인
        </Link>
      </div>

      {/* 요약 통계 */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: <Eye size={16} />, value: totalViews, label: "총 조회", color: "text-blue-600 bg-blue-50" },
            { icon: <MousePointerClick size={16} />, value: totalClicks, label: "CTA 클릭", color: "text-indigo-600 bg-indigo-50" },
            { icon: <Share2 size={16} />, value: totalShares, label: "공유", color: "text-pink-600 bg-pink-50" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                {stat.icon}
              </div>
              <p className="text-xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* 필터 탭 */}
      <div className="flex gap-1 mb-5 p-1 bg-gray-100 rounded-xl w-fit">
        {(["all", "active", "draft", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setLoading(true); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {s === "all" ? "전체" : STATUS_META[s].label}
          </button>
        ))}
      </div>

      {/* 캠페인 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📣</div>
          <p className="text-gray-500 mb-2 font-medium">캠페인이 없습니다</p>
          <p className="text-gray-400 text-sm mb-6">AI로 첫 번째 홍보 캠페인을 만들어보세요</p>
          <Link
            href="/tools/promo/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={14} />
            새 캠페인 만들기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const sm = STATUS_META[c.status];
            const tm = TYPE_META[c.type];
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:border-gray-200 transition-colors"
              >
                {/* 이모지 아이콘 */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: `${c.theme_color}15` }}
                >
                  {c.cover_emoji}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{c.title}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sm.bg} ${sm.color} flex-shrink-0`}>
                      {sm.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-400">{tm.emoji} {tm.label}</span>
                    <span className="text-xs text-gray-300">/p/{c.slug}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatBadge icon={<Eye size={11} />} value={c.view_count} label="조회" />
                    <StatBadge icon={<MousePointerClick size={11} />} value={c.cta_click_count} label="클릭" />
                    <StatBadge icon={<Share2 size={11} />} value={c.share_count} label="공유" />
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {c.status === "active" && (
                    <a
                      href={`/p/${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="미리보기"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => copyLink(c.slug, c.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    title="링크 복사"
                  >
                    {copiedId === c.id ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  </button>
                  <Link
                    href={`/tools/promo/${c.id}`}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="편집"
                  >
                    <FileEdit size={15} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

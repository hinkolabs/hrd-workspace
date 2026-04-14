"use client";

import { useEffect } from "react";
import { CtaButton } from "./cta-button";
import { ShareButton } from "./share-button";

interface Section {
  id: string;
  sort_order: number;
  title: string;
  content: string;
  icon: string;
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
  sections: Section[];
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function InfoCardPage({ campaign }: { campaign: Campaign }) {
  const { theme_color } = campaign;
  const rgb = hexToRgb(theme_color);
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    fetch(`/api/promo/${campaign.id}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "view" }),
    });
  }, [campaign.id]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* 히어로 */}
      <div
        className="pt-20 pb-14 px-6 text-white text-center"
        style={{ background: `linear-gradient(135deg, rgba(${rgb},1) 0%, rgba(${rgb},0.75) 100%)` }}
      >
        <div className="text-7xl mb-5">{campaign.cover_emoji}</div>
        <h1 className="text-3xl font-black mb-3 leading-tight">{campaign.title}</h1>
        {campaign.og_description && (
          <p className="text-white/80 text-base max-w-xs mx-auto leading-relaxed">
            {campaign.og_description}
          </p>
        )}
      </div>

      {/* 혜택 섹션 */}
      <div className="flex-1 bg-white px-5 py-8 max-w-lg mx-auto w-full">
        <div className="space-y-4 mb-10">
          {campaign.sections.map((section, idx) => (
            <div
              key={section.id ?? idx}
              className="flex gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: `rgba(${rgb}, 0.1)` }}
              >
                {section.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 mb-1 text-base">{section.title}</h3>
                {section.content && (
                  <p className="text-gray-500 text-sm leading-relaxed">{section.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        {campaign.cta_url && (
          <div className="mb-4">
            {campaign.cta_description && (
              <p className="text-sm text-gray-500 text-center mb-3">{campaign.cta_description}</p>
            )}
            <CtaButton
              campaignId={campaign.id}
              ctaText={campaign.cta_text}
              ctaUrl={campaign.cta_url}
              themeColor={theme_color}
              className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg active:scale-95 transition-transform"
            />
          </div>
        )}

        <ShareButton
          campaignId={campaign.id}
          title={campaign.title}
          description={campaign.og_description}
          url={pageUrl}
          className="w-full py-3 rounded-2xl font-medium text-sm bg-yellow-400 text-gray-900 active:scale-95 transition-transform"
        />
      </div>
    </div>
  );
}

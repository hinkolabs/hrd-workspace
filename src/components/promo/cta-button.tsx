"use client";

interface CtaButtonProps {
  campaignId: string;
  ctaText: string;
  ctaUrl: string;
  themeColor: string;
  className?: string;
}

export function CtaButton({ campaignId, ctaText, ctaUrl, themeColor, className }: CtaButtonProps) {
  async function handleClick() {
    await fetch(`/api/promo/${campaignId}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cta_click" }),
    });
    window.open(ctaUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      onClick={handleClick}
      className={className}
      style={{ backgroundColor: themeColor }}
    >
      {ctaText}
    </button>
  );
}

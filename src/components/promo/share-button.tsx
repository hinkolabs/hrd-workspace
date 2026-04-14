"use client";

import { useState } from "react";

interface ShareButtonProps {
  campaignId: string;
  title: string;
  description: string;
  url: string;
  className?: string;
}

export function ShareButton({ campaignId, title, description, url, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    await fetch(`/api/promo/${campaignId}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "share" }),
    });

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: description, url });
        return;
      } catch {
        // 취소하거나 실패하면 URL 복사로 fallback
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard도 안 되면 무시
    }
  }

  return (
    <button
      onClick={handleShare}
      className={className}
    >
      {copied ? "✅ 링크 복사됨!" : "🔗 친구에게 공유하기"}
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";

export function OptionImage({
  code,
  questionId,
  optionId,
  storageKey,
  screen,
  className,
}: {
  code: string;
  questionId: string;
  optionId: string;
  storageKey?: string;
  screen?: boolean;
  className: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    const headers: Record<string, string> = {};
    const token = storageKey ? window.localStorage.getItem(storageKey) ?? "" : "";
    if (token) headers["x-quiz-token"] = token;
    if (screen) headers["x-quiz-view"] = "screen";
    void fetch(`/api/live-quiz/${code}/image?question=${questionId}&option=${optionId}`, {
      cache: "no-store",
      headers,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { imageData?: string } | null) => {
        if (!cancel) setSrc(data?.imageData ?? null);
      });
    return () => {
      cancel = true;
    };
  }, [code, questionId, optionId, storageKey, screen]);

  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={className} />
  );
}

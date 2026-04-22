"use client";

const WORD_COLORS = [
  "text-violet-600", "text-sky-600", "text-emerald-600", "text-orange-500",
  "text-pink-600", "text-teal-600", "text-amber-600", "text-rose-600",
  "text-indigo-600", "text-cyan-600",
];

export type WordItem = { text: string; weight: number; count: number };

export function WordCloud({ words, maxHeight = 160 }: { words: WordItem[]; maxHeight?: number }) {
  if (words.length === 0) return null;
  return (
    <div
      className="flex flex-wrap gap-2 items-center justify-center overflow-hidden py-2"
      style={{ maxHeight }}
    >
      {words.map((w, i) => {
        const size = 0.65 + w.weight * 1.1;
        const opacity = 0.45 + w.weight * 0.55;
        return (
          <span
            key={w.text}
            className={`${WORD_COLORS[i % WORD_COLORS.length]} font-semibold select-none`}
            style={{ fontSize: `${size}rem`, opacity }}
            title={`${w.count}회 등장`}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
}

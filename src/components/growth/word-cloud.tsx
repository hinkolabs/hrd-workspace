"use client";

export type WordItem = { text: string; weight: number; count: number };

const COLORS = [
  "#006E63", "#008A7E", "#00A89C", "#3DAD9E",
  "#C83010", "#D94B2B", "#E86040",
  "#004F47", "#007A70",
];

export function WordCloud({ words }: { words: WordItem[] }) {
  if (!words.length) return null;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2 items-center justify-center py-2 leading-tight">
      {words.map((w, i) => {
        // weight 0~1 → fontSize 0.75rem ~ 2.4rem
        const size = 0.75 + w.weight * 1.65;
        const color = COLORS[i % COLORS.length];
        return (
          <span
            key={w.text}
            title={`${w.count}회`}
            className="font-bold select-none transition-opacity hover:opacity-70"
            style={{ fontSize: `${size}rem`, color, lineHeight: 1.2 }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
}

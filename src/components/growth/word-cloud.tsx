"use client";

export type WordItem = { text: string; weight: number; count: number };

export function WordCloud({ words, compact = false }: { words: WordItem[]; compact?: boolean }) {
  if (!words.length) return null;

  const sorted = [...words].sort((a, b) => b.count - a.count);
  const maxCount = sorted[0]?.count ?? 1;
  const limit = compact ? 10 : 16;
  const shown = sorted.slice(0, limit);
  const overflow = sorted.length - shown.length;

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {shown.map((w, i) => {
        const pct = Math.max(8, Math.round((w.count / maxCount) * 100));
        const isTop3 = i < 3;

        return (
          <div key={w.text} className="flex items-center gap-2.5 group">
            <span
              className={`shrink-0 text-right truncate ${
                isTop3
                  ? "w-[4.5rem] text-xs font-bold text-gray-800"
                  : "w-[4.5rem] text-xs font-medium text-gray-600"
              }`}
              title={w.text}
            >
              {w.text}
            </span>
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isTop3 ? "bg-hana-primary" : "bg-hana-secondary/70"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-400 tabular-nums w-5 text-right shrink-0">
              {w.count}
            </span>
          </div>
        );
      })}
      {overflow > 0 && (
        <p className="text-xs text-gray-400 text-center pt-1">외 {overflow}개 키워드</p>
      )}
    </div>
  );
}

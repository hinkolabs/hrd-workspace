import type { AnswerSpread } from "@/lib/live-quiz";

function percent(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((count * 100) / total);
}

export function AnswerSpreadPanel({ spread, size = "phone" }: { spread: AnswerSpread; size?: "phone" | "screen" | "admin" }) {
  const rate = percent(spread.correct, spread.total);
  const screen = size === "screen";
  const admin = size === "admin";
  const wrong = spread.buckets.some((bucket) => !bucket.correct && bucket.label !== "무응답" && bucket.count > 0);
  return (
    <section className={admin ? "mt-4" : screen ? "mt-8" : "mt-6"}>
      <p className={screen ? "text-3xl font-black" : admin ? "text-sm font-semibold text-gray-800" : "text-center text-2xl font-black"}>
        전체 정답률 {rate}%
      </p>
      <p className={screen ? "mt-2 text-2xl text-white/70" : admin ? "mt-1 text-xs text-gray-500" : "mt-1 text-center text-base text-gray-500"}>
        {spread.correct}명 / {spread.total}명
        {spread.missed > 0 ? ` · 무응답 ${spread.missed}명` : ""}
      </p>
      <ul className={screen ? "mt-6 space-y-3" : "mt-4 space-y-2"}>
        {spread.buckets.map((bucket, index) => (
          <li key={`${index}-${bucket.label}`}>
            <div className={`flex items-baseline justify-between gap-3 ${screen ? "text-2xl" : admin ? "text-sm" : "text-base"}`}>
              <span className={bucket.correct ? (screen ? "font-black text-emerald-300" : "font-semibold text-emerald-700") : screen ? "text-white" : "text-gray-800"}>
                {bucket.correct ? "정답 · " : ""}
                {bucket.label}
              </span>
              <span className={`shrink-0 tabular-nums ${screen ? "text-white/80" : "text-gray-500"}`}>
                {bucket.count}명 · {percent(bucket.count, spread.total)}%
              </span>
            </div>
            <div className={`mt-1 overflow-hidden rounded-full ${screen ? "h-4 bg-white/10" : "h-2.5 bg-gray-100"}`}>
              <div
                className={`h-full rounded-full ${bucket.correct ? "bg-emerald-500" : bucket.label === "무응답" ? "bg-gray-400" : "bg-rose-500"}`}
                style={{ width: `${percent(bucket.count, spread.total)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {!wrong && spread.missed === 0 && (
        <p className={screen ? "mt-4 text-2xl text-emerald-300" : admin ? "mt-3 text-sm text-emerald-700" : "mt-3 text-center text-base text-emerald-700"}>오답이 없습니다</p>
      )}
    </section>
  );
}

import { COLORS, TW } from "@/lib/deck/design-tokens";

interface Props {
  quote: string;
  source?: string;
  context?: string;
}

export function QuoteSlide({ quote, source, context }: Props) {
  return (
    <div className={TW.slide} style={{ backgroundColor: COLORS.bg }}>
      {/* Top accent bar */}
      <div className="w-full h-[5px]" style={{ backgroundColor: COLORS.primary }} />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-[120px] gap-7 pt-[5px]">
        {/* Large quote mark */}
        <div
          className="font-serif leading-none select-none"
          style={{
            fontSize: 160,
            color: COLORS.primary,
            opacity: 0.22,
            marginBottom: -64,
            alignSelf: "flex-start",
            lineHeight: 1,
          }}
        >
          &ldquo;
        </div>

        <p
          className="text-center"
          style={{
            fontSize: 38,
            fontWeight: 700,
            lineHeight: 1.4,
            color: COLORS.ink,
            maxWidth: 1000,
            letterSpacing: "-0.01em",
          }}
        >
          {quote}
        </p>

        {(source || context) && (
          <div className="flex flex-col items-center gap-2 mt-4">
            {source && (
              <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary }}>
                — {source}
              </span>
            )}
            {context && (
              <span style={{ fontSize: 15, color: COLORS.muted }}>
                {context}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[5px]"
        style={{ backgroundColor: COLORS.primary }}
      />
    </div>
  );
}

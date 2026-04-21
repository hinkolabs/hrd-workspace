import { COLORS, TW } from "@/lib/deck/design-tokens";

interface Props {
  sectionNumber: number;
  title: string;
  subtitle?: string;
}

export function SectionDividerSlide({ sectionNumber, title, subtitle }: Props) {
  const romanNumerals = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ"];
  const roman = romanNumerals[sectionNumber - 1] ?? String(sectionNumber);

  return (
    <div className={TW.slide} style={{ backgroundColor: COLORS.dark }}>
      {/* Large translucent numeral */}
      <div
        className="absolute right-[64px] bottom-[24px] font-bold leading-none select-none"
        style={{
          fontSize: 340,
          color: COLORS.white,
          opacity: 0.08,
          fontFamily: "serif",
        }}
      >
        {roman}
      </div>

      {/* Left accent */}
      <div
        className="absolute left-0 top-[25%] w-[6px]"
        style={{ height: "50%", backgroundColor: COLORS.secondary }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-center px-[72px]">
        <span
          className="font-semibold uppercase mb-7"
          style={{ color: COLORS.secondary, fontSize: 20, letterSpacing: "0.3em" }}
        >
          Section {roman}
        </span>
        <h2
          className="text-white"
          style={{
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            maxWidth: 960,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="text-white/70 mt-7"
            style={{ maxWidth: 760, fontSize: 22, lineHeight: 1.5, fontWeight: 400 }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

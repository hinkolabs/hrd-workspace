import { COLORS, TW } from "@/lib/deck/design-tokens";

interface Props {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
}

export function TitleSlide({ title, subtitle, author, date }: Props) {
  return (
    <div className={TW.slide} style={{ backgroundColor: COLORS.primary }}>
      {/* Background decoration circles */}
      <div
        className="absolute rounded-full opacity-10"
        style={{ width: 520, height: 520, top: -200, right: -120, backgroundColor: COLORS.white }}
      />
      <div
        className="absolute rounded-full opacity-10"
        style={{ width: 260, height: 260, bottom: -100, left: -80, backgroundColor: COLORS.white }}
      />
      <div
        className="absolute rounded-full opacity-30"
        style={{ width: 90, height: 90, top: 230, right: 160, backgroundColor: COLORS.secondary }}
      />

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-[56px] w-[5px] rounded-r-sm"
        style={{ height: 450, backgroundColor: COLORS.secondary }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-center px-[72px]">
        {subtitle && (
          <p
            className="text-white/75 font-semibold uppercase mb-8"
            style={{ fontSize: 18, letterSpacing: "0.28em" }}
          >
            {subtitle}
          </p>
        )}
        <h1
          className="text-white"
          style={{
            fontSize: 80,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            maxWidth: 960,
            whiteSpace: "pre-line",
            marginBottom: 24,
          }}
        >
          {title}
        </h1>
        {/* Bottom meta line */}
        {(author || date) && (
          <div
            className="flex items-center gap-5 mt-10 pt-7"
            style={{ borderTop: `1px solid rgba(255,255,255,0.3)`, maxWidth: 640 }}
          >
            {author && (
              <span className="text-white/90" style={{ fontSize: 17, fontWeight: 600 }}>{author}</span>
            )}
            {author && date && (
              <span className="text-white/40" style={{ fontSize: 15 }}>|</span>
            )}
            {date && (
              <span className="text-white/85" style={{ fontSize: 17 }}>{date}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

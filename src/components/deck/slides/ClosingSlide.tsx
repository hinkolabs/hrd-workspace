import { COLORS, TW } from "@/lib/deck/design-tokens";

interface Props {
  message?: string;
  contact?: string;
  author?: string;
}

export function ClosingSlide({ message, contact, author }: Props) {
  const displayMessage = message ?? "감사합니다";

  return (
    <div className={TW.slide} style={{ backgroundColor: COLORS.primary }}>
      {/* Decoration */}
      <div
        className="absolute rounded-full opacity-10"
        style={{ width: 480, height: 480, top: -180, right: -100, backgroundColor: COLORS.white }}
      />
      <div
        className="absolute rounded-full opacity-10"
        style={{ width: 220, height: 220, bottom: -80, left: -60, backgroundColor: COLORS.white }}
      />

      {/* Horizontal accent line */}
      <div
        className="absolute w-full h-[4px]"
        style={{ top: "50%", backgroundColor: COLORS.white, opacity: 0.12 }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-[80px]">
        <h2
          className="text-white text-center"
          style={{
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {displayMessage}
        </h2>

        {(contact || author) && (
          <div
            className="flex items-center gap-8 px-10 py-5 rounded-2xl"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            {author && (
              <span className="text-white" style={{ fontSize: 18, fontWeight: 600 }}>{author}</span>
            )}
            {author && contact && (
              <div style={{ width: 1, height: 20, backgroundColor: "rgba(255,255,255,0.4)" }} />
            )}
            {contact && (
              <span className="text-white/90" style={{ fontSize: 17 }}>{contact}</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[5px]"
        style={{ backgroundColor: COLORS.secondary }}
      />
    </div>
  );
}

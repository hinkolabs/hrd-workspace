import { COLORS, TW } from "@/lib/deck/design-tokens";
import { SlideShell } from "./SlideShell";
import { DynamicIcon } from "../DynamicIcon";
import type { BulletItem } from "@/lib/deck/types";

interface Props {
  heading: string;
  bullets: BulletItem[];
  imageQuery?: string;
  imageSide?: "left" | "right";
}

/** Placeholder illustration using brand-colored abstract shapes */
function AbstractIllustration() {
  return (
    <svg viewBox="0 0 320 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="320" height="400" fill={COLORS.surface} />
      <circle cx="260" cy="60" r="120" fill={COLORS.primary} opacity="0.12" />
      <circle cx="60" cy="340" r="80" fill={COLORS.secondary} opacity="0.15" />
      <rect x="80" y="100" width="160" height="200" rx="16" fill={COLORS.primary} opacity="0.08" />
      <rect x="108" y="128" width="104" height="12" rx="6" fill={COLORS.primary} opacity="0.3" />
      <rect x="108" y="152" width="80" height="8" rx="4" fill={COLORS.muted} opacity="0.3" />
      <rect x="108" y="168" width="90" height="8" rx="4" fill={COLORS.muted} opacity="0.25" />
      <rect x="108" y="200" width="48" height="48" rx="8" fill={COLORS.primary} opacity="0.2" />
      <rect x="164" y="200" width="48" height="48" rx="8" fill={COLORS.secondary} opacity="0.2" />
      <circle cx="132" cy="224" r="12" fill={COLORS.primary} opacity="0.35" />
      <circle cx="188" cy="224" r="12" fill={COLORS.secondary} opacity="0.35" />
    </svg>
  );
}

export function ImageSplitSlide({ heading, bullets, imageSide = "right" }: Props) {
  const textCol = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
      {bullets.map((b, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 18,
            borderRadius: 14,
            padding: "0 22px",
            backgroundColor: COLORS.surface,
            minHeight: 0,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 48, height: 48,
              borderRadius: "50%",
              backgroundColor: COLORS.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DynamicIcon name={b.icon} size={22} color={COLORS.white} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, padding: "14px 0" }}>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 700, color: COLORS.ink, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
              {b.text}
            </p>
            {b.sub && (
              <p style={{ margin: 0, fontSize: 14, color: COLORS.muted, lineHeight: 1.4 }}>
                {b.sub}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const imageCol = (
    <div style={{ width: 440, flexShrink: 0, borderRadius: 20, overflow: "hidden" }}>
      <AbstractIllustration />
    </div>
  );

  return (
    <SlideShell heading={heading}>
      <div style={{ flex: 1, display: "flex", gap: 24, alignItems: "stretch", minHeight: 0 }}>
        {imageSide === "left" ? <>{imageCol}{textCol}</> : <>{textCol}{imageCol}</>}
      </div>
    </SlideShell>
  );
}

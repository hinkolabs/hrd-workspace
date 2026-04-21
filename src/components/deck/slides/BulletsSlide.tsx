import { COLORS } from "@/lib/deck/design-tokens";
import { SlideShell } from "./SlideShell";
import { DynamicIcon } from "../DynamicIcon";

export interface BulletItem {
  icon: string;
  text: string;
  sub?: string;
}

interface Props {
  heading: string;
  bullets: BulletItem[];
  emphasis?: string;
}

export function BulletsSlide({ heading, bullets, emphasis }: Props) {
  return (
    <SlideShell heading={heading}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: emphasis ? 12 : 14,
            minHeight: 0,
          }}
        >
          {bullets.map((b, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 24,
                borderRadius: 16,
                padding: "0 28px",
                backgroundColor: COLORS.surface,
                minHeight: 0,
              }}
            >
              {/* Icon circle — bigger */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: COLORS.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <DynamicIcon name={b.icon} size={26} color={COLORS.white} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: "16px 0" }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.ink, lineHeight: 1.35, letterSpacing: "-0.01em" }}>
                  {b.text}
                </p>
                {b.sub && (
                  <p style={{ margin: 0, fontSize: 15, color: COLORS.muted, lineHeight: 1.45 }}>
                    {b.sub}
                  </p>
                )}
              </div>

              <div
                style={{
                  width: 10, height: 10,
                  borderRadius: "50%",
                  backgroundColor: COLORS.primary,
                  opacity: 0.35,
                  flexShrink: 0,
                }}
              />
            </div>
          ))}
        </div>

        {emphasis && (
          <div
            style={{
              flexShrink: 0,
              borderRadius: 12,
              padding: "16px 24px",
              marginTop: 12,
              backgroundColor: COLORS.primary + "18",
              borderLeft: `5px solid ${COLORS.primary}`,
            }}
          >
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, fontStyle: "italic", color: COLORS.primary, lineHeight: 1.4 }}>
              {emphasis}
            </p>
          </div>
        )}
      </div>
    </SlideShell>
  );
}

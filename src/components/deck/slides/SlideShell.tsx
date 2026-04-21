/**
 * SlideShell — wrapper for all content slides.
 *
 * Uses absolute positioning for the body so children can use flex: 1 to
 * reliably fill the remaining 645px without relying on flex propagation.
 *
 * Slide height breakdown (720px total):
 *   0   – 72px  : title bar
 *   72  – 75px  : accent stripe
 *   75  – 720px : body (645px, available for content)
 */
import { COLORS, TW } from "@/lib/deck/design-tokens";

interface Props {
  heading: string;
  children: React.ReactNode;
  barColor?: string;
  stripeColor?: string;
}

const TITLE_H = 88;
const STRIPE_H = 4;
const BODY_TOP = TITLE_H + STRIPE_H; // 92px
const PAD_X = 56; // horizontal padding
const PAD_Y = 36; // vertical padding inside body

export function SlideShell({ heading, children, barColor, stripeColor }: Props) {
  const bar = barColor ?? COLORS.primary;
  const stripe = stripeColor ?? COLORS.secondary;

  return (
    <div
      className={TW.slide}
      style={{ position: "relative", width: 1280, height: 720 }}
    >
      {/* ── Title bar ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: TITLE_H,
          backgroundColor: bar,
          display: "flex",
          alignItems: "center",
          paddingLeft: PAD_X,
          paddingRight: PAD_X,
        }}
      >
        <div
          style={{
            width: 8,
            height: 44,
            borderRadius: 2,
            marginRight: 20,
            backgroundColor: stripe,
            flexShrink: 0,
          }}
        />
        <span style={{ color: "#fff", fontSize: 30, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
          {heading}
        </span>
      </div>

      {/* ── Accent stripe ── */}
      <div
        style={{
          position: "absolute",
          top: TITLE_H,
          left: 0,
          right: 0,
          height: STRIPE_H,
          backgroundColor: stripe,
        }}
      />

      {/* ── Body — explicit top/bottom so height = 720 - 75 = 645px ── */}
      <div
        style={{
          position: "absolute",
          top: BODY_TOP,
          left: 0,
          right: 0,
          bottom: 0,
          padding: `${PAD_Y}px ${PAD_X}px`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

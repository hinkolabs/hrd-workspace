import { COLORS } from "@/lib/deck/design-tokens";
import { SlideShell } from "./SlideShell";

export interface ComparisonSide {
  label: string;
  points: string[];
  emphasis?: string;
}

interface Props {
  heading: string;
  left: ComparisonSide;
  right: ComparisonSide;
}

function Column({ side, color }: { side: ComparisonSide; color: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRadius: 20, overflow: "hidden", minHeight: 0 }}>
      <div
        style={{
          padding: "18px 32px",
          backgroundColor: color,
          color: "#fff",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          flexShrink: 0,
        }}
      >
        {side.label}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "24px 32px",
          gap: 0,
          backgroundColor: color + "12",
          minHeight: 0,
        }}
      >
        {side.points.map((p, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "6px 0",
              borderBottom: i < side.points.length - 1 ? `1px solid ${color}18` : "none",
              minHeight: 0,
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: color,
              }}
            />
            <p style={{ margin: 0, fontSize: 17, color: COLORS.ink, lineHeight: 1.45, fontWeight: 500 }}>
              {p}
            </p>
          </div>
        ))}
        {side.emphasis && (
          <div
            style={{
              flexShrink: 0,
              marginTop: 12,
              padding: "12px 18px",
              borderRadius: 10,
              backgroundColor: color + "22",
              color,
              fontSize: 15,
              fontWeight: 700,
              fontStyle: "italic",
              lineHeight: 1.4,
            }}
          >
            {side.emphasis}
          </div>
        )}
      </div>
    </div>
  );
}

export function ComparisonSlide({ heading, left, right }: Props) {
  return (
    <SlideShell heading={heading}>
      <div style={{ flex: 1, display: "flex", gap: 20, minHeight: 0 }}>
        <Column side={left} color={COLORS.muted} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: "0 4px" }}>
          <div style={{ flex: 1, width: 1, backgroundColor: COLORS.border }} />
          <div
            style={{
              width: 44, height: 44,
              borderRadius: "50%",
              backgroundColor: COLORS.primary,
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              margin: "10px 0",
              letterSpacing: "0.02em",
            }}
          >
            VS
          </div>
          <div style={{ flex: 1, width: 1, backgroundColor: COLORS.border }} />
        </div>
        <Column side={right} color={COLORS.primary} />
      </div>
    </SlideShell>
  );
}

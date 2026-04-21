import { COLORS } from "@/lib/deck/design-tokens";
import { SlideShell } from "./SlideShell";
import { DynamicIcon } from "../DynamicIcon";

export interface StatItem {
  value: string;
  label: string;
  delta?: string;
  icon?: string;
}

interface Props {
  heading: string;
  stats: StatItem[];
  emphasis?: string;
}

const CARD_COLORS = [COLORS.primary, COLORS.secondary, COLORS.dark, COLORS.accent];

export function StatsSlide({ heading, stats, emphasis }: Props) {
  const cols = stats.length <= 2 ? stats.length : stats.length <= 4 ? 2 : 3;

  return (
    <SlideShell heading={heading}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridAutoRows: "1fr",
            gap: 16,
            minHeight: 0,
          }}
        >
          {stats.map((s, i) => {
            const color = CARD_COLORS[i % CARD_COLORS.length];
            return (
              <div
                key={i}
                style={{
                  borderRadius: 20,
                  padding: "28px 32px",
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: COLORS.surface,
                  minHeight: 0,
                }}
              >
                {/* Top: icon + delta */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
                  {s.icon ? (
                    <div
                      style={{
                        width: 52, height: 52,
                        borderRadius: "50%",
                        backgroundColor: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <DynamicIcon name={s.icon} size={26} color={COLORS.white} />
                    </div>
                  ) : (
                    <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: color, marginTop: 6 }} />
                  )}
                  {s.delta && (
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        padding: "6px 14px",
                        borderRadius: 99,
                        backgroundColor: color + "22",
                        color,
                      }}
                    >
                      {s.delta}
                    </span>
                  )}
                </div>

                {/* Big value */}
                <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      color,
                      fontWeight: 800,
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                      fontSize: s.value.length > 6 ? 44 : 64,
                    }}
                  >
                    {s.value}
                  </span>
                </div>

                {/* Label */}
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: COLORS.muted,
                    marginTop: 10,
                    lineHeight: 1.3,
                    flexShrink: 0,
                  }}
                >
                  {s.label}
                </span>

                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    marginTop: 16,
                    backgroundColor: color,
                    opacity: 0.3,
                    flexShrink: 0,
                  }}
                />
              </div>
            );
          })}
        </div>

        {emphasis && (
          <div
            style={{
              flexShrink: 0,
              borderRadius: 12,
              padding: "16px 24px",
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

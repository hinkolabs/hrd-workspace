import { COLORS } from "@/lib/deck/design-tokens";
import { SlideShell } from "./SlideShell";
import { DynamicIcon } from "../DynamicIcon";

export interface ProcessStep {
  number: number;
  title: string;
  description: string;
  icon?: string;
}

interface Props {
  heading: string;
  steps: ProcessStep[];
  emphasis?: string;
}

const STEP_COLORS = [COLORS.primary, COLORS.secondary, COLORS.dark, COLORS.accent, COLORS.primary];

export function ProcessSlide({ heading, steps, emphasis }: Props) {
  return (
    <SlideShell heading={heading}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "stretch",
            gap: 0,
            minHeight: 0,
          }}
        >
          {steps.map((step, i) => {
            const color = STEP_COLORS[i % STEP_COLORS.length];
            const isLast = i === steps.length - 1;

            return (
              <div
                key={i}
                style={{ flex: 1, display: "flex", alignItems: "stretch" }}
              >
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 16,
                    padding: "28px 28px",
                    backgroundColor: COLORS.surface,
                    minHeight: 0,
                  }}
                >
                  {/* Top color bar */}
                  <div
                    style={{
                      height: 5,
                      borderRadius: 2,
                      backgroundColor: color,
                      marginBottom: 22,
                      flexShrink: 0,
                    }}
                  />

                  {/* Number + icon */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexShrink: 0 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        backgroundColor: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 19,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {step.number}
                    </div>
                    {step.icon && (
                      <DynamicIcon name={step.icon} size={28} color={color} />
                    )}
                  </div>

                  {/* Title */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: 21,
                      fontWeight: 700,
                      color: COLORS.ink,
                      lineHeight: 1.3,
                      marginBottom: 14,
                      letterSpacing: "-0.01em",
                      flexShrink: 0,
                    }}
                  >
                    {step.title}
                  </p>

                  {/* Description */}
                  {step.description && (
                    <p
                      style={{
                        margin: 0,
                        flex: 1,
                        fontSize: 16,
                        color: COLORS.muted,
                        lineHeight: 1.55,
                        overflow: "hidden",
                      }}
                    >
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Arrow connector */}
                {!isLast && (
                  <div
                    style={{
                      width: 36,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M4 10h12M12 6l4 4-4 4"
                        stroke={COLORS.primary}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
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

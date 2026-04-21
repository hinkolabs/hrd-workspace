import { COLORS } from "@/lib/deck/design-tokens";
import { SlideShell } from "./SlideShell";

interface AgendaItem {
  number: number;
  title: string;
  desc?: string;
}

interface Props {
  heading: string;
  items: AgendaItem[];
}

export function AgendaSlide({ heading, items }: Props) {
  const cols = items.length > 5 ? 2 : 1;

  return (
    <SlideShell heading={heading}>
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr",
          gridAutoRows: "1fr",
          gap: 14,
          minHeight: 0,
        }}
      >
        {items.map((item) => (
          <div
            key={item.number}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              borderRadius: 16,
              padding: "0 28px",
              backgroundColor: COLORS.surface,
              minHeight: 0,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 60,
                height: 60,
                borderRadius: "50%",
                backgroundColor: COLORS.primary,
                color: "#fff",
                fontSize: 24,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.number}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "16px 0" }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: COLORS.ink, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                {item.title}
              </span>
              {item.desc && (
                <span style={{ fontSize: 16, color: COLORS.muted, lineHeight: 1.4 }}>
                  {item.desc}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

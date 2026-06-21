import Image from "next/image";

const LOGO_SRC = "/hana-securities-logo.png";
/** 심볼+워드마크 가로 비율 (하나증권 공식 로고) */
const LOGO_ASPECT = 4.6;

type HanaLogoProps = {
  variant?: "full" | "mark";
  className?: string;
  height?: number;
};

export function HanaLogo({ variant = "full", className = "", height = 28 }: HanaLogoProps) {
  const fullWidth = Math.round(height * LOGO_ASPECT);

  if (variant === "mark") {
    const markSize = Math.round(height * 1.1);
    return (
      <div
        className={`relative overflow-hidden shrink-0 ${className}`}
        style={{ width: markSize, height: markSize }}
      >
        <Image
          src={LOGO_SRC}
          alt="하나증권"
          width={fullWidth}
          height={height}
          className="absolute left-0 top-1/2 -translate-y-1/2 max-w-none"
          style={{ height: markSize, width: "auto" }}
          priority
        />
      </div>
    );
  }

  return (
    <Image
      src={LOGO_SRC}
      alt="하나증권"
      width={fullWidth}
      height={height}
      className={`object-contain object-left ${className}`}
      priority
    />
  );
}

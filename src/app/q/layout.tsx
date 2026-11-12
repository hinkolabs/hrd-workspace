import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f9fafb",
};

export default function LiveQuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}

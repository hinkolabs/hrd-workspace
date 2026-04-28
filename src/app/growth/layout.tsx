"use client";

import { usePathname } from "next/navigation";

export default function GrowthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname === "/growth/chat";

  return (
    <div className="h-full flex flex-col">
      {/* Content */}
      <div className={`flex-1 ${isChatPage ? "overflow-hidden" : "overflow-auto"}`}>
        {children}
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GrowthPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/growth/mandalart");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

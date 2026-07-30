"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/app-shell";

export default function MandalartMyPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      router.replace(`/growth/mandalart/${user.id}`);
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-hana-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

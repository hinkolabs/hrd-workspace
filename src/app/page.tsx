"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/app-shell";
import MemoBoard from "@/components/dashboard/memo-board";
import RightPanel from "@/components/dashboard/right-panel";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/growth/lounge");
    }
  }, [user, loading, router]);

  // member 역할은 리다이렉트 처리, 로딩 중에는 스피너
  if (loading || (user && user.role !== "admin")) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-0.5">인재개발실 작업실</p>
      </div>

      <div className="flex-1 overflow-auto lg:overflow-hidden p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:min-h-0">
        {/* 왼쪽: 메모 보드 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm flex flex-col min-h-[300px] lg:min-h-0 lg:overflow-hidden">
          <MemoBoard />
        </div>

        {/* 오른쪽: 할일 + 캘린더 (리사이즈 가능) */}
        <div className="flex flex-col min-h-[680px] lg:min-h-0 lg:overflow-hidden">
          <RightPanel />
        </div>
      </div>
    </div>
  );
}

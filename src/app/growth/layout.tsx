"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Grid3x3, User, MessageCircle, ChevronRight, ShieldAlert } from "lucide-react";
import { useCohort } from "@/lib/use-cohort";
import { useGrowthRole } from "@/lib/use-growth-role";

const tabs = [
  { href: "/growth", label: "피드", icon: BookOpen, exact: true },
  { href: "/growth/mandalart", label: "만다라트", icon: Grid3x3 },
  { href: "/growth/chat", label: "팀 채팅", icon: MessageCircle },
  { href: "/growth/me", label: "내 공간", icon: User },
];

export default function GrowthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeCohort, loading: cohortLoading } = useCohort();
  const { isMember, isAdmin, loading: roleLoading } = useGrowthRole(activeCohort?.id);

  const isSubPage =
    pathname.startsWith("/growth/journal/") ||
    pathname.startsWith("/growth/mandalart/") ||
    pathname === "/growth/me/mentor" ||
    pathname.startsWith("/growth/retro/") ||
    pathname === "/growth/portfolio";

  const isChatPage = pathname === "/growth/chat";

  // While loading, show spinner
  if (cohortLoading || roleLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not a cohort member → show access denied
  if (activeCohort && !isMember) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
          <ShieldAlert size={28} className="text-amber-500" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-1">접근 권한이 없습니다</h2>
          <p className="text-sm text-gray-500">
            이 공간은 <strong>{activeCohort.name}</strong> 기수 멤버와 담당 멘토만 이용할 수 있습니다.
          </p>
          <p className="text-xs text-gray-400 mt-1">인재개발실 담당자에게 기수 등록을 요청하세요.</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <span>HRD</span>
          <ChevronRight size={12} />
          <span className="text-gray-600 font-medium">신입 성장 커뮤니티</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">2026 신입 성장 커뮤니티</h1>
            <p className="text-xs text-gray-500 mt-0.5">1년간의 성장을 함께 기록하세요</p>
          </div>
          {/* Role badge */}
          {activeCohort && (
            <RoleBadge isAdmin={isAdmin} />
          )}
        </div>
      </div>

      {/* Tab navigation */}
      {!isSubPage && (
        <div className="bg-white border-b border-gray-200 shrink-0">
          <div className="flex px-4 sm:px-6 gap-1">
            {tabs.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
            {/* Admin-only tab */}
            {isAdmin && (
              <Link
                href="/admin/growth"
                className="flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-colors ml-auto"
              >
                관리
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 ${isChatPage ? "overflow-hidden" : "overflow-auto"} pb-16 md:pb-0`}>
        {children}
      </div>

      {/* Mobile bottom tab bar */}
      {!isSubPage && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex">
          {tabs.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                  active ? "text-indigo-600" : "text-gray-400"
                }`}
              >
                <Icon size={18} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) {
    return (
      <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200">
        멘토 / 관리자
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
      신입사원
    </span>
  );
}

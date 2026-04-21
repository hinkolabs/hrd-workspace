"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Grid3x3, User, MessageCircle } from "lucide-react";
import { useCohort } from "@/lib/use-cohort";
import { useAuth } from "@/components/layout/app-shell";

const tabs = [
  { href: "/growth", label: "피드", icon: BookOpen, exact: true },
  { href: "/growth/mandalart", label: "만다라트", icon: Grid3x3 },
  { href: "/growth/chat", label: "팀 채팅", icon: MessageCircle },
  { href: "/growth/me", label: "내 공간", icon: User },
];

export default function GrowthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { loading: cohortLoading } = useCohort();

  const isSubPage =
    pathname.startsWith("/growth/journal/") ||
    pathname.startsWith("/growth/mandalart/") ||
    pathname === "/growth/me/mentor" ||
    pathname.startsWith("/growth/retro/") ||
    pathname === "/growth/portfolio";

  const isChatPage = pathname === "/growth/chat";

  // Still initializing cohort (auto-create in progress)
  if (cohortLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">신입 성장 커뮤니티</h1>
            <p className="text-xs text-gray-500 mt-0.5">1년간의 성장을 함께 기록하세요</p>
          </div>
          {user?.role === "admin" && (
            <Link
              href="/admin/growth"
              className="text-[11px] font-semibold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full border border-violet-200 hover:bg-violet-200 transition-colors"
            >
              관리
            </Link>
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

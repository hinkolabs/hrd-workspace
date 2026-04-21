"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Palette,
  Menu,
  X,
  MessageSquare,
  FileSpreadsheet,
  FileText,
  Brain,
  ClipboardList,
  Users,
  LogOut,
  Settings,
  History,
  Target,
  GraduationCap,
  BookOpen,
  Megaphone,
  Presentation,
  SlidersHorizontal,
  Sprout,
  BarChart2,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "./app-shell";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
};

type NavSection = {
  title: string | null;
  adminOnly?: boolean;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: null,
    adminOnly: true,
    items: [
      { href: "/", label: "대시보드", icon: LayoutDashboard },
    ],
  },
  {
    title: "소통",
    adminOnly: true,
    items: [
      { href: "/chat", label: "HRD 팀 채팅", icon: MessageSquare },
    ],
  },
  {
    title: "AI 도구",
    adminOnly: true,
    items: [
      { href: "/tools/estimate", label: "견적", icon: FileSpreadsheet },
      { href: "/tools/hwp-convert", label: "문서 분석", icon: FileText },
      { href: "/tools/report", label: "업무 보고서", icon: ClipboardList },
      { href: "/tools/knowledge", label: "지식 베이스", icon: Brain },
      { href: "/tools/ice", label: "ICE 우선순위 채점", icon: Target },
      { href: "/tools/training", label: "Alli Works 실습 가이드", icon: GraduationCap },
      { href: "/tools/alli-guide", label: "Alli 가이드 챗봇", icon: BookOpen },
      { href: "/tools/curriculum", label: "교육 강의안", icon: Presentation },
      { href: "/tools/ppt", label: "AI PPT 생성 (구)", icon: SlidersHorizontal },
      { href: "/tools/deck", label: "슬라이드 덱 ✦", icon: Presentation },
    ],
  },
  {
    title: "신입 성장 커뮤니티",
    items: [
      { href: "/growth", label: "성장 피드", icon: Sprout },
      { href: "/growth/chat", label: "신입 팀 채팅", icon: MessageSquare },
      { href: "/admin/growth", label: "커뮤니티 관리", icon: BarChart2, adminOnly: true },
    ],
  },
  {
    title: "홍보",
    adminOnly: true,
    items: [
      { href: "/tools/promo", label: "홍보 캠페인", icon: Megaphone },
    ],
  },
  {
    title: "관리",
    adminOnly: true,
    items: [
      { href: "/admin", label: "사용자 관리", icon: Users },
      { href: "/admin/history", label: "활동 히스토리", icon: History },
      { href: "/admin/settings", label: "설정", icon: Settings },
    ],
  },
  {
    title: "기타",
    adminOnly: true,
    items: [
      { href: "/ui-editor", label: "사이버학당 UI 편집기", icon: Palette },
    ],
  },
];

function NavLinks({ onLinkClick, isAdmin }: { onLinkClick?: () => void; isAdmin: boolean }) {
  const pathname = usePathname();

  const visibleSections = navSections
    .filter((section) => isAdmin || !section.adminOnly)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isAdmin || !item.adminOnly),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
      {visibleSections.map((section, si) => (
        <div key={si}>
          {section.title && (
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              {section.title}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onLinkClick}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserFooter({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="px-4 py-3 border-t border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
            {user.displayName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate">{user.displayName}</p>
            <p className="text-[10px] text-gray-500 truncate">{user.username}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors shrink-0"
          title="로그아웃"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname.startsWith("/clone") || pathname === "/login" || pathname.startsWith("/tools/ice/survey") || pathname.startsWith("/p/")) return null;

  const isAdmin = user?.role === "admin";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 bg-gray-900 text-white flex-col h-full">
        <div className="px-5 py-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center text-xs font-bold">
              H
            </div>
            <span className="font-semibold text-sm tracking-wide">
              HRD Workspace
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-1">인재개발실</p>
        </div>
        <NavLinks isAdmin={isAdmin} />
        <UserFooter onLogout={handleLogout} />
      </aside>

      {/* Mobile fixed top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-gray-900 text-white flex items-center px-4 gap-3 shadow-lg">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          aria-label="메뉴 열기"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center text-xs font-bold">
            H
          </div>
          <span className="font-semibold text-sm">HRD Workspace</span>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 z-50 w-72 h-full bg-gray-900 text-white flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center text-xs font-bold">
                  H
                </div>
                <span className="font-semibold text-sm tracking-wide">
                  HRD Workspace
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="메뉴 닫기"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks isAdmin={isAdmin} onLinkClick={() => setMobileOpen(false)} />
            <UserFooter onLogout={handleLogout} />
          </aside>
        </>
      )}
    </>
  );
}

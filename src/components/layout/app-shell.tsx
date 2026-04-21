"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import Sidebar from "./sidebar";

type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "member";
} | null;

const AuthContext = createContext<{
  user: AuthUser;
  loading: boolean;
  refresh: () => void;
}>({ user: null, loading: true, refresh: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isClonePage = pathname.startsWith("/clone");
  const isSurveyPage = pathname.startsWith("/tools/ice/survey");
  const isPromoPage = pathname.startsWith("/p/");
  const showShell = !isLoginPage && !isClonePage && !isSurveyPage && !isPromoPage;

  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoginPage && !isSurveyPage && !isPromoPage) {
      refresh();
    } else {
      setLoading(false);
    }
  }, [isLoginPage, isSurveyPage, isPromoPage, refresh]);

  if (!showShell) {
    return (
      <AuthContext.Provider value={{ user, loading, refresh }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      <div className="h-full flex">
        <Sidebar />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
      </div>
    </AuthContext.Provider>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff } from "lucide-react";

const SAVED_USERNAME_KEY = "hrd-saved-username";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [saveId, setSaveId] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_USERNAME_KEY);
    if (saved) {
      setUsername(saved);
      setSaveId(true);
    }

    fetch("/api/auth/me")
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          router.replace(data.user?.role === "member" ? "/growth" : "/");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, remember }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "로그인 실패");
        setLoading(false);
        return;
      }

      if (saveId) {
        localStorage.setItem(SAVED_USERNAME_KEY, username.trim());
      } else {
        localStorage.removeItem(SAVED_USERNAME_KEY);
      }

      // Route by role: member → /growth, admin → /
      router.replace(data.user?.role === "member" ? "/growth" : "/");
    } catch {
      setError("서버에 연결할 수 없습니다");
      setLoading(false);
    }
  }

  async function handleSetup() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "초기 설정 실패");
      } else {
        setSetupDone(true);
        setUsername("admin");
        setPassword("hrdhanaw1!");
      }
    } catch {
      setError("서버에 연결할 수 없습니다");
    }
    setLoading(false);
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white text-xl font-bold mb-4 shadow-lg">
            H
          </div>
          <h1 className="text-xl font-bold text-gray-900">HRD Workspace</h1>
          <p className="text-sm text-gray-500 mt-1">인재개발실 작업실</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {setupDone ? (
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">admin 계정이 생성되었습니다</p>
              <p className="text-xs text-gray-500 mt-1">아래 정보로 로그인하세요</p>
              <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
                아이디: <strong>admin</strong> / 비밀번호: <strong>hrdhanaw1!</strong>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">아이디</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">비밀번호</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveId}
                  onChange={(e) => setSaveId(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-500">아이디 저장</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-500">자동 로그인</span>
              </label>
            </div>

            {error && (
              <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {!setupDone && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <button
                onClick={() => setSetupMode(!setupMode)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {setupMode ? "취소" : "처음 사용하시나요?"}
              </button>
              {setupMode && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">관리자(admin) 계정을 생성합니다</p>
                  <button
                    onClick={handleSetup}
                    disabled={loading}
                    className="w-full py-2 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "생성 중..." : "초기 계정 만들기"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-6">HRD Workspace MVP v0.1</p>
      </div>
    </div>
  );
}

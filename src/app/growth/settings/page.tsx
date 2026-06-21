"use client";

import { useState } from "react";
import { useAuth } from "@/components/layout/app-shell";
import { KeyRound, Eye, EyeOff, CheckCircle2, Settings } from "lucide-react";

export default function GrowthSettingsPage() {
  const { user } = useAuth();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPw !== confirmPw) { setError("새 비밀번호가 일치하지 않습니다"); return; }
    if (newPw.length < 6) { setError("새 비밀번호는 6자 이상이어야 합니다"); return; }

    setSaving(true);
    const res = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } else {
      setError(data.error || "비밀번호 변경 실패");
    }
    setSaving(false);
  }

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Settings size={18} className="text-gray-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">설정</h1>
          <p className="text-xs text-gray-400">{user.displayName} · {user.username}</p>
        </div>
      </div>

      {/* 비밀번호 변경 카드 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <KeyRound size={15} className="text-indigo-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">비밀번호 변경</p>
            <p className="text-xs text-gray-400">현재 비밀번호를 확인 후 새로 설정합니다</p>
          </div>
        </div>

        <div className="px-5 py-5">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 size={40} className="text-green-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800">비밀번호가 변경되었습니다</p>
                <p className="text-xs text-gray-400 mt-1">다음 로그인 시 새 비밀번호를 사용하세요</p>
              </div>
              <button
                onClick={() => setSuccess(false)}
                className="mt-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                다시 변경하기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 현재 비밀번호 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">현재 비밀번호</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="현재 비밀번호 입력"
                    autoComplete="current-password"
                    className="w-full px-4 py-2.5 pr-11 text-sm border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/30 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* 새 비밀번호 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">새 비밀번호</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="6자 이상 입력"
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 pr-11 text-sm border border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/30 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* 새 비밀번호 확인 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">새 비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="새 비밀번호 재입력"
                  autoComplete="new-password"
                  className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
                    confirmPw && confirmPw !== newPw
                      ? "border-red-300 focus:border-red-400 focus:ring-red-300/30"
                      : "border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/30"
                  }`}
                />
                {confirmPw && confirmPw !== newPw && (
                  <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다</p>
                )}
              </div>

              {error && (
                <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !currentPw || !newPw || !confirmPw || newPw !== confirmPw}
                className="w-full py-3 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "변경 중..." : "비밀번호 변경"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

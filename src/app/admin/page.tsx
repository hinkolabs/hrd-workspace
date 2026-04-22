"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Check, X, RefreshCw, Eye, EyeOff, ShieldCheck, User2 } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";

type User = {
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
  role: "admin" | "member";
  created_at: string;
};

const DEFAULT_PW = "hrdhanaw1!";

const ROLE_LABELS: Record<"admin" | "member", string> = {
  admin: "관리자",
  member: "신입",
};

export default function AdminPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState(DEFAULT_PW);
  const [newRole, setNewRole] = useState<"admin" | "member">("member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [migrateResult, setMigrateResult] = useState<string[]>([]);
  const [migrating, setMigrating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ username: string; display_name: string; password: string; role: "admin" | "member" }>({
    username: "", display_name: "", password: "", role: "member",
  });
  const [showEditPw, setShowEditPw] = useState(false);

  const fetchUsers = useCallback(async () => {
    setFetchError("");
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      setUsers(await res.json());
    } else {
      const body = await res.json().catch(() => ({}));
      setFetchError(body.error || `사용자 목록 조회 실패 (${res.status})`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function runMigration() {
    setMigrating(true);
    setMigrateResult([]);
    try {
      const res = await fetch("/api/admin/migrate", { method: "POST" });
      const data = await res.json();
      setMigrateResult(data.results ?? [JSON.stringify(data)]);
      // 마이그레이션 후 자동으로 사용자 목록 새로고침
      await fetchUsers();
    } catch (e) {
      setMigrateResult([`오류: ${e}`]);
    }
    setMigrating(false);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim() || !newName.trim()) return;
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newUsername.trim(),
        display_name: newName.trim(),
        password: newPassword || DEFAULT_PW,
        role: newRole,
      }),
    });

    if (res.ok) {
      setNewUsername("");
      setNewName("");
      setNewPassword(DEFAULT_PW);
      setNewRole("member");
      setShowForm(false);
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error || "생성 실패");
    }
    setSaving(false);
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setEditFields({ username: user.username, display_name: user.display_name, password: "", role: user.role });
    setShowEditPw(false);
  }

  async function saveEdit(id: string) {
    const updates: Record<string, unknown> = {};
    const orig = users.find((u) => u.id === id);
    if (!orig) return;

    if (editFields.username !== orig.username) updates.username = editFields.username;
    if (editFields.display_name !== orig.display_name) updates.display_name = editFields.display_name;
    if (editFields.password) updates.password = editFields.password;
    // Prevent self-demotion
    if (editFields.role !== orig.role) {
      if (id === me?.id) {
        alert("자기 자신의 권한은 변경할 수 없습니다");
        return;
      }
      updates.role = editFields.role;
    }

    if (Object.keys(updates).length === 0) {
      setEditingId(null);
      return;
    }

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      setEditingId(null);
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || "수정 실패");
    }
  }

  async function toggleActive(user: User) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    fetchUsers();
  }

  async function deleteUser(user: User) {
    if (user.id === me?.id) {
      alert("자기 자신은 삭제할 수 없습니다");
      return;
    }
    if (!confirm(`"${user.display_name}" 계정을 삭제할까요?`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
    else {
      const data = await res.json();
      alert(data.error || "삭제 실패");
    }
  }

  async function resetPassword(user: User) {
    if (!confirm(`"${user.display_name}" 비밀번호를 초기화(${DEFAULT_PW})할까요?`)) return;
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: DEFAULT_PW }),
    });
    alert("비밀번호가 초기화되었습니다");
  }

  const adminCount = users.filter((u) => u.role === "admin").length;
  const memberCount = users.filter((u) => u.role === "member").length;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-lg font-bold text-gray-900">사용자 관리</h1>
        <p className="text-xs text-gray-500 mt-0.5">팀원 계정을 생성하고 관리합니다</p>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Stats row */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <ShieldCheck size={18} className="text-violet-500" />
            <div>
              <p className="text-[11px] text-violet-600 font-medium">관리자</p>
              <p className="text-lg font-bold text-violet-700">{adminCount}</p>
            </div>
          </div>
          <div className="flex-1 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <User2 size={18} className="text-indigo-500" />
            <div>
              <p className="text-[11px] text-indigo-600 font-medium">신입사원</p>
              <p className="text-lg font-bold text-indigo-700">{memberCount}</p>
            </div>
          </div>
        </div>

        {/* DB 마이그레이션 패널 */}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-amber-700 font-medium">DB role 컬럼 자동 설정</span>
            <button
              onClick={runMigration}
              disabled={migrating}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {migrating ? "실행 중..." : "마이그레이션 실행"}
            </button>
          </div>
          {migrateResult.length > 0 && (
            <ul className="mt-2 space-y-1">
              {migrateResult.map((r, i) => (
                <li key={i} className="text-amber-800 font-mono whitespace-pre-wrap">{r}</li>
              ))}
            </ul>
          )}
        </div>

        {fetchError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
            {fetchError}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700">
            전체 {users.length}명
          </span>
          <div className="flex gap-2">
            <button
              onClick={fetchUsers}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
            >
              <RefreshCw size={12} /> 새로고침
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Plus size={13} /> 계정 추가
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={createUser} className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">아이디 *</label>
                <input
                  autoFocus
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="영문 아이디"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">이름 (표시명) *</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">비밀번호</label>
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={DEFAULT_PW}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">권한</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "admin" | "member")}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none bg-white"
                >
                  <option value="member">신입사원</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !newUsername.trim() || !newName.trim()}
                className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "생성 중..." : "생성"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(""); }}
                className="px-4 py-1.5 text-xs text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">아이디</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">이름</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">권한</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs hidden sm:table-cell">비밀번호</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500 text-xs">사용</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs hidden sm:table-cell">생성일</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                    {editingId === user.id ? (
                      <>
                        <td className="px-4 py-2.5">
                          <input
                            value={editFields.username}
                            onChange={(e) => setEditFields({ ...editFields, username: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            value={editFields.display_name}
                            onChange={(e) => setEditFields({ ...editFields, display_name: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={editFields.role}
                            onChange={(e) => setEditFields({ ...editFields, role: e.target.value as "admin" | "member" })}
                            disabled={user.id === me?.id}
                            className="w-full px-2 py-1 text-xs border border-indigo-300 rounded focus:outline-none bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="member">신입사원</option>
                            <option value="admin">관리자</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <div className="relative">
                            <input
                              type={showEditPw ? "text" : "password"}
                              value={editFields.password}
                              onChange={(e) => setEditFields({ ...editFields, password: e.target.value })}
                              placeholder="변경 시 입력"
                              className="w-full px-2 py-1 pr-7 text-sm border border-indigo-300 rounded focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditPw(!showEditPw)}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showEditPw ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs ${user.is_active ? "text-green-600" : "text-gray-400"}`}>
                            {user.is_active ? "●" : "○"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell">
                          {new Date(user.created_at).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(user.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="저장"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                              title="취소"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-700">
                          {user.username}
                          {user.id === me?.id && (
                            <span className="ml-1 text-[9px] text-gray-400">(나)</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-900 font-medium">{user.display_name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            user.role === "admin"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}>
                            {user.role === "admin" ? <ShieldCheck size={10} /> : <User2 size={10} />}
                            {ROLE_LABELS[user.role]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <button
                            onClick={() => resetPassword(user)}
                            className="text-[11px] text-indigo-500 hover:text-indigo-700 hover:underline"
                          >
                            초기화
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => toggleActive(user)}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              user.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {user.is_active ? "사용" : "중지"}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell">
                          {new Date(user.created_at).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(user)}
                              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              title="수정"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => deleteUser(user)}
                              disabled={user.id === me?.id}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              title="삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                      등록된 사용자가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-gray-400 mt-4">
          초기 비밀번호: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{DEFAULT_PW}</code>
        </p>
      </div>
    </div>
  );
}

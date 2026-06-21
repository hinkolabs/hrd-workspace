"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Pencil, Trash2, Check, X, RefreshCw, Eye, EyeOff, ShieldCheck, User2, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/layout/app-shell";
import * as XLSX from "xlsx";

type User = {
  id: string;
  username: string;
  display_name: string;
  dept: string | null;
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
  const [newDept, setNewDept] = useState("");
  const [newPassword, setNewPassword] = useState(DEFAULT_PW);
  const [newRole, setNewRole] = useState<"admin" | "member">("member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [migrateResult, setMigrateResult] = useState<string[]>([]);
  const [migrating, setMigrating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ username: string; display_name: string; dept: string; password: string; role: "admin" | "member" }>({
    username: "", display_name: "", dept: "", password: "", role: "member",
  });
  const [showEditPw, setShowEditPw] = useState(false);

  // 엑셀 일괄등록
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRows, setBulkRows] = useState<{ username: string; display_name: string; dept: string; password: string; role: string }[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ row: number; username: string; status: "success" | "error"; message?: string }[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        dept: newDept.trim() || null,
        password: newPassword || DEFAULT_PW,
        role: newRole,
      }),
    });

    if (res.ok) {
      setNewUsername("");
      setNewName("");
      setNewDept("");
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
    setEditFields({ username: user.username, display_name: user.display_name, dept: user.dept ?? "", password: "", role: user.role });
    setShowEditPw(false);
  }

  async function saveEdit(id: string) {
    const updates: Record<string, unknown> = {};
    const orig = users.find((u) => u.id === id);
    if (!orig) return;

    if (editFields.username !== orig.username) updates.username = editFields.username;
    if (editFields.display_name !== orig.display_name) updates.display_name = editFields.display_name;
    if ((editFields.dept || null) !== orig.dept) updates.dept = editFields.dept.trim() || null;
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
      const data = await res.json();
      setEditingId(null);
      fetchUsers();
      if (data?.roleSkipped) {
        alert("DB에 role 컬럼이 없어 권한 변경은 무시되었습니다.\n\n/growth-setup.html의 SQL을 Supabase에서 실행한 뒤 다시 시도하세요.");
      }
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

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["아이디", "이름", "본부", "비밀번호", "권한"],
      ["hong123", "홍길동", "리테일본부", "", "member"],
      ["kim456", "김철수", "경영본부", "", "member"],
    ]);
    ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "사용자등록");
    XLSX.writeFile(wb, "사용자_일괄등록_양식.xlsx");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkError("");
    setBulkResults(null);
    setBulkFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

        const COLUMN_MAP: Record<string, string> = {
          "아이디": "username", "아이디(*)": "username",
          "이름": "display_name", "이름(*)": "display_name",
          "본부": "dept",
          "비밀번호": "password",
          "권한": "role",
        };

        const parsed = rows.map((row) => {
          const mapped: Record<string, string> = {};
          for (const [key, val] of Object.entries(row)) {
            const normKey = COLUMN_MAP[key.trim()] ?? key.trim();
            mapped[normKey] = String(val ?? "").trim();
          }
          return {
            username: mapped.username ?? "",
            display_name: mapped.display_name ?? "",
            dept: mapped.dept ?? "",
            password: mapped.password ?? "",
            role: mapped.role === "admin" ? "admin" : "member",
          };
        }).filter((r) => r.username || r.display_name);

        if (parsed.length === 0) {
          setBulkError("파일에서 유효한 데이터를 찾을 수 없습니다. 양식을 확인해 주세요.");
          setBulkRows([]);
        } else {
          setBulkRows(parsed);
        }
      } catch {
        setBulkError("파일을 읽는 중 오류가 발생했습니다. xlsx/xls 파일인지 확인해 주세요.");
        setBulkRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function submitBulk() {
    if (bulkRows.length === 0) return;
    setBulkUploading(true);
    setBulkError("");
    setBulkResults(null);

    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bulkRows.map((r) => ({
          username: r.username,
          display_name: r.display_name,
          dept: r.dept || null,
          password: r.password || undefined,
          role: r.role,
        }))),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkError(data.error || "일괄 등록 실패");
      } else {
        setBulkResults(data.results);
        fetchUsers();
      }
    } catch {
      setBulkError("네트워크 오류가 발생했습니다");
    }
    setBulkUploading(false);
  }

  function closeBulkModal() {
    setShowBulkModal(false);
    setBulkRows([]);
    setBulkFileName("");
    setBulkError("");
    setBulkResults(null);
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-amber-700 font-medium">DB 스키마 설정 (성장 커뮤니티 테이블 + role 컬럼)</span>
            <div className="flex gap-2">
              <a
                href="/api/admin/migrate"
                target="_blank"
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-50 transition-colors"
              >
                SQL 보기
              </a>
              <button
                onClick={runMigration}
                disabled={migrating}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {migrating ? "실행 중..." : "자동 실행 시도"}
              </button>
            </div>
          </div>
          {migrateResult.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto">
              {migrateResult.map((r, i) => (
                r.startsWith("---") ? null :
                r.length > 200 ? (
                  <textarea
                    key={i}
                    readOnly
                    value={r}
                    className="w-full mt-1 p-2 text-[10px] font-mono bg-white border border-amber-200 rounded-lg resize-none h-40 text-gray-700"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                ) : (
                  <p key={i} className="text-amber-800 font-mono mt-0.5">{r}</p>
                )
              ))}
            </div>
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
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-medium"
            >
              <FileSpreadsheet size={13} /> 엑셀 일괄등록
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
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3">
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
                <label className="block text-[11px] font-medium text-gray-500 mb-1">본부</label>
                <input
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="예: 리테일본부"
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
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs hidden sm:table-cell">본부</th>
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
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <input
                            value={editFields.dept}
                            onChange={(e) => setEditFields({ ...editFields, dept: e.target.value })}
                            placeholder="본부명"
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
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          {user.dept ? (
                            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                              {user.dept}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
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
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
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

      {/* 엑셀 일괄등록 모달 */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeBulkModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-green-600" />
                <h2 className="text-base font-bold text-gray-900">엑셀 일괄등록</h2>
              </div>
              <button onClick={closeBulkModal} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
              {/* 안내 및 템플릿 다운로드 */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                <p className="font-medium text-green-800 mb-1.5">사용 방법</p>
                <ol className="text-green-700 text-xs space-y-1 list-decimal list-inside">
                  <li>아래 버튼으로 양식 파일을 다운로드합니다</li>
                  <li>양식에 사용자 정보를 입력합니다 (아이디·이름 필수, 비밀번호 미입력 시 초기값 사용)</li>
                  <li>파일을 업로드하고 내용을 확인 후 등록합니다</li>
                </ol>
                <button
                  onClick={downloadTemplate}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg text-xs font-medium hover:bg-green-50 transition-colors"
                >
                  <Download size={13} /> 양식 다운로드 (.xlsx)
                </button>
              </div>

              {/* 파일 업로드 영역 */}
              {!bulkResults && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-8 hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                  >
                    <Upload size={24} className="text-gray-400" />
                    <span className="text-sm text-gray-500 font-medium">
                      {bulkFileName ? bulkFileName : "엑셀 파일 선택 (xlsx, xls)"}
                    </span>
                    {bulkFileName && (
                      <span className="text-xs text-indigo-500">클릭하여 다시 선택</span>
                    )}
                  </button>
                </div>
              )}

              {/* 오류 메시지 */}
              {bulkError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {bulkError}
                </div>
              )}

              {/* 미리보기 테이블 */}
              {bulkRows.length > 0 && !bulkResults && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600">
                      미리보기 — <span className="text-indigo-600">{bulkRows.length}명</span>
                    </p>
                    <button
                      onClick={() => { setBulkRows([]); setBulkFileName(""); }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      초기화
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-auto max-h-56">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">아이디</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">이름</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">본부</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">비밀번호</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">권한</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkRows.map((row, i) => (
                            <tr key={i} className={`border-t border-gray-100 ${!row.username || !row.display_name ? "bg-red-50" : ""}`}>
                              <td className="px-3 py-2 font-mono">
                                {row.username || <span className="text-red-400">필수</span>}
                              </td>
                              <td className="px-3 py-2">
                                {row.display_name || <span className="text-red-400">필수</span>}
                              </td>
                              <td className="px-3 py-2 text-gray-500">{row.dept || "—"}</td>
                              <td className="px-3 py-2 text-gray-400">{row.password ? "••••••" : `기본값`}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${
                                  row.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"
                                }`}>
                                  {row.role === "admin" ? "관리자" : "신입사원"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {bulkRows.some((r) => !r.username || !r.display_name) && (
                    <p className="text-xs text-red-500 mt-1.5">
                      <AlertCircle size={11} className="inline mr-1" />
                      아이디 또는 이름이 비어있는 행은 등록 시 건너뜁니다
                    </p>
                  )}
                </div>
              )}

              {/* 등록 결과 */}
              {bulkResults && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                      <CheckCircle2 size={16} />
                      성공 {bulkResults.filter((r) => r.status === "success").length}명
                    </div>
                    {bulkResults.some((r) => r.status === "error") && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                        <AlertCircle size={16} />
                        실패 {bulkResults.filter((r) => r.status === "error").length}명
                      </div>
                    )}
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-auto max-h-64">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">행</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">아이디</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500">결과</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkResults.map((r, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-2 text-gray-400">{r.row}</td>
                              <td className="px-3 py-2 font-mono">{r.username}</td>
                              <td className="px-3 py-2">
                                {r.status === "success" ? (
                                  <span className="flex items-center gap-1 text-green-600 font-medium">
                                    <CheckCircle2 size={12} /> 등록 완료
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-red-500">
                                    <AlertCircle size={12} /> {r.message}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between shrink-0">
              <p className="text-[11px] text-gray-400">
                초기 비밀번호: <code className="bg-gray-100 px-1 rounded">{DEFAULT_PW}</code>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={closeBulkModal}
                  className="px-4 py-1.5 text-xs text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {bulkResults ? "닫기" : "취소"}
                </button>
                {!bulkResults && (
                  <button
                    onClick={submitBulk}
                    disabled={bulkUploading || bulkRows.length === 0}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {bulkUploading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        등록 중...
                      </>
                    ) : (
                      <><Upload size={12} /> {bulkRows.length}명 일괄등록</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

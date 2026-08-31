"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Camera,
  Trash2,
  Download,
  Search,
  Users,
  CheckCircle2,
  TrendingUp,
  Target,
  Clock,
} from "lucide-react";
import * as XLSX from "xlsx";

const DETAIL_TOTAL = 64; // 세부실천항목 (외곽 8블록 × 8칸)
const SUBGOAL_TOTAL = 8; // 세부목표 (중앙 블록 8칸)

type ProgressRow = {
  user_id: string;
  username?: string;
  display_name: string;
  dept: string | null;
  has_mandalart: boolean;
  center_goal_filled: boolean;
  subgoal_filled_count: number;
  detail_filled_count: number;
  detail_done_count: number;
  mandalart_updated_at: string | null;
};

type SnapshotBatch = {
  id: string;
  label: string;
  taken_at: string;
  row_count: number;
};

type ViewInfo =
  | { type: "live"; generatedAt: string | null }
  | { type: "snapshot"; batch: SnapshotBatch };

type SortMode = "fill_asc" | "fill_desc" | "name";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function defaultSnapshotLabel() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} 기준`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMandalartProgressPage() {
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewInfo, setViewInfo] = useState<ViewInfo>({ type: "live", generatedAt: null });

  const [snapshots, setSnapshots] = useState<SnapshotBatch[]>([]);
  const [selectedView, setSelectedView] = useState<string>("live");
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [deletingSnapshot, setDeletingSnapshot] = useState(false);

  const [search, setSearch] = useState("");
  const [onlyUnwritten, setOnlyUnwritten] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("fill_asc");
  const [includeAdmins, setIncludeAdmins] = useState(false);

  const fetchLive = useCallback(async (withAdmins: boolean) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/mandalart-progress?includeAdmins=${withAdmins ? "1" : "0"}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `조회 실패 (${res.status})`);
      setRows(data.rows ?? []);
      setViewInfo({ type: "live", generatedAt: data.generated_at ?? null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSnapshotRows = useCallback(async (id: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/mandalart-progress/snapshots/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `조회 실패 (${res.status})`);
      setRows(data.rows ?? []);
      setViewInfo({ type: "snapshot", batch: data.batch });
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSnapshotList = useCallback(async () => {
    const res = await fetch("/api/admin/mandalart-progress/snapshots");
    if (res.ok) {
      const data = await res.json();
      setSnapshots(data.batches ?? []);
    }
  }, []);

  useEffect(() => {
    fetchLive(includeAdmins);
    fetchSnapshotList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSnapshotList]);

  function handleViewChange(value: string) {
    setSelectedView(value);
    if (value === "live") fetchLive(includeAdmins);
    else fetchSnapshotRows(value);
  }

  function handleIncludeAdminsChange(checked: boolean) {
    setIncludeAdmins(checked);
    if (selectedView === "live") fetchLive(checked);
  }

  async function createSnapshot() {
    const label = window.prompt(
      "스냅샷 이름을 입력하세요 (예: 8월 5일 마감 기준)\n\n지금 시점의 만다라트 상태를 그대로 고정 저장합니다. 이후 사용자가 계속 수정하더라도 이 스냅샷은 변경되지 않습니다.",
      defaultSnapshotLabel()
    );
    if (!label || !label.trim()) return;

    setCreatingSnapshot(true);
    try {
      const res = await fetch("/api/admin/mandalart-progress/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), includeAdmins }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "스냅샷 생성 실패");
        return;
      }
      await fetchSnapshotList();
      setSelectedView(data.id);
      await fetchSnapshotRows(data.id);
    } finally {
      setCreatingSnapshot(false);
    }
  }

  async function deleteCurrentSnapshot() {
    if (viewInfo.type !== "snapshot") return;
    const batch = viewInfo.batch;
    if (!confirm(`"${batch.label}" 스냅샷을 삭제할까요? 되돌릴 수 없습니다.`)) return;

    setDeletingSnapshot(true);
    try {
      const res = await fetch(`/api/admin/mandalart-progress/snapshots/${batch.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "삭제 실패");
        return;
      }
      await fetchSnapshotList();
      setSelectedView("live");
      await fetchLive(includeAdmins);
    } finally {
      setDeletingSnapshot(false);
    }
  }

  const displayedRows = useMemo(() => {
    let list = [...rows];

    if (onlyUnwritten) {
      list = list.filter((r) => r.detail_filled_count < DETAIL_TOTAL);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.display_name.toLowerCase().includes(q) ||
          (r.dept ?? "").toLowerCase().includes(q) ||
          (r.username ?? "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortMode === "name") return a.display_name.localeCompare(b.display_name);
      const diff = a.detail_filled_count - b.detail_filled_count;
      if (diff !== 0) return sortMode === "fill_asc" ? diff : -diff;
      return a.display_name.localeCompare(b.display_name);
    });

    return list;
  }, [rows, onlyUnwritten, search, sortMode]);

  const totalCount = rows.length;
  const registeredCount = rows.filter((r) => r.has_mandalart).length;
  const avgFillRate = totalCount
    ? Math.round((rows.reduce((s, r) => s + r.detail_filled_count, 0) / (totalCount * DETAIL_TOTAL)) * 100)
    : 0;
  const avgDoneRate = totalCount
    ? Math.round((rows.reduce((s, r) => s + r.detail_done_count, 0) / (totalCount * DETAIL_TOTAL)) * 100)
    : 0;

  function downloadExcel() {
    const header = [
      "이름",
      "그룹",
      "등록여부",
      "핵심목표",
      `세부목표(/${SUBGOAL_TOTAL})`,
      `세부실천항목(/${DETAIL_TOTAL})`,
      "작성률(%)",
      `달성(/${DETAIL_TOTAL})`,
      "최종수정일",
    ];
    const aoa = [
      header,
      ...displayedRows.map((r) => [
        r.display_name,
        r.dept ?? "",
        r.has_mandalart ? "등록" : "미등록",
        r.center_goal_filled ? "O" : "X",
        r.subgoal_filled_count,
        r.detail_filled_count,
        Math.round((r.detail_filled_count / DETAIL_TOTAL) * 100),
        r.detail_done_count,
        r.mandalart_updated_at ? new Date(r.mandalart_updated_at).toLocaleString("ko-KR") : "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [
      { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    const sheetLabel = viewInfo.type === "snapshot" ? viewInfo.batch.label : "실시간현황";
    XLSX.utils.book_append_sheet(wb, ws, sheetLabel.slice(0, 28) || "현황");

    const safeLabel = (viewInfo.type === "snapshot" ? viewInfo.batch.label : "실시간").replace(/[\\/:*?"<>|]/g, "_");
    XLSX.writeFile(wb, `만다라트_작성현황_${safeLabel}.xlsx`);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-lg font-bold text-gray-900">만다라트 현황</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          사용자별 만다라트 등록 여부와 세부실천항목(64개) 작성 현황을 확인합니다
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Users size={18} className="text-indigo-500 shrink-0" />
            <div>
              <p className="text-[11px] text-indigo-600 font-medium">등록 인원</p>
              <p className="text-lg font-bold text-indigo-700">
                {registeredCount} / {totalCount}
              </p>
            </div>
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Target size={18} className="text-teal-500 shrink-0" />
            <div>
              <p className="text-[11px] text-teal-600 font-medium">평균 작성률 (64개 기준)</p>
              <p className="text-lg font-bold text-teal-700">{avgFillRate}%</p>
            </div>
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-violet-500 shrink-0" />
            <div>
              <p className="text-[11px] text-violet-600 font-medium">평균 달성률</p>
              <p className="text-lg font-bold text-violet-700">{avgDoneRate}%</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <TrendingUp size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-[11px] text-amber-600 font-medium">미작성자</p>
              <p className="text-lg font-bold text-amber-700">
                {rows.filter((r) => r.detail_filled_count === 0).length}명
              </p>
            </div>
          </div>
        </div>

        {/* View switcher + actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <select
              value={selectedView}
              onChange={(e) => handleViewChange(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400"
            >
              <option value="live">🔴 실시간 현황</option>
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  📌 {s.label} ({new Date(s.taken_at).toLocaleDateString("ko-KR")})
                </option>
              ))}
            </select>

            {viewInfo.type === "live" ? (
              <span className="text-[11px] text-gray-400">
                {viewInfo.generatedAt ? `조회 시각: ${formatDateTime(viewInfo.generatedAt)}` : ""}
              </span>
            ) : (
              <span className="text-[11px] text-gray-400">
                고정 저장됨: {formatDateTime(viewInfo.batch.taken_at)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => (selectedView === "live" ? fetchLive(includeAdmins) : fetchSnapshotRows(selectedView))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
            >
              <RefreshCw size={12} /> 새로고침
            </button>
            {viewInfo.type === "snapshot" && (
              <button
                onClick={deleteCurrentSnapshot}
                disabled={deletingSnapshot}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={12} /> 스냅샷 삭제
              </button>
            )}
            <button
              onClick={createSnapshot}
              disabled={creatingSnapshot}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors font-medium"
            >
              <Camera size={13} /> {creatingSnapshot ? "저장 중..." : "지금 스냅샷 저장"}
            </button>
            <button
              onClick={downloadExcel}
              disabled={displayedRows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
            >
              <Download size={13} /> 엑셀 다운로드
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 그룹 검색"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer px-2">
            <input
              type="checkbox"
              checked={onlyUnwritten}
              onChange={(e) => setOnlyUnwritten(e.target.checked)}
              className="accent-indigo-600"
            />
            미작성자만 보기
          </label>
          <label
            className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer px-2"
            title="기본적으로 신입사원(member) 계정만 표시됩니다. 관리자 권한 계정도 만다라트를 작성한 경우 함께 보려면 체크하세요."
          >
            <input
              type="checkbox"
              checked={includeAdmins}
              onChange={(e) => handleIncludeAdminsChange(e.target.checked)}
              className="accent-indigo-600"
            />
            관리자 계정 포함
          </label>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400"
          >
            <option value="fill_asc">작성 적은 순</option>
            <option value="fill_desc">작성 많은 순</option>
            <option value="name">이름순</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">
            표시 {displayedRows.length} / 전체 {totalCount}명
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>
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
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">이름</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs hidden sm:table-cell">그룹</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500 text-xs">등록</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500 text-xs hidden md:table-cell">핵심목표</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500 text-xs hidden md:table-cell">세부목표(/{SUBGOAL_TOTAL})</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">세부실천항목(/{DETAIL_TOTAL})</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500 text-xs hidden lg:table-cell">달성(/{DETAIL_TOTAL})</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs hidden sm:table-cell">최종수정일</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((r) => {
                  const fillPct = Math.round((r.detail_filled_count / DETAIL_TOTAL) * 100);
                  return (
                    <tr key={r.user_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-gray-900 font-medium">{r.display_name}</td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        {r.dept ? (
                          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                            {r.dept}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            r.has_mandalart ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                          }`}
                        >
                          {r.has_mandalart ? "등록" : "미등록"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center hidden md:table-cell">
                        {r.center_goal_filled ? (
                          <CheckCircle2 size={14} className="inline text-green-500" />
                        ) : (
                          <span className="text-gray-300 text-xs">X</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-600 hidden md:table-cell">
                        {r.subgoal_filled_count}/{SUBGOAL_TOTAL}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className={`h-full rounded-full ${
                                fillPct === 100 ? "bg-green-500" : fillPct >= 50 ? "bg-indigo-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                            {r.detail_filled_count}/{DETAIL_TOTAL}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-600 hidden lg:table-cell">
                        {r.detail_done_count}/{DETAIL_TOTAL}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          {formatDateTime(r.mandalart_updated_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {displayedRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                      조건에 맞는 사용자가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-gray-400 mt-4">
          "지금 스냅샷 저장"으로 특정 시점(예: 마감일 자정)의 상태를 고정해두면, 이후 사용자가 계속 수정하더라도 해당
          시점 기준 기록이 그대로 보존됩니다. 인사평가 등 근거 자료로는 스냅샷을 사용하세요.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, X, Loader2, CheckCircle, AlertCircle,
  ClipboardCheck, ArrowUp, ArrowDown, Users, Megaphone, ClipboardList,
} from "lucide-react";
import type {
  GrowthRecruitFormField,
  GrowthRecruitApplication,
  RecruitFieldType,
  RecruitApplicationStatus,
} from "@/lib/growth-types";

const FIELD_TYPE_LABEL: Record<RecruitFieldType, string> = {
  text: "단답형",
  textarea: "장문형",
  date: "날짜",
  date_range: "기간(날짜 범위)",
  number: "숫자",
  select: "선택형",
};

function StatusBanner({ status, onClose }: { status: { type: "success" | "error"; message: string } | null; onClose: () => void }) {
  if (!status) return null;
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium mb-4 ${
      status.type === "success"
        ? "bg-green-50 text-green-700 border border-green-200"
        : "bg-red-50 text-red-700 border border-red-200"
    }`}>
      {status.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span className="flex-1">{status.message}</span>
      <button onClick={onClose}><X size={14} /></button>
    </div>
  );
}

export default function AdminRecruitsPage() {
  const [tab, setTab] = useState<"fields" | "applications">("applications");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const showStatus = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">모집 신청 관리</h1>
          <p className="text-sm text-gray-500 mt-1">신입 채팅방 모집 신청 양식을 설정하고, 접수된 신청을 승인/반려합니다</p>
        </div>

        <StatusBanner status={status} onClose={() => setStatus(null)} />

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("applications")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "applications" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <ClipboardList size={14} /> 신청 내역
          </button>
          <button
            onClick={() => setTab("fields")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "fields" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <ClipboardCheck size={14} /> 신청 양식 관리
          </button>
        </div>

        {tab === "fields" ? (
          <FormFieldsPanel showStatus={showStatus} />
        ) : (
          <ApplicationsPanel showStatus={showStatus} />
        )}
      </div>
    </div>
  );
}

/* ── 신청 양식 관리 ─────────────────────────────────────────────────────────── */

function FormFieldsPanel({ showStatus }: { showStatus: (t: "success" | "error", m: string) => void }) {
  const [fields, setFields] = useState<GrowthRecruitFormField[]>([]);
  const [loading, setLoading] = useState(true);

  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<RecruitFieldType>("text");
  const [newOptions, setNewOptions] = useState("");
  const [newRequired, setNewRequired] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/recruit-form-fields")
      .then((r) => r.json())
      .then((d) => setFields(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/recruit-form-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          field_type: newType,
          options: newType === "select" ? newOptions.split(",").map((o) => o.trim()).filter(Boolean) : null,
          required: newRequired,
          order_idx: fields.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류");
      setFields((prev) => [...prev, data]);
      setNewLabel(""); setNewType("text"); setNewOptions(""); setNewRequired(true);
      showStatus("success", "필드가 추가되었습니다.");
    } catch (e: unknown) {
      showStatus("error", e instanceof Error ? e.message : "오류 발생");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 필드를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/admin/recruit-form-fields/${id}`, { method: "DELETE" });
    if (!res.ok) { showStatus("error", "삭제 실패"); return; }
    setFields((prev) => prev.filter((f) => f.id !== id));
    showStatus("success", "필드가 삭제되었습니다.");
  }

  async function handleToggleRequired(f: GrowthRecruitFormField) {
    const res = await fetch(`/api/admin/recruit-form-fields/${f.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ required: !f.required }),
    });
    if (!res.ok) return;
    setFields((prev) => prev.map((x) => (x.id === f.id ? { ...x, required: !x.required } : x)));
  }

  async function handleMove(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    const reordered = [...fields];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    setFields(reordered);
    await Promise.all(
      reordered.map((f, i) =>
        f.order_idx === i
          ? null
          : fetch(`/api/admin/recruit-form-fields/${f.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order_idx: i }),
            })
      )
    );
    setFields((prev) => prev.map((f, i) => ({ ...f, order_idx: i })));
  }

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
        여기서 정의한 필드는 신입사원이 모집 신청 시 작성하는 양식에 그대로 표시됩니다. (예: 내용, 기간, 모집사유)
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-gray-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {fields.map((f, idx) => (
            <div key={f.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
              <div className="flex flex-col">
                <button onClick={() => handleMove(idx, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20">
                  <ArrowUp size={12} />
                </button>
                <button onClick={() => handleMove(idx, 1)} disabled={idx === fields.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20">
                  <ArrowDown size={12} />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-800">{f.label}</p>
                  {f.required && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">필수</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {FIELD_TYPE_LABEL[f.field_type]}{f.field_type === "select" && f.options?.length ? ` · ${f.options.join(", ")}` : ""}
                </p>
              </div>
              <button
                onClick={() => handleToggleRequired(f)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors shrink-0 ${
                  f.required ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {f.required ? "필수 ✓" : "필수"}
              </button>
              <button onClick={() => handleDelete(f.id)} className="p-1.5 text-gray-300 hover:text-red-400 shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">아직 등록된 필드가 없습니다. 아래에서 추가해보세요.</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Plus size={15} className="text-indigo-600" /> 새 필드 추가
        </h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="필드 이름 (예: 활동 기간)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as RecruitFieldType)}
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-indigo-400"
          >
            {Object.entries(FIELD_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {newType === "select" && (
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="선택지를 쉼표(,)로 구분해 입력 (예: 1개월, 3개월, 6개월)"
            value={newOptions}
            onChange={(e) => setNewOptions(e.target.value)}
          />
        )}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} className="rounded" />
            필수 항목
          </label>
          <button
            onClick={handleAdd}
            disabled={!newLabel.trim() || adding}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            필드 추가
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 신청 내역 ──────────────────────────────────────────────────────────────── */

function ApplicationsPanel({ showStatus }: { showStatus: (t: "success" | "error", m: string) => void }) {
  const [statusFilter, setStatusFilter] = useState<RecruitApplicationStatus>("pending");
  const [applications, setApplications] = useState<GrowthRecruitApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GrowthRecruitApplication | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/recruit-applications?status=${statusFilter}`)
      .then((r) => r.json())
      .then((d) => setApplications(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(["pending", "approved", "rejected"] as RecruitApplicationStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {s === "pending" ? "대기중" : s === "approved" ? "승인됨" : "반려됨"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-gray-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
          <Megaphone size={28} />
          <p className="text-sm">신청 내역이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <button
              key={app.id}
              onClick={() => setSelected(app)}
              className="w-full text-left bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">{app.recruit?.title ?? "(삭제된 모집)"}</p>
                <span className="text-xs text-gray-400 shrink-0">{new Date(app.created_at).toLocaleDateString("ko-KR")}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>모집자: {app.submitted_by_name}</span>
                <span className="flex items-center gap-1"><Users size={11} /> {app.participants?.length ?? 0}명</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ApplicationDetailModal
          application={selected}
          onClose={() => setSelected(null)}
          onDecided={(decision) => {
            setSelected(null);
            showStatus("success", decision === "approved" ? "신청을 승인했습니다." : "신청을 반려했습니다.");
            load();
          }}
          showStatus={showStatus}
        />
      )}
    </div>
  );
}

function ApplicationDetailModal({
  application,
  onClose,
  onDecided,
  showStatus,
}: {
  application: GrowthRecruitApplication;
  onClose: () => void;
  onDecided: (decision: "approved" | "rejected") => void;
  showStatus: (t: "success" | "error", m: string) => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState<"approved" | "rejected" | null>(null);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/recruit-form-fields")
      .then((r) => r.json())
      .then((fields: GrowthRecruitFormField[]) => {
        const map: Record<string, string> = {};
        (fields ?? []).forEach((f) => { map[f.id] = f.label; });
        setFieldLabels(map);
      })
      .catch(() => {});
  }, []);

  async function decide(decision: "approved" | "rejected") {
    setSubmitting(decision);
    try {
      const res = await fetch(`/api/admin/recruit-applications/${application.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "처리 중 오류가 발생했습니다");
      onDecided(decision);
    } catch (e: unknown) {
      showStatus("error", e instanceof Error ? e.message : "오류 발생");
    } finally {
      setSubmitting(null);
    }
  }

  const answerEntries = Object.entries(application.answers ?? {});

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">신청 상세</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">모집 제목</p>
            <p className="text-sm font-semibold text-gray-900">{application.recruit?.title ?? "-"}</p>
            {application.recruit?.description && (
              <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{application.recruit.description}</p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">모집자</p>
            <p className="text-sm text-gray-800">{application.submitted_by_name}</p>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">참여자 ({application.participants?.length ?? 0}명)</p>
            <div className="flex flex-wrap gap-1">
              {(application.participants ?? []).map((p) => (
                <span key={p.user_id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{p.display_name}</span>
              ))}
            </div>
          </div>

          {answerEntries.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">신청 답변</p>
              <div className="space-y-2">
                {answerEntries.map(([fieldId, value]) => (
                  <div key={fieldId} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-gray-600">{fieldLabels[fieldId] ?? fieldId}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {application.status === "pending" ? (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="반려 시 사유 (선택)"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => decide("rejected")}
                  disabled={submitting !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-40 transition-colors"
                >
                  {submitting === "rejected" ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  반려
                </button>
                <button
                  onClick={() => decide("approved")}
                  disabled={submitting !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                >
                  {submitting === "approved" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  승인 (그룹 생성)
                </button>
              </div>
            </div>
          ) : (
            <div className={`px-3 py-2 rounded-lg text-sm font-medium ${application.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {application.status === "approved" ? "승인됨" : "반려됨"}
              {application.review_note && <p className="text-xs mt-1 font-normal">{application.review_note}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

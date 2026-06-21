"use client";

import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp,
  Loader2, CheckCircle, AlertCircle, ListChecks, GripVertical
} from "lucide-react";
import type { GrowthThemeCategory, GrowthThemeItem } from "@/lib/growth-types";

type ItemWithEdit = GrowthThemeItem & { _editing?: boolean; _newName?: string; _newDesc?: string };
type CatWithItems = GrowthThemeCategory & {
  items: ItemWithEdit[];
  _expanded?: boolean;
  _editing?: boolean;
};

const EMOJI_PRESETS = ["🏆", "📚", "💼", "🎯", "📝", "💡", "🌟", "🔑", "📊", "🏅"];

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

export default function AdminGrowthPage() {
  const [categories, setCategories] = useState<CatWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New category form state
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("🏆");
  const [addingCat, setAddingCat] = useState(false);

  // New item form per category
  const [newItemInputs, setNewItemInputs] = useState<Record<string, { name: string; desc: string }>>({});

  const showStatus = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  useEffect(() => {
    setLoading(true);
    fetch("/api/growth/themes")
      .then((r) => r.json())
      .then((d) => {
        const list: CatWithItems[] = (Array.isArray(d) ? d : []).map((cat: CatWithItems) => ({
          ...cat,
          _expanded: false,
          _editing: false,
          items: (cat.items ?? []).map((item: ItemWithEdit) => ({ ...item, _editing: false })),
        }));
        setCategories(list);
      })
      .finally(() => setLoading(false));
  }, []);

  const [syncing, setSyncing] = useState(false);

  async function handleSyncCompletions() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-theme-completions", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showStatus("success", data.message ?? `${data.synced}개 달성 기록 동기화 완료`);
      } else {
        showStatus("error", data.error ?? "동기화 실패");
      }
    } catch {
      showStatus("error", "네트워크 오류");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await fetch("/api/growth/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim() || null,
          icon_emoji: newCatEmoji,
          order_idx: categories.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류");
      setCategories((prev) => [...prev, { ...data, items: [], _expanded: true, _editing: false }]);
      setNewCatName("");
      setNewCatDesc("");
      setNewCatEmoji("🏆");
      showStatus("success", "테마가 추가되었습니다.");
    } catch (e: unknown) {
      showStatus("error", e instanceof Error ? e.message : "오류 발생");
    } finally {
      setAddingCat(false);
    }
  }

  async function handleDeleteCategory(catId: string) {
    if (!confirm("테마와 모든 항목을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/growth/themes/${catId}/items?category=true`, { method: "DELETE" });
    if (res.ok || res.status === 405) {
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      showStatus("success", "테마가 삭제되었습니다.");
    } else {
      showStatus("error", "삭제 실패");
    }
  }

  async function handleSaveCategoryEdit(catId: string, name: string, description: string, icon_emoji: string) {
    const res = await fetch(`/api/growth/themes/${catId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "category", name, description: description || null, icon_emoji }),
    });
    const data = await res.json();
    if (!res.ok) { showStatus("error", data.error ?? "오류"); return; }
    setCategories((prev) =>
      prev.map((c) => c.id === catId ? { ...c, ...data, _editing: false } : c)
    );
    showStatus("success", "테마 정보가 저장되었습니다.");
  }

  async function handleAddItem(catId: string) {
    const input = newItemInputs[catId];
    if (!input?.name?.trim()) return;
    const cat = categories.find((c) => c.id === catId);
    const res = await fetch(`/api/growth/themes/${catId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name.trim(),
        description: input.desc?.trim() || null,
        order_idx: cat?.items.length ?? 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) { showStatus("error", data.error ?? "오류"); return; }
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, items: [...c.items, { ...data, _editing: false }] }
          : c
      )
    );
    setNewItemInputs((prev) => ({ ...prev, [catId]: { name: "", desc: "" } }));
    showStatus("success", "항목이 추가되었습니다.");
  }

  async function handleDeleteItem(catId: string, itemId: string) {
    if (!confirm("항목을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/growth/themes/${catId}/items?item_id=${itemId}`, { method: "DELETE" });
    if (!res.ok) { showStatus("error", "삭제 실패"); return; }
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
      )
    );
    showStatus("success", "항목이 삭제되었습니다.");
  }

  async function handleSaveItemEdit(catId: string, item: ItemWithEdit) {
    const res = await fetch(`/api/growth/themes/${catId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: item.id,
        name: item._newName ?? item.name,
        description: item._newDesc ?? item.description,
      }),
    });
    const data = await res.json();
    if (!res.ok) { showStatus("error", data.error ?? "오류"); return; }
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== catId
          ? c
          : {
              ...c,
              items: c.items.map((i) =>
                i.id === item.id ? { ...data, _editing: false } : i
              ),
            }
      )
    );
    showStatus("success", "항목이 수정되었습니다.");
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">테마 달성 관리</h1>
            <p className="text-sm text-gray-500 mt-1">신입 팀의 테마별 달성 항목을 설정합니다</p>
          </div>
          <button
            onClick={handleSyncCompletions}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0C7C59] text-white text-xs font-semibold rounded-xl hover:bg-[#0A5F44] disabled:opacity-60 transition-colors shrink-0"
          >
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            달성 현황 동기화
          </button>
        </div>

        <StatusBanner status={status} onClose={() => setStatus(null)} />

        {/* Add category form */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Plus size={15} className="text-[#0C7C59]" /> 새 테마 추가
          </h2>
          <div className="flex gap-2 flex-wrap">
            {EMOJI_PRESETS.map((e) => (
              <button
                key={e}
                onClick={() => setNewCatEmoji(e)}
                className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                  newCatEmoji === e ? "ring-2 ring-[#0C7C59] bg-[#0C7C59]/10" : "hover:bg-gray-100"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0C7C59] focus:ring-1 focus:ring-[#0C7C59]/30"
            placeholder="테마 이름 (예: 자격증 취득)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
          />
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0C7C59] focus:ring-1 focus:ring-[#0C7C59]/30"
            placeholder="설명 (선택)"
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
          />
          <button
            onClick={handleAddCategory}
            disabled={!newCatName.trim() || addingCat}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0C7C59] text-white text-sm rounded-lg font-medium disabled:opacity-50 hover:bg-[#0A5F44] transition-colors"
          >
            {addingCat ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            테마 추가
          </button>
        </div>

        {/* Category list */}
        {loading ? (
          <div className="flex justify-center py-12 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> 불러오는 중...
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <ListChecks size={32} />
            <p className="text-sm">아직 등록된 테마가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat, catIdx) => {
              const catInput = newItemInputs[cat.id] ?? { name: "", desc: "" };
              return (
                <div key={cat.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Category header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <span className="text-xl">{cat.icon_emoji}</span>
                    {cat._editing ? (
                      <CategoryEditForm
                        cat={cat}
                        onSave={(name, desc, emoji) => handleSaveCategoryEdit(cat.id, name, desc, emoji)}
                        onCancel={() =>
                          setCategories((prev) =>
                            prev.map((c) => c.id === cat.id ? { ...c, _editing: false } : c)
                          )
                        }
                      />
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{cat.name}</p>
                          {cat.description && <p className="text-xs text-gray-400 truncate">{cat.description}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">{cat.items.length}개 항목</p>
                        </div>
                        <button
                          onClick={() =>
                            setCategories((prev) =>
                              prev.map((c) => c.id === cat.id ? { ...c, _editing: true } : c)
                            )
                          }
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setCategories((prev) =>
                              prev.map((c) => c.id === cat.id ? { ...c, _expanded: !c._expanded } : c)
                            )
                          }
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {cat._expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Items */}
                  {cat._expanded && (
                    <div className="px-4 pb-4 pt-3 space-y-2">
                      {cat.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50">
                          <GripVertical size={14} className="text-gray-300 mt-1 shrink-0" />
                          {item._editing ? (
                            <ItemEditForm
                              item={item}
                              onSave={() => handleSaveItemEdit(cat.id, item)}
                              onCancel={() =>
                                setCategories((prev) =>
                                  prev.map((c) =>
                                    c.id !== cat.id ? c :
                                    { ...c, items: c.items.map((i) => i.id === item.id ? { ...i, _editing: false } : i) }
                                  )
                                )
                              }
                              onChange={(field, val) =>
                                setCategories((prev) =>
                                  prev.map((c) =>
                                    c.id !== cat.id ? c :
                                    { ...c, items: c.items.map((i) => i.id === item.id ? { ...i, [field]: val } : i) }
                                  )
                                )
                              }
                            />
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800">{item.name}</p>
                                {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                              </div>
                              <button
                                onClick={() =>
                                  setCategories((prev) =>
                                    prev.map((c) =>
                                      c.id !== cat.id ? c :
                                      { ...c, items: c.items.map((i) =>
                                        i.id === item.id ? { ...i, _editing: true, _newName: i.name, _newDesc: i.description ?? "" } : i
                                      )}
                                    )
                                  )
                                }
                                className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200 transition-colors"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(cat.id, item.id)}
                                className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Add item */}
                      <div className="flex gap-2 mt-3">
                        <input
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#0C7C59] focus:ring-1 focus:ring-[#0C7C59]/30"
                          placeholder="새 항목 이름"
                          value={catInput.name}
                          onChange={(e) => setNewItemInputs((prev) => ({ ...prev, [cat.id]: { ...catInput, name: e.target.value } }))}
                          onKeyDown={(e) => e.key === "Enter" && handleAddItem(cat.id)}
                        />
                        <button
                          onClick={() => handleAddItem(cat.id)}
                          disabled={!catInput.name.trim()}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#0C7C59]/10 text-[#0C7C59] rounded-lg text-sm font-medium hover:bg-[#0C7C59]/20 disabled:opacity-40 transition-colors"
                        >
                          <Plus size={13} /> 추가
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryEditForm({
  cat,
  onSave,
  onCancel,
}: {
  cat: CatWithItems;
  onSave: (name: string, desc: string, emoji: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(cat.name);
  const [desc, setDesc] = useState(cat.description ?? "");
  const [emoji, setEmoji] = useState(cat.icon_emoji);

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="flex gap-1 flex-wrap">
        {EMOJI_PRESETS.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`w-6 h-6 rounded text-sm flex items-center justify-center ${emoji === e ? "ring-1 ring-[#0C7C59] bg-[#0C7C59]/10" : "hover:bg-gray-100"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        className="border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-[#0C7C59]"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-[#0C7C59]"
        value={desc}
        placeholder="설명 (선택)"
        onChange={(e) => setDesc(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={() => onSave(name, desc, emoji)} className="flex items-center gap-1 px-2 py-1 bg-[#0C7C59] text-white text-xs rounded hover:bg-[#0A5F44]">
          <Save size={11} /> 저장
        </button>
        <button onClick={onCancel} className="px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50">
          취소
        </button>
      </div>
    </div>
  );
}

function ItemEditForm({
  item,
  onSave,
  onCancel,
  onChange,
}: {
  item: ItemWithEdit;
  onSave: () => void;
  onCancel: () => void;
  onChange: (field: "_newName" | "_newDesc", val: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-1.5">
      <input
        className="border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-[#0C7C59]"
        value={item._newName ?? item.name}
        onChange={(e) => onChange("_newName", e.target.value)}
      />
      <input
        className="border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-[#0C7C59]"
        value={item._newDesc ?? item.description ?? ""}
        placeholder="설명 (선택)"
        onChange={(e) => onChange("_newDesc", e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-1 px-2 py-1 bg-[#0C7C59] text-white text-xs rounded hover:bg-[#0A5F44]">
          <Save size={11} /> 저장
        </button>
        <button onClick={onCancel} className="px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50">
          취소
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Todo } from "@/lib/supabase";
import TodoCard from "./todo-card";
import TodoForm from "./todo-form";

const COLUMNS: { status: Todo["status"]; label: string; color: string; dot: string; activeTab: string }[] = [
  { status: "pending",     label: "대기",   color: "bg-gray-50",  dot: "bg-gray-400",  activeTab: "border-gray-400 text-gray-700" },
  { status: "in_progress", label: "진행중", color: "bg-blue-50",  dot: "bg-blue-500",  activeTab: "border-blue-500 text-blue-600" },
  { status: "done",        label: "완료",   color: "bg-green-50", dot: "bg-green-500", activeTab: "border-green-500 text-green-600" },
];

export default function TodoBoard() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Todo["status"]>("pending");
  const [activeTab, setActiveTab] = useState<Todo["status"]>("pending");

  const fetchTodos = useCallback(async () => {
    const res = await fetch("/api/todos");
    if (res.ok) {
      const data = await res.json();
      setTodos(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTodos();
    const supabase = createClient();
    const channel = supabase
      .channel("todos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTodos((prev) => {
            const t = payload.new as Todo;
            if (prev.some((x) => x.id === t.id)) return prev;
            return [t, ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          setTodos((prev) => prev.map((t) => t.id === (payload.new as Todo).id ? (payload.new as Todo) : t));
        } else if (payload.eventType === "DELETE") {
          setTodos((prev) => prev.filter((t) => t.id !== (payload.old as Todo).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTodos]);

  async function handleSave(data: {
    title: string;
    description: string;
    priority: Todo["priority"];
    due_date: string | null;
    status?: Todo["status"];
  }) {
    if (editingTodo) {
      await fetch(`/api/todos/${editingTodo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    await fetchTodos();
  }

  async function handleDelete(id: string) {
    if (!confirm("이 할일을 삭제할까요?")) return;
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    await fetchTodos();
  }

  async function handleStatusChange(id: string, status: Todo["status"]) {
    await fetch(`/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchTodos();
  }

  function openNew(status: Todo["status"]) {
    setEditingTodo(null);
    setDefaultStatus(status);
    setFormOpen(true);
  }
  function openEdit(todo: Todo) { setEditingTodo(todo); setFormOpen(true); }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h2 className="text-base font-semibold text-gray-900">할일 관리</h2>
          <p className="text-xs text-gray-500 mt-0.5">팀 칸반 보드</p>
        </div>
        <button
          onClick={() => openNew("pending")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus size={13} />
          새 할일
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── 모바일: 탭 + 단일 컬럼 ── */}
          <div className="flex flex-col flex-1 min-h-0 md:hidden">
            {/* 탭 */}
            <div className="flex shrink-0 border-b border-gray-200 mb-3">
              {COLUMNS.map(({ status, label, dot, activeTab: activeStyle }) => {
                const count = todos.filter((t) => t.status === status).length;
                const isActive = activeTab === status;
                return (
                  <button
                    key={status}
                    onClick={() => setActiveTab(status)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border-b-2 transition-colors ${
                      isActive ? activeStyle : "border-transparent text-gray-400"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    {label}
                    <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${isActive ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 선택된 탭 내용 */}
            {COLUMNS.filter(({ status }) => status === activeTab).map(({ status, color }) => {
              const columnTodos = todos.filter((t) => t.status === status);
              return (
                <div key={status} className={`flex-1 min-h-0 rounded-xl ${color} p-3 flex flex-col`}>
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <span className="text-xs text-gray-500">{columnTodos.length}개</span>
                    <button
                      onClick={() => openNew(status)}
                      className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                    >
                      <Plus size={12} /> 추가
                    </button>
                  </div>
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {columnTodos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                        <p className="text-xs">없음</p>
                      </div>
                    ) : (
                      columnTodos.map((todo) => (
                        <TodoCard
                          key={todo.id}
                          todo={todo}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          onStatusChange={handleStatusChange}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 데스크탑: 3컬럼 칸반 ── */}
          <div className="hidden md:flex flex-1 min-h-0 overflow-x-auto">
            <div className="grid grid-cols-3 gap-3 h-full w-full min-w-[480px]">
              {COLUMNS.map(({ status, label, color, dot }) => {
                const columnTodos = todos.filter((t) => t.status === status);
                return (
                  <div key={status} className={`rounded-xl ${color} p-3 flex flex-col min-h-[200px] lg:min-h-0`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${dot}`} />
                        <span className="text-xs font-semibold text-gray-700">{label}</span>
                        <span className="text-xs text-gray-400 font-medium">{columnTodos.length}</span>
                      </div>
                      <button
                        onClick={() => openNew(status)}
                        className="p-0.5 rounded hover:bg-black/10 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {columnTodos.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-xs text-gray-400">없음</p>
                        </div>
                      ) : (
                        columnTodos.map((todo) => (
                          <TodoCard
                            key={todo.id}
                            todo={todo}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onStatusChange={handleStatusChange}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {formOpen && (
        <TodoForm
          todo={editingTodo}
          defaultStatus={defaultStatus}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

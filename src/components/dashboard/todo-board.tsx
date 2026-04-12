"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Todo } from "@/lib/supabase";
import TodoCard from "./todo-card";
import TodoForm from "./todo-form";

const COLUMNS: { status: Todo["status"]; label: string; color: string; dot: string }[] = [
  { status: "pending",     label: "대기",   color: "bg-gray-50", dot: "bg-gray-400" },
  { status: "in_progress", label: "진행중", color: "bg-blue-50",  dot: "bg-blue-500" },
  { status: "done",        label: "완료",   color: "bg-green-50", dot: "bg-green-500" },
];

export default function TodoBoard() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Todo["status"]>("pending");

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTodos((prev) => {
              const t = payload.new as Todo;
              if (prev.some((x) => x.id === t.id)) return prev;
              return [t, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setTodos((prev) =>
              prev.map((t) =>
                t.id === (payload.new as Todo).id ? (payload.new as Todo) : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            setTodos((prev) =>
              prev.filter((t) => t.id !== (payload.old as Todo).id)
            );
          }
        }
      )
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
      const res = await fetch(`/api/todos/${editingTodo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } else {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newTodo = await res.json();
        setTodos((prev) => [newTodo, ...prev]);
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 할일을 삭제할까요?")) return;
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleStatusChange(id: string, status: Todo["status"]) {
    const res = await fetch(`/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }
  }

  function openNew(status: Todo["status"]) {
    setEditingTodo(null);
    setDefaultStatus(status);
    setFormOpen(true);
  }
  function openEdit(todo: Todo) { setEditingTodo(todo); setFormOpen(true); }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
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
        <div className="flex-1 min-h-0 overflow-x-auto">
        <div className="grid grid-cols-3 gap-3 h-full min-w-[480px]">
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

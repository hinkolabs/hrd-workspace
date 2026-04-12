import type { Memo, Todo } from "./supabase";

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function sortMemos(list: Memo[]): Memo[] {
  return [...list.filter((m) => m.pinned), ...list.filter((m) => !m.pinned)];
}

// ── Memos ──────────────────────────────────────────────────────────────────

const MEMOS_KEY = "hrd_memos";

export function loadMemos(): Memo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEMOS_KEY);
    return raw ? (JSON.parse(raw) as Memo[]) : [];
  } catch {
    return [];
  }
}

function saveMemos(list: Memo[]) {
  localStorage.setItem(MEMOS_KEY, JSON.stringify(list));
}

export function createMemo(data: {
  title: string;
  content: string;
  color: string;
}): Memo {
  const memo: Memo = {
    id: uuid(),
    title: data.title,
    content: data.content || null,
    color: data.color || "default",
    pinned: false,
    created_at: now(),
    updated_at: now(),
    created_by: null,
    updated_by: null,
  };
  const list = loadMemos();
  saveMemos([...list, memo]);
  return memo;
}

export function updateMemo(id: string, patch: Partial<Memo>): Memo | null {
  const list = loadMemos();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const updated = { ...list[idx], ...patch, updated_at: now() };
  list[idx] = updated;
  saveMemos(list);
  return updated;
}

export function deleteMemo(id: string) {
  saveMemos(loadMemos().filter((m) => m.id !== id));
}

export { sortMemos };

// ── Todos ──────────────────────────────────────────────────────────────────

const TODOS_KEY = "hrd_todos";

export function loadTodos(): Todo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TODOS_KEY);
    return raw ? (JSON.parse(raw) as Todo[]) : [];
  } catch {
    return [];
  }
}

function saveTodos(list: Todo[]) {
  localStorage.setItem(TODOS_KEY, JSON.stringify(list));
}

export function createTodo(data: {
  title: string;
  description: string;
  priority: Todo["priority"];
  due_date: string | null;
  status: Todo["status"];
}): Todo {
  const todo: Todo = {
    id: uuid(),
    title: data.title,
    description: data.description || null,
    status: data.status,
    priority: data.priority,
    due_date: data.due_date,
    created_at: now(),
    updated_at: now(),
    created_by: null,
    updated_by: null,
  };
  const list = loadTodos();
  saveTodos([todo, ...list]);
  return todo;
}

export function updateTodo(id: string, patch: Partial<Todo>): Todo | null {
  const list = loadTodos();
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const updated = { ...list[idx], ...patch, updated_at: now() };
  list[idx] = updated;
  saveTodos(list);
  return updated;
}

export function deleteTodo(id: string) {
  saveTodos(loadTodos().filter((t) => t.id !== id));
}

// ── Supabase 사용 가능 여부 확인 ────────────────────────────────────────────

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return (
    url.startsWith("https://") &&
    !url.includes("your-project") &&
    key.length > 20 &&
    !key.includes("your-anon-key")
  );
}

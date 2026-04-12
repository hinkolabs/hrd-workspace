import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type Memo = {
  id: string;
  title: string;
  content: string | null;
  pinned: boolean;
  color: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type Todo = {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ActivityLog = {
  id: string;
  entity_type: "memo" | "todo";
  entity_id: string | null;
  entity_title: string | null;
  action: "create" | "update" | "delete";
  user_display_name: string | null;
  user_id: string | null;
  detail: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  sender: string;
  content: string;
  created_at: string;
};

export type Estimate = {
  id: string;
  title: string;
  result: Record<string, unknown> | null;
  file_urls: string[] | null;
  created_at: string;
};

export type Document = {
  id: string;
  title: string;
  content: string | null;
  file_url: string | null;
  chunk_count: number;
  created_at: string;
};

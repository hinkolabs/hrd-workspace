import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "weekly";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const supabase = createServerClient();

  const start = startDate || getDefaultStart(period);
  const end = endDate
    ? new Date(endDate + "T23:59:59").toISOString()
    : new Date().toISOString();

  const [{ data: todos }, { data: memos }] = await Promise.all([
    supabase.from("todos").select("id, title, status, priority, due_date").gte("created_at", start).lte("created_at", end),
    supabase.from("memos").select("id, title").gte("created_at", start).lte("created_at", end),
  ]);

  const done = (todos || []).filter((t) => t.status === "done");
  const inProgress = (todos || []).filter((t) => t.status === "in_progress");
  const pending = (todos || []).filter((t) => t.status === "pending");

  return NextResponse.json({
    period: { start: start.split("T")[0], end: end.split("T")[0] },
    todos: {
      total: (todos || []).length,
      done: done.length,
      inProgress: inProgress.length,
      pending: pending.length,
      items: (todos || []).map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date?.split("T")[0] ?? null,
      })),
    },
    memos: {
      total: (memos || []).length,
      items: (memos || []).map((m) => ({ title: m.title })),
    },
  });
}

function getDefaultStart(period: string): string {
  const d = new Date();
  const days: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30, quarterly: 90 };
  d.setDate(d.getDate() - (days[period] ?? 7));
  return d.toISOString();
}

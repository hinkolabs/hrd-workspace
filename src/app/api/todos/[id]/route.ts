import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  in_progress: "진행중",
  done: "완료",
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient();
  const session = await getSessionFromCookies();
  const { id } = await params;
  const body = await req.json();
  const { title, description, status, priority, due_date } = body;

  const displayName = session?.displayName ?? null;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: displayName,
  };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (due_date !== undefined) updates.due_date = due_date;

  const { data: before } = await supabase
    .from("todos")
    .select("status, title")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("todos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let detail: string | null = null;
  if (status !== undefined && before?.status !== status) {
    detail = `상태 변경: ${STATUS_LABEL[before?.status ?? ""] ?? before?.status} → ${STATUS_LABEL[status] ?? status}`;
  } else if (title !== undefined || description !== undefined) {
    detail = "내용 수정";
  } else if (priority !== undefined) {
    detail = "우선순위 변경";
  } else if (due_date !== undefined) {
    detail = "마감일 변경";
  }

  await supabase.from("activity_logs").insert({
    entity_type: "todo",
    entity_id: id,
    entity_title: data.title,
    action: "update",
    user_display_name: displayName,
    user_id: session?.userId ?? null,
    detail,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient();
  const session = await getSessionFromCookies();
  const { id } = await params;

  const { data: todo } = await supabase
    .from("todos")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("activity_logs").insert({
    entity_type: "todo",
    entity_id: id,
    entity_title: todo?.title ?? null,
    action: "delete",
    user_display_name: session?.displayName ?? null,
    user_id: session?.userId ?? null,
  });

  return NextResponse.json({ success: true });
}

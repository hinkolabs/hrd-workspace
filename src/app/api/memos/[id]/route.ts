import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient();
  const session = await getSessionFromCookies();
  const { id } = await params;
  const body = await req.json();
  const { title, content, pinned, color } = body;

  const displayName = session?.displayName ?? null;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: displayName,
  };
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (pinned !== undefined) updates.pinned = pinned;
  if (color !== undefined) updates.color = color;

  const { data, error } = await supabase
    .from("memos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let detail: string | null = null;
  if (pinned !== undefined) {
    detail = pinned ? "핀 고정" : "핀 해제";
  } else if (title !== undefined || content !== undefined) {
    detail = "내용 수정";
  } else if (color !== undefined) {
    detail = "색상 변경";
  }

  await supabase.from("activity_logs").insert({
    entity_type: "memo",
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

  const { data: memo } = await supabase
    .from("memos")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("memos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("activity_logs").insert({
    entity_type: "memo",
    entity_id: id,
    entity_title: memo?.title ?? null,
    action: "delete",
    user_display_name: session?.displayName ?? null,
    user_id: session?.userId ?? null,
  });

  return NextResponse.json({ success: true });
}

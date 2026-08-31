import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { title, description, target_count, room_id } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "모집 제목을 입력해주세요" }, { status: 400 });
  }

  const supabase = createServerClient();

  const messageInsert: Record<string, unknown> = {
    user_id: session.userId,
    sender_name: session.displayName,
    content: title.trim(),
    kind: "recruit",
  };
  if (room_id) messageInsert.room_id = room_id;

  const { data: message, error: msgErr } = await supabase
    .from("growth_chat_messages")
    .insert(messageInsert)
    .select()
    .single();

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

  const { data: recruit, error: recruitErr } = await supabase
    .from("growth_recruits")
    .insert({
      message_id: message.id,
      room_id: room_id || null,
      organizer_id: session.userId,
      title: title.trim(),
      description: description?.trim() || null,
      target_count: target_count || null,
    })
    .select()
    .single();

  if (recruitErr) {
    // roll back orphan message
    await supabase.from("growth_chat_messages").delete().eq("id", message.id);
    return NextResponse.json({ error: recruitErr.message }, { status: 500 });
  }

  return NextResponse.json({ ...message, recruit }, { status: 201 });
}

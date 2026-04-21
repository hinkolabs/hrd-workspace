import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { threadId } = await params;
  const supabase = createServerClient();

  // Verify access: must be trainee or mentor of this thread
  const { data: thread } = await supabase
    .from("growth_mentor_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (!thread) return NextResponse.json({ error: "스레드 없음" }, { status: 404 });
  if (thread.trainee_id !== session.userId && thread.mentor_id !== session.userId) {
    return NextResponse.json({ error: "접근 권한 없음" }, { status: 403 });
  }

  const { data: messages } = await supabase
    .from("growth_mentor_messages")
    .select("*, users(display_name)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  const flat = (messages ?? []).map((m: Record<string, unknown>) => {
    const u = m.users as { display_name: string } | null;
    return { ...m, users: undefined, sender_name: u?.display_name ?? "" };
  });

  return NextResponse.json({ thread, messages: flat });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { threadId } = await params;
  const { content, attachments } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: "내용을 입력하세요" }, { status: 400 });

  const supabase = createServerClient();

  const { data: thread } = await supabase
    .from("growth_mentor_threads")
    .select("trainee_id, mentor_id")
    .eq("id", threadId)
    .single();

  if (!thread) return NextResponse.json({ error: "스레드 없음" }, { status: 404 });
  if (thread.trainee_id !== session.userId && thread.mentor_id !== session.userId) {
    return NextResponse.json({ error: "접근 권한 없음" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("growth_mentor_messages")
    .insert({
      thread_id: threadId,
      sender_id: session.userId,
      content: content.trim(),
      attachments: attachments ?? [],
    })
    .select("*, users(display_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const u = data.users as { display_name: string } | null;
  return NextResponse.json({ ...data, users: undefined, sender_name: u?.display_name ?? "" }, { status: 201 });
}

// PATCH: update mentor assignment or thread status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { threadId } = await params;
  const updates = await req.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("growth_mentor_threads")
    .update(updates)
    .eq("id", threadId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

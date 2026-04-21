import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("growth_comments")
    .select("*, users(display_name)")
    .eq("journal_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const flat = (data ?? []).map((c: Record<string, unknown>) => {
    const u = c.users as { display_name: string } | null;
    return { ...c, users: undefined, display_name: u?.display_name ?? "" };
  });

  return NextResponse.json(flat);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const { content, parent_id } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: "내용을 입력하세요" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_comments")
    .insert({
      journal_id: id,
      user_id: session.userId,
      parent_id: parent_id ?? null,
      content: content.trim(),
    })
    .select("*, users(display_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const u = data.users as { display_name: string } | null;
  return NextResponse.json({ ...data, users: undefined, display_name: u?.display_name ?? "" }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id: commentId } = await req.json();
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("growth_comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!existing || existing.user_id !== session.userId) {
    return NextResponse.json({ error: "삭제 권한 없음" }, { status: 403 });
  }

  await supabase.from("growth_comments").delete().eq("id", commentId);
  return NextResponse.json({ ok: true });
}

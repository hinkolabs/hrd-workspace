import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; postId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id, postId } = await params;
  const supabase = createServerClient();

  const isAdmin = session.role === "admin";
  if (!isAdmin) {
    const { data: member } = await supabase
      .from("growth_group_members")
      .select("id")
      .eq("group_id", id)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!member) return NextResponse.json({ error: "그룹 멤버만 댓글을 작성할 수 있습니다" }, { status: 403 });
  }

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });

  const { data, error } = await supabase
    .from("growth_group_comments")
    .insert({
      post_id: postId,
      user_id: session.userId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, display_name: session.displayName }, { status: 201 });
}

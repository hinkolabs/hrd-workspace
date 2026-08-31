import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

async function assertMember(supabase: ReturnType<typeof createServerClient>, groupId: string, userId: string) {
  const { data } = await supabase
    .from("growth_group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const isAdmin = session.role === "admin";
  if (!isAdmin && !(await assertMember(supabase, id, session.userId))) {
    return NextResponse.json({ error: "그룹 멤버만 볼 수 있습니다" }, { status: 403 });
  }

  const { data: posts, error } = await supabase
    .from("growth_group_posts")
    .select("*")
    .eq("group_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const postIds = (posts ?? []).map((p: { id: string }) => p.id);
  const userIds = Array.from(new Set((posts ?? []).map((p: { user_id: string }) => p.user_id)));

  const [{ data: comments }, { data: users }] = await Promise.all([
    postIds.length ? supabase.from("growth_group_comments").select("*").in("post_id", postIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
    userIds.length ? supabase.from("users").select("id, display_name").in("id", userIds) : Promise.resolve({ data: [] }),
  ]);

  const commentUserIds = Array.from(new Set((comments ?? []).map((c: { user_id: string }) => c.user_id)));
  const { data: commentUsers } = commentUserIds.length
    ? await supabase.from("users").select("id, display_name").in("id", commentUserIds)
    : { data: [] };

  const userMap = new Map([...(users ?? []), ...(commentUsers ?? [])].map((u: { id: string; display_name: string }) => [u.id, u.display_name]));

  const commentsByPost: Record<string, unknown[]> = {};
  (comments ?? []).forEach((c: Record<string, unknown>) => {
    const pid = c.post_id as string;
    if (!commentsByPost[pid]) commentsByPost[pid] = [];
    commentsByPost[pid].push({ ...c, display_name: userMap.get(c.user_id as string) ?? "알수없음" });
  });

  const enriched = (posts ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    display_name: userMap.get(p.user_id as string) ?? "알수없음",
    comments: commentsByPost[p.id as string] ?? [],
    comment_count: (commentsByPost[p.id as string] ?? []).length,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const isAdmin = session.role === "admin";
  if (!isAdmin && !(await assertMember(supabase, id, session.userId))) {
    return NextResponse.json({ error: "그룹 멤버만 글을 작성할 수 있습니다" }, { status: 403 });
  }

  const { content, images } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });

  const { data, error } = await supabase
    .from("growth_group_posts")
    .insert({
      group_id: id,
      user_id: session.userId,
      content: content.trim(),
      images: images ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, display_name: session.displayName, comments: [], comment_count: 0 }, { status: 201 });
}

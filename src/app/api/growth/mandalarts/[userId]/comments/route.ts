import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// Find the active mandalart id for a user
async function findMandalartId(supabase: ReturnType<typeof createServerClient>, userId: string, cohortId?: string | null) {
  let q = supabase
    .from("growth_mandalarts")
    .select("id")
    .eq("user_id", userId);
  if (cohortId) q = q.eq("cohort_id", cohortId);
  const { data } = await q.order("updated_at", { ascending: false }).limit(1).single();
  return data?.id ?? null;
}

// GET /api/growth/mandalarts/[userId]/comments?cohort_id=xxx
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { userId } = await params;
  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohort_id");

  const supabase = createServerClient();
  const mandalartId = await findMandalartId(supabase, userId, cohortId);
  if (!mandalartId) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("growth_mandalart_comments")
    .select("*, users(display_name)")
    .eq("mandalart_id", mandalartId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const comments = (data ?? []).map((c: Record<string, unknown>) => {
    const u = c.users as { display_name: string } | null;
    return { ...c, users: undefined, display_name: u?.display_name ?? "알 수 없음" };
  });

  return NextResponse.json(comments);
}

// POST /api/growth/mandalarts/[userId]/comments
export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { userId } = await params;
  const body = await req.json();
  const { content, cohort_id } = body;

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
  }

  const supabase = createServerClient();
  const mandalartId = await findMandalartId(supabase, userId, cohort_id);
  if (!mandalartId) {
    return NextResponse.json({ error: "만다라트가 없습니다" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("growth_mandalart_comments")
    .insert({ mandalart_id: mandalartId, user_id: session.userId, content: content.trim() })
    .select("*, users(display_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const u = (data as Record<string, unknown>).users as { display_name: string } | null;
  return NextResponse.json({ ...data, users: undefined, display_name: u?.display_name ?? session.displayName });
}

// DELETE /api/growth/mandalarts/[userId]/comments?comment_id=xxx
export async function DELETE(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("comment_id");
  if (!commentId) return NextResponse.json({ error: "comment_id 필요" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase
    .from("growth_mandalart_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", session.userId); // only own comments

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

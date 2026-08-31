import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// 로그인 세션(JWT)의 role은 role 변경 후 재로그인 전까지 stale할 수 있어
// DB에서 최신 role을 다시 확인한다.
async function isAdminUser(supabase: ReturnType<typeof createServerClient>, userId: string, sessionRole: string) {
  const { data: dbUser } = await supabase.from("users").select("role").eq("id", userId).single();
  const rawRole = (dbUser as { role?: string } | null)?.role;
  return rawRole === "admin" || (rawRole === undefined && sessionRole === "admin");
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();
  if (!(await isAdminUser(supabase, session.userId, session.role))) {
    return NextResponse.json({ error: "관리자 전용" }, { status: 403 });
  }

  const { id } = await params;
  const { status, admin_reply } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (status && (status === "open" || status === "resolved")) {
    updateData.status = status;
  }
  if (admin_reply !== undefined) {
    updateData.admin_reply = admin_reply?.trim() || null;
    updateData.replied_by = session.userId;
    updateData.replied_at = new Date().toISOString();
  }
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없습니다" }, { status: 400 });
  }
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("growth_suggestions")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  if (!(await isAdminUser(supabase, session.userId, session.role))) {
    const { data: existing } = await supabase
      .from("growth_suggestions")
      .select("user_id")
      .eq("id", id)
      .single();
    if (!existing || existing.user_id !== session.userId) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }
  }

  const { error } = await supabase.from("growth_suggestions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

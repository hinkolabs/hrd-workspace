import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies, hashPassword } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.username !== undefined) updates.username = body.username.trim();
    if (body.display_name !== undefined) updates.display_name = body.display_name.trim();
    if (body.dept !== undefined) updates.dept = body.dept?.trim() || null;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.password) updates.password_hash = await hashPassword(body.password);
    if (body.role !== undefined) {
      // Self-demotion guard: admin cannot change their own role
      if (id === session.userId) {
        return NextResponse.json({ error: "자기 자신의 권한은 변경할 수 없습니다" }, { status: 400 });
      }
      updates.role = body.role === "admin" ? "admin" : "member";
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "변경할 내용이 없습니다" }, { status: 400 });
    }

    const supabase = createServerClient();

    if (updates.username) {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("username", updates.username)
        .neq("id", id)
        .single();
      if (existing) {
        return NextResponse.json({ error: "이미 존재하는 아이디입니다" }, { status: 409 });
      }
    }

    // role 컬럼이 DB에 존재하는지 사전 확인 (없으면 update에서 제외)
    let roleColumnMissing = false;
    if (updates.role !== undefined) {
      const { data: sample, error: sampleErr } = await supabase
        .from("users")
        .select("*")
        .limit(1)
        .maybeSingle();
      const hasRoleCol = !!(sample && Object.prototype.hasOwnProperty.call(sample, "role"));
      if (!hasRoleCol && !sampleErr) {
        delete updates.role;
        roleColumnMissing = true;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        error: "DB에 role 컬럼이 없어 권한을 변경할 수 없습니다. /growth-setup.html의 SQL을 실행한 뒤 다시 시도하세요.",
        roleSkipped: true,
      }, { status: 400 });
    }

    let { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select("id, username, display_name, dept, is_active, role, created_at")
      .single();

    if (error && (error.message.includes("role") || error.message.includes("dept") || error.code === "42703" || error.code === "PGRST204")) {
      // Some columns (role / dept) may not exist yet — retry without them
      const safeUpdates: Record<string, unknown> = { ...updates };
      delete safeUpdates.role;
      delete safeUpdates.dept;
      roleColumnMissing = true;
      const fallback = await supabase
        .from("users")
        .update(safeUpdates)
        .eq("id", id)
        .select("id, username, display_name, is_active, created_at")
        .single();
      data = fallback.data ? { ...fallback.data, role: "admin", dept: null } : null;
      error = fallback.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ...data, roleSkipped: roleColumnMissing });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });

  const { id } = await params;

  if (session.userId === id) {
    return NextResponse.json({ error: "자기 자신은 삭제할 수 없습니다" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

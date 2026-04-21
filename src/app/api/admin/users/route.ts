import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies, hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });

  const supabase = createServerClient();

  // Try with role column. If the migration hasn't been run yet, fall back gracefully.
  let { data, error } = await supabase
    .from("users")
    .select("id, username, display_name, is_active, role, created_at")
    .order("created_at", { ascending: true });

  if (error && (error.message.includes("role") || error.code === "42703")) {
    // role column does not exist yet — select without it and default to 'admin'
    const fallback = await supabase
      .from("users")
      .select("id, username, display_name, is_active, created_at")
      .order("created_at", { ascending: true });
    data = (fallback.data ?? []).map((u) => ({ ...u, role: "admin" as const }));
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });

  try {
    const { username, display_name, password, role } = await req.json();

    if (!username?.trim() || !display_name?.trim()) {
      return NextResponse.json({ error: "아이디와 이름을 입력하세요" }, { status: 400 });
    }

    const safeRole = role === "admin" ? "admin" : "member";

    const supabase = createServerClient();

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: "이미 존재하는 아이디입니다" }, { status: 409 });
    }

    const hash = await hashPassword(password || DEFAULT_PASSWORD);

    // Insert without role first to check if column exists
    const insertPayload: Record<string, unknown> = {
      username: username.trim(),
      password_hash: hash,
      display_name: display_name.trim(),
      is_active: true,
      role: safeRole,
    };

    let { data, error } = await supabase
      .from("users")
      .insert(insertPayload)
      .select("id, username, display_name, is_active, role, created_at")
      .single();

    if (error && (error.message.includes("role") || error.code === "42703")) {
      // role column not migrated yet — insert without role
      const { role: _r, ...payloadWithoutRole } = insertPayload;
      void _r;
      const fallback = await supabase
        .from("users")
        .insert(payloadWithoutRole)
        .select("id, username, display_name, is_active, created_at")
        .single();
      data = fallback.data ? { ...fallback.data, role: safeRole } : null;
      error = fallback.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

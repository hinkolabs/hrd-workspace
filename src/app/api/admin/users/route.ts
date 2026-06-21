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

  // Try with role + dept columns; fall back gracefully if not yet migrated
  let { data, error } = await supabase
    .from("users")
    .select("id, username, display_name, dept, is_active, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    const msg = error.message ?? "";
    const isColErr = error.code === "42703" || error.code === "PGRST204" || msg.includes("role") || msg.includes("dept");
    if (isColErr) {
      // Try without dept first
      const noDept = await supabase
        .from("users")
        .select("id, username, display_name, is_active, role, created_at")
        .order("created_at", { ascending: true });

      if (noDept.error && (noDept.error.message.includes("role") || noDept.error.code === "42703")) {
        // Neither role nor dept exist
        const base = await supabase
          .from("users")
          .select("id, username, display_name, is_active, created_at")
          .order("created_at", { ascending: true });
        data = (base.data ?? []).map((u) => ({ ...u, role: "admin" as const, dept: null }));
        error = base.error;
      } else {
        data = (noDept.data ?? []).map((u) => ({ ...u, dept: null }));
        error = noDept.error;
      }
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });

  try {
    const { username, display_name, dept, password, role } = await req.json();

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

    const insertPayload: Record<string, unknown> = {
      username: username.trim(),
      password_hash: hash,
      display_name: display_name.trim(),
      dept: dept?.trim() || null,
      is_active: true,
      role: safeRole,
    };

    let { data, error } = await supabase
      .from("users")
      .insert(insertPayload)
      .select("id, username, display_name, dept, is_active, role, created_at")
      .single();

    if (error) {
      const msg = error.message ?? "";
      const isColErr = error.code === "42703" || error.code === "PGRST204" || msg.includes("role") || msg.includes("dept");
      if (isColErr) {
        // Progressively strip unknown columns and retry
        const { role: _r, dept: _d, ...base } = insertPayload;
        void _r; void _d;

        // Try with role only (no dept)
        const withRole = { ...base, role: safeRole };
        const r2 = await supabase.from("users").insert(withRole)
          .select("id, username, display_name, is_active, role, created_at").single();

        if (r2.error && (r2.error.message.includes("role") || r2.error.code === "42703")) {
          // Try without role and dept
          const r3 = await supabase.from("users").insert(base)
            .select("id, username, display_name, is_active, created_at").single();
          data = r3.data ? { ...r3.data, role: safeRole, dept: null } : null;
          error = r3.error;
        } else {
          data = r2.data ? { ...r2.data, dept: null } : null;
          error = r2.error;
        }
      }
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

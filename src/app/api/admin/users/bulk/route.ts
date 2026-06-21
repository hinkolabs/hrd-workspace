import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies, hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}

type BulkUserRow = {
  username: string;
  display_name: string;
  dept?: string | null;
  password?: string;
  role?: string;
};

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });

  let rows: BulkUserRow[];
  try {
    rows = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다" }, { status: 400 });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "등록할 사용자 데이터가 없습니다" }, { status: 400 });
  }

  if (rows.length > 500) {
    return NextResponse.json({ error: "한 번에 최대 500명까지 등록할 수 있습니다" }, { status: 400 });
  }

  const supabase = createServerClient();
  const results: { row: number; username: string; status: "success" | "error"; message?: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const username = row.username?.toString().trim();
    const display_name = row.display_name?.toString().trim();

    if (!username || !display_name) {
      results.push({ row: i + 1, username: username || "(없음)", status: "error", message: "아이디와 이름은 필수입니다" });
      continue;
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (existing) {
      results.push({ row: i + 1, username, status: "error", message: "이미 존재하는 아이디입니다" });
      continue;
    }

    const safeRole = row.role === "admin" ? "admin" : "member";
    const hash = await hashPassword(row.password?.trim() || DEFAULT_PASSWORD);

    const insertPayload: Record<string, unknown> = {
      username,
      password_hash: hash,
      display_name,
      dept: row.dept?.toString().trim() || null,
      is_active: true,
      role: safeRole,
    };

    let { error } = await supabase.from("users").insert(insertPayload);

    if (error) {
      const msg = error.message ?? "";
      const isColErr = error.code === "42703" || error.code === "PGRST204" || msg.includes("role") || msg.includes("dept");
      if (isColErr) {
        const { role: _r, dept: _d, ...base } = insertPayload;
        void _r; void _d;
        const withRole = { ...base, role: safeRole };
        const r2 = await supabase.from("users").insert(withRole);
        if (r2.error && (r2.error.message.includes("role") || r2.error.code === "42703")) {
          const r3 = await supabase.from("users").insert(base);
          error = r3.error;
        } else {
          error = r2.error;
        }
      }
    }

    if (error) {
      results.push({ row: i + 1, username, status: "error", message: error.message });
    } else {
      results.push({ row: i + 1, username, status: "success" });
    }
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ results, successCount, errorCount }, { status: 200 });
}

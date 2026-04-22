import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// 기수 개념 숨김 이후: 전체 users 목록을 반환 (기존 호출자 호환)
export async function GET(_req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, display_name, dept")
    .order("display_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const flat = (data ?? []).map((u: Record<string, unknown>) => ({
    id: u.id,
    cohort_id: null,
    user_id: u.id,
    role: "member",
    dept: u.dept ?? "",
    display_name: u.display_name ?? "",
    username: u.username ?? "",
  }));

  return NextResponse.json(flat);
}

export async function PUT(_req: Request) {
  return NextResponse.json({ error: "기수 기능은 더 이상 사용되지 않습니다" }, { status: 410 });
}

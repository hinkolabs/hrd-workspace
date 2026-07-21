import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies, createSessionToken, getSessionCookieOptions } from "@/lib/auth";

export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { displayName } = await req.json();
  const trimmed = typeof displayName === "string" ? displayName.trim() : "";

  if (!trimmed) {
    return NextResponse.json({ error: "닉네임을 입력하세요" }, { status: 400 });
  }
  if (trimmed.length > 30) {
    return NextResponse.json({ error: "닉네임은 30자 이하여야 합니다" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: user, error } = await supabase
    .from("users")
    .update({ display_name: trimmed })
    .eq("id", session.userId)
    .select("id, username, display_name, role")
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "닉네임 변경 실패" }, { status: 500 });
  }

  const role: "admin" | "member" =
    user.role === "admin" ? "admin" : user.role === "member" ? "member" : session.role;

  // JWT에 저장된 닉네임도 갱신
  const token = await createSessionToken(user.id, user.username, user.display_name, role);
  const cookieOpts = getSessionCookieOptions(false);
  const cookieStore = await cookies();
  cookieStore.set(cookieOpts.name, token, cookieOpts);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, username: user.username, displayName: user.display_name, role },
  });
}

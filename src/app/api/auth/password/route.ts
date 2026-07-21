import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies, hashPassword, verifyPassword } from "@/lib/auth";

export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "현재 비밀번호와 새 비밀번호를 모두 입력하세요" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: user } = await supabase
    .from("users")
    .select("password_hash")
    .eq("id", session.userId)
    .single();

  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });

  const isValid = await verifyPassword(currentPassword, user.password_hash);
  if (!isValid) return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다" }, { status: 400 });

  const newHash = await hashPassword(newPassword);
  const { error } = await supabase
    .from("users")
    .update({ password_hash: newHash })
    .eq("id", session.userId);

  if (error) return NextResponse.json({ error: "비밀번호 변경 실패" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

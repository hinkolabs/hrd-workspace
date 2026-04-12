import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { verifyPassword, createSessionToken, getSessionCookieOptions } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { username, password, remember } = await req.json();

    if (!username?.trim() || !password) {
      return NextResponse.json({ error: "아이디와 비밀번호를 입력하세요" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username.trim())
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다" }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: "비활성화된 계정입니다. 관리자에게 문의하세요" }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다" }, { status: 401 });
    }

    const token = await createSessionToken(user.id, user.username, user.display_name, !!remember);
    const cookieOpts = getSessionCookieOptions(!!remember);

    const cookieStore = await cookies();
    cookieStore.set(cookieOpts.name, token, cookieOpts);

    return NextResponse.json({
      user: { id: user.id, username: user.username, displayName: user.display_name },
    });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

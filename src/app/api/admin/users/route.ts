import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies, hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, display_name, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  try {
    const { username, display_name, password } = await req.json();

    if (!username?.trim() || !display_name?.trim()) {
      return NextResponse.json({ error: "아이디와 이름을 입력하세요" }, { status: 400 });
    }

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
    const { data, error } = await supabase
      .from("users")
      .insert({
        username: username.trim(),
        password_hash: hash,
        display_name: display_name.trim(),
        is_active: true,
      })
      .select("id, username, display_name, is_active, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

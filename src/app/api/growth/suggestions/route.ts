import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_suggestions")
    .select("*, replied_by_user:replied_by(display_name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (data ?? []).map((row: Record<string, unknown>) => {
    const repliedByUser = row.replied_by_user as { display_name: string } | null;
    return {
      ...row,
      replied_by_user: undefined,
      replied_by_name: repliedByUser?.display_name ?? null,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_suggestions")
    .insert({
      user_id: session.userId,
      sender_name: session.displayName,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

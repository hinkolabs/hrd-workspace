import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohort_id");

  const supabase = createServerClient();
  let query = supabase
    .from("growth_chat_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(300);

  // cohort_id가 있으면 해당 기수만, 없으면 전체 메시지 반환
  if (cohortId) query = query.eq("cohort_id", cohortId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { cohort_id, content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
  }

  const supabase = createServerClient();
  const insertData: Record<string, unknown> = {
    user_id: session.userId,
    sender_name: session.displayName,
    content: content.trim(),
  };
  if (cohort_id) insertData.cohort_id = cohort_id;

  const { data, error } = await supabase
    .from("growth_chat_messages")
    .insert(insertData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

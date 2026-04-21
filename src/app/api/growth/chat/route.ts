import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohort_id");
  if (!cohortId) return NextResponse.json({ error: "cohort_id 필요" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_chat_messages")
    .select("*")
    .eq("cohort_id", cohortId)
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { cohort_id, content } = await req.json();
  if (!cohort_id || !content?.trim()) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_chat_messages")
    .insert({
      cohort_id,
      user_id: session.userId,
      sender_name: session.displayName,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

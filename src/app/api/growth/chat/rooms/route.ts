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
    .from("growth_chat_rooms")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (cohortId) {
    query = query.eq("cohort_id", cohortId);
  } else {
    query = query.is("cohort_id", null);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();
  if (userRow?.role !== "admin") return NextResponse.json({ error: "관리자 전용" }, { status: 403 });

  const body = await req.json();
  const { name, description, cohort_id, is_default } = body;
  if (!name?.trim()) return NextResponse.json({ error: "채팅방 이름 필요" }, { status: 400 });

  const { data, error } = await supabase
    .from("growth_chat_rooms")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      cohort_id: cohort_id || null,
      created_by: session.userId,
      is_default: is_default ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();
  if (userRow?.role !== "admin") return NextResponse.json({ error: "관리자 전용" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("id");
  if (!roomId) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const { error } = await supabase.from("growth_chat_rooms").delete().eq("id", roomId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

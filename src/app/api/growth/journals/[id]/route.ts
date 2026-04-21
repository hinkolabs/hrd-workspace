import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("growth_journals")
    .select("*, users(display_name)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  if (data.visibility === "private" && data.user_id !== session.userId) {
    return NextResponse.json({ error: "접근 권한 없음" }, { status: 403 });
  }

  const u = data.users as { display_name: string } | null;
  return NextResponse.json({ ...data, users: undefined, display_name: u?.display_name ?? "" });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("growth_journals")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existing || existing.user_id !== session.userId) {
    return NextResponse.json({ error: "수정 권한 없음" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("growth_journals")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("growth_journals")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existing || existing.user_id !== session.userId) {
    return NextResponse.json({ error: "삭제 권한 없음" }, { status: 403 });
  }

  await supabase.from("growth_journals").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}

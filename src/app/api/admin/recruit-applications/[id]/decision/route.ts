import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 전용" }, { status: 403 });

  const { id } = await params;
  const { decision, note, reopen } = await req.json();
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision 값이 올바르지 않습니다" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: application, error: appErr } = await supabase
    .from("growth_recruit_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (appErr || !application) {
    return NextResponse.json({ error: "신청 내역을 찾을 수 없습니다" }, { status: 404 });
  }
  if (application.status !== "pending") {
    return NextResponse.json({ error: "이미 처리된 신청입니다" }, { status: 409 });
  }

  const { error: updateAppErr } = await supabase
    .from("growth_recruit_applications")
    .update({
      status: decision,
      reviewed_by: session.userId,
      review_note: note?.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateAppErr) return NextResponse.json({ error: updateAppErr.message }, { status: 500 });

  const { data: recruit } = await supabase
    .from("growth_recruits")
    .select("*")
    .eq("id", application.recruit_id)
    .single();

  if (decision === "rejected") {
    await supabase
      .from("growth_recruits")
      .update({ status: reopen ? "open" : "rejected", updated_at: new Date().toISOString() })
      .eq("id", application.recruit_id);
    return NextResponse.json({ ok: true, decision });
  }

  // approved → create group + members from participant snapshot
  await supabase
    .from("growth_recruits")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", application.recruit_id);

  const { data: group, error: groupErr } = await supabase
    .from("growth_groups")
    .insert({
      application_id: application.id,
      name: recruit?.title ?? "새 그룹",
      description: recruit?.description ?? null,
      created_by: session.userId,
    })
    .select()
    .single();

  if (groupErr) return NextResponse.json({ error: groupErr.message }, { status: 500 });

  const participants: { user_id: string; display_name: string }[] = application.participants ?? [];
  const organizerId: string | undefined = recruit?.organizer_id;
  const memberRows = participants.map((p) => ({
    group_id: group.id,
    user_id: p.user_id,
    role: p.user_id === organizerId ? "leader" : "member",
  }));

  if (memberRows.length > 0) {
    const { error: memberErr } = await supabase.from("growth_group_members").insert(memberRows);
    if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, decision, group });
}

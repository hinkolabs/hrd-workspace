import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const { answers } = await req.json();

  const supabase = createServerClient();

  const { data: recruit, error: recruitErr } = await supabase
    .from("growth_recruits")
    .select("*")
    .eq("id", id)
    .single();

  if (recruitErr || !recruit) {
    return NextResponse.json({ error: "모집 정보를 찾을 수 없습니다" }, { status: 404 });
  }
  if (recruit.organizer_id !== session.userId) {
    return NextResponse.json({ error: "모집을 시작한 사람만 신청할 수 있습니다" }, { status: 403 });
  }
  if (recruit.status !== "open") {
    return NextResponse.json({ error: "이미 신청되었거나 처리된 모집입니다" }, { status: 409 });
  }

  // required field validation
  const { data: fields } = await supabase
    .from("growth_recruit_form_fields")
    .select("*")
    .order("order_idx", { ascending: true });

  const safeAnswers: Record<string, string> = answers ?? {};
  for (const f of fields ?? []) {
    if (f.required && !safeAnswers[f.id]?.toString().trim()) {
      return NextResponse.json({ error: `"${f.label}" 항목을 입력해주세요` }, { status: 400 });
    }
  }

  const { data: signups } = await supabase
    .from("growth_chat_signups")
    .select("user_id, display_name")
    .eq("message_id", recruit.message_id);

  const participantMap = new Map<string, { user_id: string; display_name: string }>();
  participantMap.set(session.userId, { user_id: session.userId, display_name: session.displayName });
  (signups ?? []).forEach((s: { user_id: string; display_name: string }) => {
    participantMap.set(s.user_id, s);
  });
  const participants = Array.from(participantMap.values());

  const { data: application, error: appErr } = await supabase
    .from("growth_recruit_applications")
    .insert({
      recruit_id: id,
      submitted_by: session.userId,
      answers: safeAnswers,
      participants,
      status: "pending",
    })
    .select()
    .single();

  if (appErr) return NextResponse.json({ error: appErr.message }, { status: 500 });

  await supabase.from("growth_recruits").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json(application, { status: 201 });
}

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id") ?? session.userId;
  const cohortId = searchParams.get("cohort_id");
  const month = searchParams.get("month");

  const supabase = createServerClient();
  let query = supabase
    .from("growth_retros")
    .select("*")
    .eq("user_id", userId)
    .order("month", { ascending: false });

  if (cohortId) query = query.eq("cohort_id", cohortId);
  if (month) query = query.eq("month", month);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = await req.json();
  const { cohort_id, month, achievements, learnings, next_goals } = body;

  if (!cohort_id || !month) {
    return NextResponse.json({ error: "기수와 월은 필수입니다" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_retros")
    .upsert(
      {
        user_id: session.userId,
        cohort_id,
        month,
        achievements: achievements ?? "",
        learnings: learnings ?? "",
        next_goals: next_goals ?? "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,cohort_id,month" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// Mentor feedback (mentor or admin only)
export async function PATCH(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id, mentor_feedback } = await req.json();
  const supabase = createServerClient();

  // Find the retro to get its cohort_id, then verify the caller is mentor/admin
  const { data: retro } = await supabase
    .from("growth_retros")
    .select("cohort_id")
    .eq("id", id)
    .single();

  if (!retro) return NextResponse.json({ error: "회고를 찾을 수 없습니다" }, { status: 404 });

  // Global admin bypasses cohort role check
  if (session.role !== "admin") {
    const { data: membership } = await supabase
      .from("growth_members")
      .select("role")
      .eq("user_id", session.userId)
      .eq("cohort_id", retro.cohort_id)
      .single();

    if (!membership || (membership.role !== "mentor" && membership.role !== "admin")) {
      return NextResponse.json({ error: "멘토 또는 관리자만 피드백을 작성할 수 있습니다" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("growth_retros")
    .update({ mentor_feedback, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

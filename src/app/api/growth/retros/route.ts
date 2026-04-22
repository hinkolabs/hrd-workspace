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

  if (!month) {
    return NextResponse.json({ error: "월은 필수입니다" }, { status: 400 });
  }

  const upsertData: Record<string, unknown> = {
    user_id: session.userId,
    month,
    achievements: achievements ?? "",
    learnings: learnings ?? "",
    next_goals: next_goals ?? "",
    updated_at: new Date().toISOString(),
  };
  if (cohort_id) upsertData.cohort_id = cohort_id;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_retros")
    .upsert(upsertData, { onConflict: "user_id,month" })
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

  // Global admin만 허용 (cohort 멘토 개념 제거)
  if (session.role !== "admin") {
    return NextResponse.json({ error: "관리자만 피드백을 작성할 수 있습니다" }, { status: 403 });
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

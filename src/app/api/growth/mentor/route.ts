import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// GET: List threads for current user (trainee sees own, admin sees all)
export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohort_id");

  const supabase = createServerClient();

  // Global admin sees all threads; others see own
  const isAdmin = session.role === "admin";
  const showAll = searchParams.get("all") === "true";

  let query = supabase
    .from("growth_mentor_threads")
    .select("*")
    .order("created_at", { ascending: false });

  if (cohortId) query = query.eq("cohort_id", cohortId);

  if (!showAll || !isAdmin) {
    query = query.eq("trainee_id", session.userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with user names
  const threads = await Promise.all(
    (data ?? []).map(async (t: Record<string, unknown>) => {
      const [traineeRes, mentorRes] = await Promise.all([
        t.trainee_id
          ? supabase.from("users").select("display_name").eq("id", t.trainee_id).single()
          : Promise.resolve({ data: null }),
        t.mentor_id
          ? supabase.from("users").select("display_name").eq("id", t.mentor_id).single()
          : Promise.resolve({ data: null }),
      ]);

      const lastMsg = await supabase
        .from("growth_mentor_messages")
        .select("content, created_at")
        .eq("thread_id", t.id as string)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...t,
        trainee_name: (traineeRes.data as { display_name: string } | null)?.display_name ?? "",
        mentor_name: (mentorRes.data as { display_name: string } | null)?.display_name ?? "미배정",
        last_message: lastMsg.data?.content ?? null,
        last_message_at: lastMsg.data?.created_at ?? null,
      };
    })
  );

  return NextResponse.json(threads);
}

// POST: Create thread (trainee creates own, or admin creates for any trainee)
export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { cohort_id, trainee_id, mentor_id } = await req.json();
  const supabase = createServerClient();

  const finalTraineeId = trainee_id ?? session.userId;

  // Check if thread already exists for this trainee
  let existingQuery = supabase
    .from("growth_mentor_threads")
    .select("id")
    .eq("trainee_id", finalTraineeId);
  if (cohort_id) existingQuery = existingQuery.eq("cohort_id", cohort_id);
  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) return NextResponse.json(existing);

  const insertData: Record<string, unknown> = {
    trainee_id: finalTraineeId,
    mentor_id: mentor_id ?? null,
  };
  if (cohort_id) insertData.cohort_id = cohort_id;

  const { data, error } = await supabase
    .from("growth_mentor_threads")
    .insert(insertData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

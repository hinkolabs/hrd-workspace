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
    .from("growth_members")
    .select("id, cohort_id, user_id, role, dept, users(display_name, username)")
    .order("dept");

  if (cohortId) query = query.eq("cohort_id", cohortId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const flat = (data ?? []).map((m: Record<string, unknown>) => {
    const u = m.users as { display_name: string; username: string } | null;
    return {
      id: m.id,
      cohort_id: m.cohort_id,
      user_id: m.user_id,
      role: m.role,
      dept: m.dept,
      display_name: u?.display_name ?? "",
      username: u?.username ?? "",
    };
  });

  return NextResponse.json(flat);
}

export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id, ...updates } = await req.json();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_members")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

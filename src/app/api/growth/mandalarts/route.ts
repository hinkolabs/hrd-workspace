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
    .from("growth_mandalarts")
    .select("*, users(display_name)")
    .or(`visibility.eq.cohort,user_id.eq.${session.userId}`)
    .order("updated_at", { ascending: false });

  if (cohortId) query = query.eq("cohort_id", cohortId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((m: Record<string, unknown>) => {
      const u = m.users as { display_name: string } | null;
      return { ...m, users: undefined, display_name: u?.display_name ?? "" };
    })
  );
}

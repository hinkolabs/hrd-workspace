import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// GET /api/growth/me?cohort_id=xxx
// Returns the current user's role in the given cohort.
// Global admins are automatically treated as mentors everywhere.
export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const isGlobalAdmin = session.role === "admin";
  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohort_id");

  if (!cohortId) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("growth_members")
      .select("cohort_id, role, dept, growth_cohorts(name, status)")
      .eq("user_id", session.userId);

    return NextResponse.json({
      userId: session.userId,
      globalRole: session.role,
      memberships: data ?? [],
    });
  }

  const supabase = createServerClient();
  const { data } = await supabase
    .from("growth_members")
    .select("role, dept")
    .eq("user_id", session.userId)
    .eq("cohort_id", cohortId)
    .single();

  // Global admin is always a mentor regardless of cohort membership
  const effectiveRole = isGlobalAdmin
    ? (data?.role ?? "admin")   // use existing cohort role if present, else 'admin'
    : (data?.role ?? null);

  const isMember = isGlobalAdmin || !!data;
  const isMentor = isGlobalAdmin || effectiveRole === "mentor" || effectiveRole === "admin";
  const isAdmin = isGlobalAdmin || effectiveRole === "admin";

  return NextResponse.json({
    userId: session.userId,
    cohortId,
    role: effectiveRole,
    dept: data?.dept ?? null,
    isMember,
    isTrainee: !isMentor && isMember,
    isMentor,
    isAdmin,
  });
}

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(_req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();

  // 전체 신입 사원 수 (role='member' 또는 전체 users — 여기서는 전체 user 수 사용)
  const { count: totalMembers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  // This week's journals
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const { data: weekJournals } = await supabase
    .from("growth_journals")
    .select("user_id")
    .gte("created_at", weekStart.toISOString());

  const weekWriters = new Set((weekJournals ?? []).map((j: { user_id: string }) => j.user_id));

  // Total journals this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: monthJournalCount } = await supabase
    .from("growth_journals")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthStart.toISOString());

  // Top reacted journals (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentJournals } = await supabase
    .from("growth_journals")
    .select("id, title, user_id, created_at, users(display_name)")
    .eq("visibility", "cohort")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  const jIds = (recentJournals ?? []).map((j: Record<string, unknown>) => j.id as string);
  const reactionCounts: Record<string, number> = {};
  if (jIds.length > 0) {
    const { data: rxns } = await supabase
      .from("growth_reactions")
      .select("target_id")
      .eq("target_type", "journal")
      .in("target_id", jIds);
    (rxns ?? []).forEach((r: { target_id: string }) => {
      reactionCounts[r.target_id] = (reactionCounts[r.target_id] ?? 0) + 1;
    });
  }

  const topJournals = (recentJournals ?? [])
    .map((j: Record<string, unknown>) => {
      const u = j.users as { display_name: string } | null;
      return {
        id: j.id,
        title: j.title,
        display_name: u?.display_name ?? "",
        reaction_count: reactionCounts[j.id as string] ?? 0,
        created_at: j.created_at,
      };
    })
    .sort((a, b) => b.reaction_count - a.reaction_count)
    .slice(0, 3);

  // Members without journal this week (전체 user 기준)
  const { data: allUsers } = await supabase.from("users").select("id, display_name");

  const nonWriters = (allUsers ?? [])
    .filter((u: { id: string }) => !weekWriters.has(u.id))
    .map((u: { id: string; display_name: string }) => ({
      user_id: u.id,
      display_name: u.display_name ?? "",
    }));

  return NextResponse.json({
    total_members: totalMembers ?? 0,
    week_writers: weekWriters.size,
    week_participation_rate: totalMembers ? Math.round((weekWriters.size / totalMembers) * 100) : 0,
    month_journal_count: monthJournalCount ?? 0,
    top_journals: topJournals,
    non_writers_this_week: nonWriters,
  });
}

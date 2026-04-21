/**
 * Vercel Cron Job: 매주 월요일 09:00 KST
 * vercel.json: { "crons": [{ "path": "/api/cron/growth-weekly", "schedule": "0 0 * * 1" }] }
 * (UTC 00:00 = KST 09:00)
 *
 * 역할:
 * 1. 이번 주 미작성자 목록 집계 → 관리자 대시보드용 캐시 저장 (settings 테이블)
 * 2. 리액션 Top 3 하이라이트 업데이트
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  // Vercel cron authorization
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Get active cohorts
  const { data: cohorts } = await supabase
    .from("growth_cohorts")
    .select("id, name")
    .eq("status", "active");

  if (!cohorts || cohorts.length === 0) {
    return NextResponse.json({ ok: true, message: "활성 기수 없음" });
  }

  const results: Record<string, unknown>[] = [];

  for (const cohort of cohorts) {
    // This week's Monday
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    // Members
    const { data: members } = await supabase
      .from("growth_members")
      .select("user_id, users(display_name)")
      .eq("cohort_id", cohort.id)
      .eq("role", "trainee");

    // Writers this week
    const { data: weekJournals } = await supabase
      .from("growth_journals")
      .select("user_id")
      .eq("cohort_id", cohort.id)
      .gte("created_at", weekStart.toISOString());

    const writerIds = new Set((weekJournals ?? []).map((j: { user_id: string }) => j.user_id));

    const nonWriters = (members ?? [])
      .filter((m: Record<string, unknown>) => !writerIds.has(m.user_id as string))
      .map((m: Record<string, unknown>) => {
        const u = m.users as { display_name: string } | null;
        return { user_id: m.user_id, display_name: u?.display_name ?? "" };
      });

    const participationRate = members?.length
      ? Math.round((writerIds.size / members.length) * 100)
      : 0;

    // Top 3 journals last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentJournals } = await supabase
      .from("growth_journals")
      .select("id, title, user_id, users(display_name)")
      .eq("cohort_id", cohort.id)
      .eq("visibility", "cohort")
      .gte("created_at", thirtyDaysAgo.toISOString())
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

    const top3 = (recentJournals ?? [])
      .map((j: Record<string, unknown>) => {
        const u = j.users as { display_name: string } | null;
        return { id: j.id, title: j.title, display_name: u?.display_name ?? "", reaction_count: reactionCounts[j.id as string] ?? 0 };
      })
      .sort((a, b) => b.reaction_count - a.reaction_count)
      .slice(0, 3);

    // Save to settings table as JSON
    const key = `growth_weekly_${cohort.id}`;
    const value = JSON.stringify({
      week_start: weekStart.toISOString(),
      cohort_id: cohort.id,
      cohort_name: cohort.name,
      total_members: members?.length ?? 0,
      week_writers: writerIds.size,
      participation_rate: participationRate,
      non_writers: nonWriters,
      top3_journals: top3,
      updated_at: new Date().toISOString(),
    });

    await supabase.from("settings").upsert(
      { key, value },
      { onConflict: "key" }
    );

    results.push({ cohort_id: cohort.id, participation_rate: participationRate, non_writers_count: nonWriters.length });
  }

  return NextResponse.json({ ok: true, results });
}

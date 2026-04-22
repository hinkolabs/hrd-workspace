/**
 * Vercel Cron Job: 매주 월요일 09:00 KST
 * vercel.json: { "crons": [{ "path": "/api/cron/growth-weekly", "schedule": "0 0 * * 1" }] }
 * (UTC 00:00 = KST 09:00)
 *
 * 역할 (기수 개념 제거 후):
 * - 전체 사용자 대상으로 이번 주 미작성자, 참여율, Top 3 인기 일기 집계
 * - settings 테이블에 단일 키(growth_weekly)로 저장
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  // All users
  const { data: users } = await supabase.from("users").select("id, display_name");
  const totalMembers = users?.length ?? 0;

  // Writers this week
  const { data: weekJournals } = await supabase
    .from("growth_journals")
    .select("user_id")
    .gte("created_at", weekStart.toISOString());

  const writerIds = new Set((weekJournals ?? []).map((j: { user_id: string }) => j.user_id));

  const nonWriters = (users ?? [])
    .filter((u: { id: string }) => !writerIds.has(u.id))
    .map((u: { id: string; display_name: string }) => ({
      user_id: u.id,
      display_name: u.display_name ?? "",
    }));

  const participationRate = totalMembers ? Math.round((writerIds.size / totalMembers) * 100) : 0;

  // Top 3 journals last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentJournals } = await supabase
    .from("growth_journals")
    .select("id, title, user_id, users(display_name)")
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
      return {
        id: j.id,
        title: j.title,
        display_name: u?.display_name ?? "",
        reaction_count: reactionCounts[j.id as string] ?? 0,
      };
    })
    .sort((a, b) => b.reaction_count - a.reaction_count)
    .slice(0, 3);

  const value = JSON.stringify({
    week_start: weekStart.toISOString(),
    total_members: totalMembers,
    week_writers: writerIds.size,
    participation_rate: participationRate,
    non_writers: nonWriters,
    top3_journals: top3,
    updated_at: new Date().toISOString(),
  });

  await supabase.from("settings").upsert({ key: "growth_weekly", value }, { onConflict: "key" });

  return NextResponse.json({
    ok: true,
    participation_rate: participationRate,
    non_writers_count: nonWriters.length,
  });
}

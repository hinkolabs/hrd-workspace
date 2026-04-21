import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohort_id");
  const userId = searchParams.get("user_id");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const supabase = createServerClient();
  let query = supabase
    .from("growth_journals")
    .select("*, users(display_name)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (cohortId) query = query.eq("cohort_id", cohortId);
  if (userId) query = query.eq("user_id", userId);
  // Only show cohort-visible journals to others, private only to owner
  // MVP: server-side filter (visibility='cohort' OR user_id=session.userId)
  query = query.or(`visibility.eq.cohort,user_id.eq.${session.userId}`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach comment counts and reactions
  const ids = (data ?? []).map((j: Record<string, unknown>) => j.id as string);

  let commentCounts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: cc } = await supabase
      .from("growth_comments")
      .select("journal_id")
      .in("journal_id", ids);
    (cc ?? []).forEach((c: { journal_id: string }) => {
      commentCounts[c.journal_id] = (commentCounts[c.journal_id] ?? 0) + 1;
    });
  }

  let reactionMap: Record<string, Record<string, number>> = {};
  let myReactions: Record<string, string[]> = {};
  if (ids.length > 0) {
    const { data: rxn } = await supabase
      .from("growth_reactions")
      .select("target_id, emoji, user_id")
      .eq("target_type", "journal")
      .in("target_id", ids);
    (rxn ?? []).forEach((r: { target_id: string; emoji: string; user_id: string }) => {
      if (!reactionMap[r.target_id]) reactionMap[r.target_id] = {};
      reactionMap[r.target_id][r.emoji] = (reactionMap[r.target_id][r.emoji] ?? 0) + 1;
      if (r.user_id === session.userId) {
        if (!myReactions[r.target_id]) myReactions[r.target_id] = [];
        myReactions[r.target_id].push(r.emoji);
      }
    });
  }

  const result = (data ?? []).map((j: Record<string, unknown>) => {
    const u = j.users as { display_name: string } | null;
    const rxns = reactionMap[j.id as string] ?? {};
    return {
      ...j,
      users: undefined,
      display_name: u?.display_name ?? "",
      comment_count: commentCounts[j.id as string] ?? 0,
      reactions: Object.entries(rxns).map(([emoji, count]) => ({
        emoji,
        count,
        reacted: (myReactions[j.id as string] ?? []).includes(emoji),
      })),
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = await req.json();
  const { cohort_id, title, content, mood, images, week_of, visibility } = body;

  if (!cohort_id || !title?.trim()) {
    return NextResponse.json({ error: "기수와 제목은 필수입니다" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_journals")
    .insert({
      user_id: session.userId,
      cohort_id,
      title: title.trim(),
      content: content ?? "",
      mood: mood ?? null,
      images: images ?? [],
      week_of: week_of ?? null,
      visibility: visibility ?? "cohort",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

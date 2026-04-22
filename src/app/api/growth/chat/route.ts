import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(_req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();
  const { data: messages, error } = await supabase
    .from("growth_chat_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const msgs = messages ?? [];
  const ids = msgs.map((m: { id: string }) => m.id);
  if (ids.length === 0) return NextResponse.json([]);

  // reactions
  const reactionMap: Record<string, Record<string, number>> = {};
  const myReactions: Record<string, Set<string>> = {};
  {
    const { data: rxns } = await supabase
      .from("growth_reactions")
      .select("target_id, emoji, user_id")
      .eq("target_type", "chat_message")
      .in("target_id", ids);
    (rxns ?? []).forEach((r: { target_id: string; emoji: string; user_id: string }) => {
      if (!reactionMap[r.target_id]) reactionMap[r.target_id] = {};
      reactionMap[r.target_id][r.emoji] = (reactionMap[r.target_id][r.emoji] ?? 0) + 1;
      if (r.user_id === session.userId) {
        if (!myReactions[r.target_id]) myReactions[r.target_id] = new Set();
        myReactions[r.target_id].add(r.emoji);
      }
    });
  }

  // signups (graceful if table not migrated)
  const signupsMap: Record<string, { user_id: string; display_name: string }[]> = {};
  {
    const { data: signups, error: sErr } = await supabase
      .from("growth_chat_signups")
      .select("message_id, user_id, display_name, created_at")
      .in("message_id", ids)
      .order("created_at", { ascending: true });
    if (!sErr) {
      (signups ?? []).forEach((s: { message_id: string; user_id: string; display_name: string }) => {
        if (!signupsMap[s.message_id]) signupsMap[s.message_id] = [];
        signupsMap[s.message_id].push({ user_id: s.user_id, display_name: s.display_name });
      });
    }
  }

  const enriched = msgs.map((m: Record<string, unknown>) => {
    const id = m.id as string;
    const rxns = reactionMap[id] ?? {};
    const mine = myReactions[id] ?? new Set<string>();
    return {
      ...m,
      reactions: Object.entries(rxns).map(([emoji, count]) => ({
        emoji,
        count,
        reacted: mine.has(emoji),
      })),
      signups: signupsMap[id] ?? [],
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { content, kind } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
  }

  const supabase = createServerClient();
  const insertData: Record<string, unknown> = {
    user_id: session.userId,
    sender_name: session.displayName,
    content: content.trim(),
  };
  if (kind === "recruit") insertData.kind = "recruit";

  let { data, error } = await supabase
    .from("growth_chat_messages")
    .insert(insertData)
    .select()
    .single();

  // fallback if kind column not migrated yet
  if (error && (error.code === "PGRST204" || error.code === "42703" || error.message.includes("kind"))) {
    delete insertData.kind;
    const retry = await supabase
      .from("growth_chat_messages")
      .insert(insertData)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

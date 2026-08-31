import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const isAdmin = session.role === "admin";
  if (!isAdmin) {
    const { data: member } = await supabase
      .from("growth_group_members")
      .select("id")
      .eq("group_id", id)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!member) return NextResponse.json({ error: "그룹 멤버만 볼 수 있습니다" }, { status: 403 });
  }

  const { data: members, error } = await supabase
    .from("growth_group_members")
    .select("*")
    .eq("group_id", id)
    .order("joined_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
  const { data: users } = userIds.length
    ? await supabase.from("users").select("id, display_name").in("id", userIds)
    : { data: [] };
  const userMap = new Map((users ?? []).map((u: { id: string; display_name: string }) => [u.id, u.display_name]));

  const enriched = (members ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    display_name: userMap.get(m.user_id as string) ?? "알수없음",
  }));

  return NextResponse.json(enriched);
}

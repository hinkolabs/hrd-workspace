import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// GET /api/growth/my-groups
// 로그인한 사용자가 속한 모집 승인 그룹(밴드형 게시판) 목록
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();

  const { data: memberships, error: memErr } = await supabase
    .from("growth_group_members")
    .select("group_id, role")
    .eq("user_id", session.userId);

  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });

  const groupIds = (memberships ?? []).map((m: { group_id: string }) => m.group_id);
  if (groupIds.length === 0) return NextResponse.json([]);

  const roleMap = new Map((memberships ?? []).map((m: { group_id: string; role: string }) => [m.group_id, m.role]));

  const { data: groups, error: groupErr } = await supabase
    .from("growth_groups")
    .select("*")
    .in("id", groupIds)
    .order("created_at", { ascending: false });

  if (groupErr) return NextResponse.json({ error: groupErr.message }, { status: 500 });

  const { data: allMembers } = await supabase
    .from("growth_group_members")
    .select("group_id")
    .in("group_id", groupIds);

  const countMap: Record<string, number> = {};
  (allMembers ?? []).forEach((m: { group_id: string }) => {
    countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1;
  });

  const enriched = (groups ?? []).map((g: { id: string }) => ({
    ...g,
    member_count: countMap[g.id] ?? 0,
    my_role: roleMap.get(g.id) ?? "member",
  }));

  return NextResponse.json(enriched);
}

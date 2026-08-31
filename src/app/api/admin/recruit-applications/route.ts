import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 전용" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const supabase = createServerClient();
  let query = supabase
    .from("growth_recruit_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data: applications, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const apps = applications ?? [];
  const recruitIds = Array.from(new Set(apps.map((a: { recruit_id: string }) => a.recruit_id)));
  const userIds = Array.from(new Set(apps.map((a: { submitted_by: string }) => a.submitted_by)));

  const [{ data: recruits }, { data: users }] = await Promise.all([
    recruitIds.length
      ? supabase.from("growth_recruits").select("*").in("id", recruitIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase.from("users").select("id, display_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const recruitMap = new Map((recruits ?? []).map((r: { id: string }) => [r.id, r]));
  const userMap = new Map((users ?? []).map((u: { id: string; display_name: string }) => [u.id, u.display_name]));

  const enriched = apps.map((a: Record<string, unknown>) => ({
    ...a,
    recruit: recruitMap.get(a.recruit_id as string) ?? null,
    submitted_by_name: userMap.get(a.submitted_by as string) ?? "알수없음",
  }));

  return NextResponse.json(enriched);
}

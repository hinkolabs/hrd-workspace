import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_guide_settings")
    .select("*")
    .is("cohort_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 테이블이 없거나 오류 시 빈 설정 반환 (graceful fallback)
  if (error) return NextResponse.json({ youtube_url: null, guide_text: null });
  return NextResponse.json(data ?? { youtube_url: null, guide_text: null });
}

export async function PATCH(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();
  if (userRow?.role !== "admin") return NextResponse.json({ error: "관리자 전용" }, { status: 403 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("youtube_url" in body) updates.youtube_url = body.youtube_url || null;
  if ("guide_text" in body) updates.guide_text = body.guide_text || null;

  // Upsert global settings (cohort_id = null)
  const { data: existing } = await supabase
    .from("growth_guide_settings")
    .select("id")
    .is("cohort_id", null)
    .limit(1)
    .maybeSingle();

  let result;
  if (existing?.id) {
    const { data, error } = await supabase
      .from("growth_guide_settings")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await supabase
      .from("growth_guide_settings")
      .insert({ ...updates, cohort_id: null })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

const EMPTY = { youtube_url: null, youtube_url_2: null, guide_text: null };

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
  if (error) return NextResponse.json(EMPTY);
  return NextResponse.json({
    ...EMPTY,
    ...(data ?? {}),
    youtube_url: data?.youtube_url ?? null,
    youtube_url_2: (data as { youtube_url_2?: string | null } | null)?.youtube_url_2 ?? null,
    guide_text: data?.guide_text ?? null,
  });
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
  if ("youtube_url_2" in body) updates.youtube_url_2 = body.youtube_url_2 || null;
  if ("guide_text" in body) updates.guide_text = body.guide_text || null;

  // Upsert global settings (cohort_id = null)
  const { data: existing } = await supabase
    .from("growth_guide_settings")
    .select("id")
    .is("cohort_id", null)
    .limit(1)
    .maybeSingle();

  async function save(payload: Record<string, unknown>) {
    if (existing?.id) {
      return supabase
        .from("growth_guide_settings")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
    }
    return supabase
      .from("growth_guide_settings")
      .insert({ ...payload, cohort_id: null })
      .select()
      .single();
  }

  let { data, error } = await save(updates);

  // youtube_url_2 컬럼이 아직 없으면 해당 필드 제외 후 재시도
  if (error && "youtube_url_2" in updates && (error.message ?? "").includes("youtube_url_2")) {
    const { youtube_url_2: _drop, ...rest } = updates;
    ({ data, error } = await save(rest));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

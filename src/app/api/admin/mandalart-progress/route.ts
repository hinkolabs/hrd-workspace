import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";
import { computeMandalartProgress } from "@/lib/mandalart-progress";

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}

// GET /api/admin/mandalart-progress — 실시간 만다라트 작성 현황
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const includeAdmins = searchParams.get("includeAdmins") === "1";

  const supabase = createServerClient();

  try {
    const rows = await computeMandalartProgress(supabase, { includeAdmins });
    return NextResponse.json({ rows, generated_at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "조회 실패" }, { status: 500 });
  }
}

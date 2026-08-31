import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}

// GET /api/admin/mandalart-progress/snapshots/[id] — 특정 시점에 고정 저장된 현황 조회
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data: batch, error: batchErr } = await supabase
    .from("growth_mandalart_snapshot_batches")
    .select("id, label, taken_at, created_by")
    .eq("id", id)
    .single();
  if (batchErr || !batch) return NextResponse.json({ error: "스냅샷을 찾을 수 없습니다" }, { status: 404 });

  const { data: rows, error: rowsErr } = await supabase
    .from("growth_mandalart_snapshot_rows")
    .select(
      "user_id, display_name, dept, has_mandalart, center_goal_filled, subgoal_filled_count, detail_filled_count, detail_done_count, mandalart_updated_at"
    )
    .eq("batch_id", id)
    .order("detail_filled_count", { ascending: true })
    .order("display_name", { ascending: true });
  if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 500 });

  return NextResponse.json({ batch, rows: rows ?? [] });
}

// DELETE /api/admin/mandalart-progress/snapshots/[id] — 잘못 찍은 스냅샷 삭제
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase.from("growth_mandalart_snapshot_batches").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

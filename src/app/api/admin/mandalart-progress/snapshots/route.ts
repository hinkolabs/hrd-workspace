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

// GET /api/admin/mandalart-progress/snapshots — 저장된 스냅샷 배치 목록
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });

  const supabase = createServerClient();

  const { data: batches, error } = await supabase
    .from("growth_mandalart_snapshot_batches")
    .select("id, label, taken_at, created_by")
    .order("taken_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const batchList = batches ?? [];
  if (batchList.length === 0) return NextResponse.json({ batches: [] });

  const { data: rowCounts } = await supabase
    .from("growth_mandalart_snapshot_rows")
    .select("batch_id")
    .in("batch_id", batchList.map((b) => b.id));

  const countMap = new Map<string, number>();
  for (const r of (rowCounts ?? []) as { batch_id: string }[]) {
    countMap.set(r.batch_id, (countMap.get(r.batch_id) ?? 0) + 1);
  }

  return NextResponse.json({
    batches: batchList.map((b) => ({ ...b, row_count: countMap.get(b.id) ?? 0 })),
  });
}

// POST /api/admin/mandalart-progress/snapshots — 지금 시점 상태를 스냅샷으로 고정 저장
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!label) return NextResponse.json({ error: "스냅샷 이름(라벨)을 입력하세요" }, { status: 400 });
  const includeAdmins = body?.includeAdmins === true;

  const supabase = createServerClient();

  let progress;
  try {
    progress = await computeMandalartProgress(supabase, { includeAdmins });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "현황 계산 실패" }, { status: 500 });
  }

  const { data: batch, error: batchErr } = await supabase
    .from("growth_mandalart_snapshot_batches")
    .insert({ label, created_by: session.userId })
    .select("id, label, taken_at")
    .single();
  if (batchErr || !batch) {
    return NextResponse.json({ error: batchErr?.message ?? "스냅샷 생성 실패" }, { status: 500 });
  }

  if (progress.length > 0) {
    const rows = progress.map((p) => ({
      batch_id: batch.id,
      user_id: p.user_id,
      display_name: p.display_name,
      dept: p.dept,
      has_mandalart: p.has_mandalart,
      center_goal_filled: p.center_goal_filled,
      subgoal_filled_count: p.subgoal_filled_count,
      detail_filled_count: p.detail_filled_count,
      detail_done_count: p.detail_done_count,
      mandalart_updated_at: p.mandalart_updated_at,
    }));

    const { error: rowsErr } = await supabase.from("growth_mandalart_snapshot_rows").insert(rows);
    if (rowsErr) {
      // 행 저장 실패 시 방금 만든 배치도 함께 롤백
      await supabase.from("growth_mandalart_snapshot_batches").delete().eq("id", batch.id);
      return NextResponse.json({ error: rowsErr.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { id: batch.id, label: batch.label, taken_at: batch.taken_at, row_count: progress.length },
    { status: 201 }
  );
}

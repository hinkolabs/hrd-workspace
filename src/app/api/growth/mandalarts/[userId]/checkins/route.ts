import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

type ItemType = "cell" | "todo";

// POST /api/growth/mandalarts/[userId]/checkins
// body: { item_type: 'cell'|'todo', item_id: string, period_key: string, rep_index: number, checked: boolean }
// 체크/해제 즉시 반영 — 별도 저장 버튼 없이 실시간 저장됨
export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { userId } = await params;
  if (userId !== session.userId) {
    return NextResponse.json({ error: "본인 만다라트만 체크할 수 있습니다" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { item_type, item_id, period_key, rep_index, checked } = body as {
    item_type?: ItemType;
    item_id?: string;
    period_key?: string;
    rep_index?: number;
    checked?: boolean;
  };

  if (
    (item_type !== "cell" && item_type !== "todo") ||
    typeof item_id !== "string" || !item_id ||
    typeof period_key !== "string" || !period_key ||
    typeof rep_index !== "number" ||
    typeof checked !== "boolean"
  ) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const supabase = createServerClient();

  // ── 소유권 검증: item이 실제로 이 userId의 만다라트에 속하는지 확인 ──────────
  let ownerUserId: string | null = null;
  if (item_type === "cell") {
    const { data: cell } = await supabase
      .from("growth_mandalart_cells")
      .select("id, mandalart_id, growth_mandalarts(user_id)")
      .eq("id", item_id)
      .single();
    const m = cell?.growth_mandalarts as unknown as { user_id: string } | { user_id: string }[] | null;
    ownerUserId = Array.isArray(m) ? m[0]?.user_id ?? null : m?.user_id ?? null;
  } else {
    const { data: todo } = await supabase
      .from("growth_mandalart_cell_todos")
      .select("id, cell_id, growth_mandalart_cells(mandalart_id, growth_mandalarts(user_id))")
      .eq("id", item_id)
      .single();
    const cellRel = todo?.growth_mandalart_cells as unknown as
      | { growth_mandalarts: { user_id: string } | { user_id: string }[] | null }
      | { growth_mandalarts: { user_id: string } | { user_id: string }[] | null }[]
      | null;
    const cellObj = Array.isArray(cellRel) ? cellRel[0] : cellRel;
    const m = cellObj?.growth_mandalarts;
    ownerUserId = Array.isArray(m) ? m[0]?.user_id ?? null : m?.user_id ?? null;
  }

  if (!ownerUserId || ownerUserId !== userId) {
    return NextResponse.json({ error: "본인 항목만 체크할 수 있습니다" }, { status: 403 });
  }

  if (checked) {
    const { error } = await supabase
      .from("growth_mandalart_checkins")
      .upsert(
        { item_type, item_id, period_key, rep_index },
        { onConflict: "item_type,item_id,period_key,rep_index", ignoreDuplicates: true }
      );
    if (error) {
      const missingTable = (error.message ?? "").toLowerCase().includes("growth_mandalart_checkins");
      return NextResponse.json(
        { error: missingTable ? "체크 이력 테이블이 없습니다. 관리자에게 마이그레이션 실행을 요청하세요." : error.message },
        { status: 500 }
      );
    }
  } else {
    const { error } = await supabase
      .from("growth_mandalart_checkins")
      .delete()
      .eq("item_type", item_type)
      .eq("item_id", item_id)
      .eq("period_key", period_key)
      .eq("rep_index", rep_index);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

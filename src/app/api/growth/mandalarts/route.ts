import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohort_id");

  const supabase = createServerClient();
  let query = supabase
    .from("growth_mandalarts")
    .select("*, users(display_name)")
    .or(`visibility.eq.cohort,user_id.eq.${session.userId}`)
    .order("updated_at", { ascending: false });

  if (cohortId) query = query.eq("cohort_id", cohortId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mandalarts = (data ?? []).map((m: Record<string, unknown>) => {
    const u = m.users as { display_name: string } | null;
    return { ...m, users: undefined, display_name: u?.display_name ?? "" };
  });

  // 서브목표 표시를 위해 block_idx=4 셀만 batch로 가져옴
  const ids = mandalarts.map((m) => (m as Record<string, unknown>).id as string);
  if (ids.length > 0) {
    const { data: cells } = await supabase
      .from("growth_mandalart_cells")
      .select("id, mandalart_id, block_idx, cell_idx, text, emoji, done")
      .in("mandalart_id", ids)
      .eq("block_idx", 4);

    const cellsByMandalart: Record<string, unknown[]> = {};
    for (const c of cells ?? []) {
      const cRec = c as Record<string, unknown>;
      const mid = cRec.mandalart_id as string;
      if (!cellsByMandalart[mid]) cellsByMandalart[mid] = [];
      cellsByMandalart[mid].push(cRec);
    }

    return NextResponse.json(
      mandalarts.map((m) => {
        const mRec = m as Record<string, unknown>;
        return { ...mRec, cells: cellsByMandalart[mRec.id as string] ?? [] };
      })
    );
  }

  return NextResponse.json(mandalarts.map((m) => ({ ...(m as Record<string, unknown>), cells: [] })));
}

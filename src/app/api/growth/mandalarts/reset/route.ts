import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { password } = await req.json();
  if (!password) return NextResponse.json({ error: "비밀번호를 입력하세요" }, { status: 400 });

  const supabase = createServerClient();

  // 비밀번호 검증
  const { data: user } = await supabase
    .from("users")
    .select("password_hash")
    .eq("id", session.userId)
    .single();

  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return NextResponse.json({ error: "비밀번호가 올바르지 않습니다" }, { status: 400 });

  // 내 만다라트 조회
  const { data: mandalart } = await supabase
    .from("growth_mandalarts")
    .select("id")
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!mandalart) return NextResponse.json({ error: "만다라트가 없습니다" }, { status: 404 });

  // 셀 ID 수집 → 투두 삭제 → 셀 삭제 → 만다라트 초기화
  const { data: cells } = await supabase
    .from("growth_mandalart_cells")
    .select("id")
    .eq("mandalart_id", mandalart.id);

  const cellIds = (cells ?? []).map((c: { id: string }) => c.id);

  if (cellIds.length > 0) {
    await supabase.from("growth_mandalart_cell_todos").delete().in("cell_id", cellIds);
    await supabase.from("growth_mandalart_cells").delete().eq("mandalart_id", mandalart.id);
  }

  // 만다라트 컨테이너 초기화 (center_goal 비우기)
  await supabase
    .from("growth_mandalarts")
    .update({ center_goal: "", updated_at: new Date().toISOString() })
    .eq("id", mandalart.id);

  return NextResponse.json({ ok: true });
}

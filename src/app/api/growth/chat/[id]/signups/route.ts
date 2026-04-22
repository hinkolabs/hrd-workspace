import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("growth_chat_signups")
    .select("id")
    .eq("message_id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("growth_chat_signups").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  }

  const { error } = await supabase.from("growth_chat_signups").insert({
    message_id: id,
    user_id: session.userId,
    display_name: session.displayName,
  });

  if (error) {
    // schema not migrated
    if (error.code === "PGRST205" || error.code === "42P01" || error.message.includes("growth_chat_signups")) {
      return NextResponse.json({
        error: "참여 기능 DB가 아직 설정되지 않았어요. /growth-setup.html의 SQL을 실행해주세요.",
      }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ action: "added" }, { status: 201 });
}

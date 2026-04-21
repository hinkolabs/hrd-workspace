import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { id } = await params;
  const { emoji } = await req.json();

  const supabase = createServerClient();

  // Toggle: if exists remove, else add
  const { data: existing } = await supabase
    .from("growth_reactions")
    .select("id")
    .eq("target_type", "journal")
    .eq("target_id", id)
    .eq("user_id", session.userId)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    await supabase.from("growth_reactions").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  }

  const { error } = await supabase.from("growth_reactions").insert({
    target_type: "journal",
    target_id: id,
    user_id: session.userId,
    emoji,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ action: "added" }, { status: 201 });
}

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = createServerClient();
  const session = await getSessionFromCookies();
  const body = await req.json();
  const { title, content, color } = body;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const displayName = session?.displayName ?? null;

  const { data, error } = await supabase
    .from("memos")
    .insert({
      title,
      content: content ?? null,
      color: color ?? "default",
      created_by: displayName,
      updated_by: displayName,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("activity_logs").insert({
    entity_type: "memo",
    entity_id: data.id,
    entity_title: title,
    action: "create",
    user_display_name: displayName,
    user_id: session?.userId ?? null,
  });

  return NextResponse.json(data, { status: 201 });
}

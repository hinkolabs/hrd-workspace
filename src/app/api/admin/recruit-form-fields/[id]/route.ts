import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 전용" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.label !== undefined) update.label = body.label.trim();
  if (body.field_type !== undefined) update.field_type = body.field_type;
  if (body.options !== undefined) update.options = body.options;
  if (body.required !== undefined) update.required = body.required;
  if (body.order_idx !== undefined) update.order_idx = body.order_idx;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_recruit_form_fields")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 전용" }, { status: 403 });

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase.from("growth_recruit_form_fields").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

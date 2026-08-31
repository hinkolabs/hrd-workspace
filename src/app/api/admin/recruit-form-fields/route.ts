import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 전용" }, { status: 403 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_recruit_form_fields")
    .select("*")
    .order("order_idx", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "관리자 전용" }, { status: 403 });

  const { label, field_type, options, required, order_idx } = await req.json();
  if (!label?.trim()) return NextResponse.json({ error: "필드 이름을 입력해주세요" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("growth_recruit_form_fields")
    .insert({
      label: label.trim(),
      field_type: field_type ?? "text",
      options: options ?? null,
      required: required ?? true,
      order_idx: order_idx ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

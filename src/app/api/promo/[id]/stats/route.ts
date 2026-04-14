import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const supabase = createServerClient();
  const { id } = await params;
  const { type } = await req.json(); // 'view' | 'cta_click' | 'share'

  const fieldMap: Record<string, string> = {
    view: "view_count",
    cta_click: "cta_click_count",
    share: "share_count",
  };

  const field = fieldMap[type];
  if (!field) return NextResponse.json({ error: "invalid type" }, { status: 400 });

  const { error } = await supabase.rpc("increment_promo_stat", {
    campaign_id: id,
    field_name: field,
  });

  // rpc가 없을 경우 fallback: 직접 increment
  if (error) {
    const { data: current } = await supabase
      .from("promo_campaigns")
      .select(field)
      .eq("id", id)
      .single();

    if (current) {
      await supabase
        .from("promo_campaigns")
        .update({ [field]: (current[field as keyof typeof current] as number ?? 0) + 1 })
        .eq("id", id);
    }
  }

  return NextResponse.json({ success: true });
}

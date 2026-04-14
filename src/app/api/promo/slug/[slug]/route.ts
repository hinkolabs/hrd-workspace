import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const supabase = createServerClient();
  const { slug } = await params;

  const { data: campaign, error } = await supabase
    .from("promo_campaigns")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "캠페인을 찾을 수 없습니다" }, { status: 404 });
  }

  if (campaign.type === "quiz") {
    const [{ data: questions }, { data: results }] = await Promise.all([
      supabase
        .from("promo_quiz_questions")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("sort_order"),
      supabase
        .from("promo_quiz_results")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("result_key"),
    ]);

    return NextResponse.json({ ...campaign, questions: questions ?? [], results: results ?? [] });
  }

  if (campaign.type === "info_card") {
    const { data: sections } = await supabase
      .from("promo_info_sections")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("sort_order");

    return NextResponse.json({ ...campaign, sections: sections ?? [] });
  }

  return NextResponse.json(campaign);
}

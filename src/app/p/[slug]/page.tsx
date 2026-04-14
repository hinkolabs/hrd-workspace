import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { QuizPlayer } from "@/components/promo/quiz-player";
import { InfoCardPage } from "@/components/promo/info-card-page";

type Props = { params: Promise<{ slug: string }> };

async function getCampaign(slug: string) {
  const supabase = createServerClient();

  const { data: campaign, error } = await supabase
    .from("promo_campaigns")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error || !campaign) return null;

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
    return { ...campaign, questions: questions ?? [], results: results ?? [] };
  }

  if (campaign.type === "info_card") {
    const { data: sections } = await supabase
      .from("promo_info_sections")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("sort_order");
    return { ...campaign, sections: sections ?? [] };
  }

  return campaign;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaign(slug);

  if (!campaign) {
    return { title: "페이지를 찾을 수 없습니다" };
  }

  const title = campaign.og_title || campaign.title;
  const description = campaign.og_description || "";
  const images = campaign.og_image_url ? [campaign.og_image_url] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

export default async function PromoPage({ params }: Props) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);

  if (!campaign) notFound();

  if (campaign.type === "quiz") {
    return <QuizPlayer campaign={campaign as Parameters<typeof QuizPlayer>[0]["campaign"]} />;
  }

  if (campaign.type === "info_card") {
    return <InfoCardPage campaign={campaign as Parameters<typeof InfoCardPage>[0]["campaign"]} />;
  }

  notFound();
}

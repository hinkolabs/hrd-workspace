import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { SlotDeck } from "@/lib/deck/types";

export async function POST(req: NextRequest) {
  try {
    const { deck, owner } = await req.json() as { deck: SlotDeck; owner?: string };
    if (!deck?.meta?.title || !deck?.slides) {
      return NextResponse.json({ error: "유효하지 않은 deck 데이터입니다." }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("decks")
      .insert({ title: deck.meta.title, slot_deck: deck, owner: owner ?? null })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("[deck/save]", err);
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}

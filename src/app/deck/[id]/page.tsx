import { createServerClient } from "@/lib/supabase-server";
import type { SlotDeck } from "@/lib/deck/types";
import { DeckViewer } from "@/components/deck/DeckViewer";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DeckPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("decks")
    .select("id, title, slot_deck")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const deck = data.slot_deck as SlotDeck;

  return <DeckViewer deck={deck} deckId={id} />;
}

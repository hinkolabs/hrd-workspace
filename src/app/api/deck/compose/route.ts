import { NextRequest, NextResponse } from "next/server";
import { chat, stripJsonFences } from "@/lib/llm-adapter";
import type { DeckOutline, SlotDeck } from "@/lib/deck/types";
import { mapOutlineToDeck } from "@/lib/deck/map-outline-to-deck";

/**
 * POST /api/deck/compose
 * Body: { outline: DeckOutline; enrichIcons?: boolean }
 * Returns: SlotDeck
 *
 * Strategy:
 *   1. Run deterministic mapper (always)
 *   2. If enrichIcons=true, call LLM to improve icon names and emphasis text
 */

const ICON_ENRICHMENT_PROMPT = `You are a JSON editor. Given a SlotDeck, improve ONLY the following fields:
- BulletsSlide bullets[].icon — replace generic icons with more relevant Lucide icon names
- ProcessSlide steps[].icon — same
- StatsSlide stats[].icon — same
- Any slide's emphasis text — make it punchier and more specific (max 60 chars)

Valid Lucide icon names (use ONLY from this list):
Activity, AlertCircle, ArrowRight, Award, BarChart2, BarChart3, BookOpen, Brain, Briefcase,
Building2, Calendar, CheckCircle2, Clock, Code2, Cpu, Database, DollarSign, FileText, Flag,
Globe, GraduationCap, Heart, Layers, Lightbulb, Link, Mail, MapPin, MessageSquare, Monitor,
Package, PenLine, Percent, Phone, PieChart, Presentation, Rocket, Search, Settings, Shield,
ShoppingCart, Sparkles, Star, Target, ThumbsUp, TrendingDown, TrendingUp, Trophy, Users,
Zap, CheckSquare, Clipboard, Edit3, RefreshCw, ArrowUpRight, LayoutGrid, Network

Return the COMPLETE SlotDeck JSON with only the above fields changed.
Do NOT change any text content, structure, or component types.
Return pure JSON only, no markdown fences.`;

export async function POST(req: NextRequest) {
  try {
    const { outline, enrichIcons = false } = await req.json() as {
      outline: DeckOutline;
      enrichIcons?: boolean;
    };

    if (!outline?.sections) {
      return NextResponse.json({ error: "outline이 필요합니다." }, { status: 400 });
    }

    // Stage 1: deterministic mapping
    let deck = mapOutlineToDeck(outline);

    // Stage 2 (optional): LLM icon/emphasis enrichment
    if (enrichIcons) {
      try {
        const response = await chat({
          provider: "auto",
          messages: [
            { role: "system", content: ICON_ENRICHMENT_PROMPT },
            { role: "user", content: JSON.stringify(deck) },
          ],
          temperature: 0.2,
          maxTokens: 8192,
        });
        console.log(`[deck/compose enrichment] ${response.provider}/${response.model}`);
        const enriched: SlotDeck = JSON.parse(stripJsonFences(response.text));
        // Only accept if structure is intact
        if (enriched?.slides?.length === deck.slides.length) {
          deck = enriched;
        }
      } catch (enrichErr) {
        console.warn("[deck/compose] enrichment failed, using deterministic result:", enrichErr);
      }
    }

    return NextResponse.json(deck);
  } catch (err) {
    console.error("[deck/compose]", err);
    return NextResponse.json({ error: "슬라이드 구성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

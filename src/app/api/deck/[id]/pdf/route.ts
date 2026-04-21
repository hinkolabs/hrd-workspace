import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/deck/[id]/pdf
 * Renders /deck/[id] via Playwright headless Chromium and returns a PDF.
 * Falls back to a 501 response if Playwright is not available.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;

  // Verify the deck exists
  const supabase = createServerClient();
  const { data, error } = await supabase.from("decks").select("title").eq("id", id).single();
  if (error || !data) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  try {
    const { chromium } = await import("playwright");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
    const deckUrl = `${baseUrl}/deck/${id}`;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Set viewport to 1280px wide — matches our slide width
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(deckUrl, { waitUntil: "networkidle" });

    // Wait for slides to render (font load + React hydration)
    await page.waitForTimeout(1500);

    const pdfBuffer = await page.pdf({
      printBackground: true,
      width: "1280px",
      height: "720px",
      pageRanges: "",
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    const title = data.title.replace(/[^\w가-힣\s]/g, "").trim() || "deck";
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(title)}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[deck/pdf]", err);
    // If Playwright isn't installed or browser launch fails
    return NextResponse.json(
      { error: "PDF export requires Playwright. Run: npx playwright install chromium" },
      { status: 501 }
    );
  }
}

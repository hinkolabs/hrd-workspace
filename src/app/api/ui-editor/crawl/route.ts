import { NextResponse } from "next/server";
import { crawlUrl } from "@/lib/crawler";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    const html = await crawlUrl(url);
    return NextResponse.json({ html });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to crawl URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

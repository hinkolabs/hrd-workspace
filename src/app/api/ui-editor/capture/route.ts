import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const CLONE_DIR = path.join(process.cwd(), "src", "app", "clone");

// CORS headers — the bookmarklet runs from an external origin (e.g. edu.hanaw.com)
// and POSTs to localhost:3000, so we must allow cross-origin requests.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function extractPageName(url: string): string {
  try {
    const { pathname } = new URL(url);
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    const base = last.replace(/\.[a-z]+$/i, "") || "page";
    return base.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
  } catch {
    return "page";
  }
}

/** Ensure the page name is unique — append _2, _3, … if it already exists */
function resolveUniqueName(base: string): string {
  const dir = path.join(CLONE_DIR, base);
  if (!fs.existsSync(dir)) return base;

  let n = 2;
  while (fs.existsSync(path.join(CLONE_DIR, `${base}_${n}`))) n++;
  return `${base}_${n}`;
}

export async function POST(req: Request) {
  try {
    const { html, url, pageName } = await req.json();

    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "html required" }, { status: 400, headers: CORS_HEADERS });
    }

    // Determine page name: use provided name, else extract from URL
    const rawName =
      (typeof pageName === "string" && pageName.trim())
        ? pageName.trim().replace(/[^a-zA-Z0-9_-]/g, "-")
        : extractPageName(typeof url === "string" ? url : "");

    const name = resolveUniqueName(rawName || "page");

    // Save
    const pageDir = path.join(CLONE_DIR, name);
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(pageDir, "content.html"), html, "utf-8");

    return NextResponse.json(
      { name, path: `/api/ui-editor/html-preview/${name}` },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "capture failed" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

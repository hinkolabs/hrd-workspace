import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CLONE_DIR = path.join(process.cwd(), "src", "app", "clone");

function ensureCloneDir() {
  if (!fs.existsSync(CLONE_DIR)) fs.mkdirSync(CLONE_DIR, { recursive: true });
}

export async function GET(req: Request) {
  ensureCloneDir();
  const { searchParams } = new URL(req.url);
  const base = searchParams.get("base");

  const entries = fs.readdirSync(CLONE_DIR, { withFileTypes: true });
  let pages = entries
    .filter((e) => e.isDirectory())
    .flatMap((e) => {
      try {
        const dir = path.join(CLONE_DIR, e.name);
        const htmlPath = path.join(dir, "content.html");
        const tsxPath = path.join(dir, "page.tsx");

        const hasHtml = fs.existsSync(htmlPath);
        const hasTsx = fs.existsSync(tsxPath);
        if (!hasHtml && !hasTsx) return [];

        const type: "html" | "tsx" = hasHtml ? "html" : "tsx";
        const filePath = hasHtml ? htmlPath : tsxPath;
        const stat = fs.statSync(filePath);

        return [{ name: e.name, updatedAt: stat.mtime.toISOString(), type }];
      } catch {
        return []; // skip directories that can't be read (e.g. being deleted)
      }
    })
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  if (base) {
    pages = pages.filter(
      (p) => p.name === base || p.name.match(new RegExp(`^${base}_\\d+$`))
    );
  }

  return NextResponse.json(pages);
}

export async function POST(req: Request) {
  ensureCloneDir();
  const { name, code, type = "tsx" } = await req.json();
  if (!name || !code) {
    return NextResponse.json({ error: "name and code required" }, { status: 400 });
  }

  const safeName = name.replace(/[^a-zA-Z0-9-_가-힣]/g, "-").toLowerCase();
  const pageDir = path.join(CLONE_DIR, safeName);
  fs.mkdirSync(pageDir, { recursive: true });

  const fileName = type === "html" ? "content.html" : "page.tsx";
  fs.writeFileSync(path.join(pageDir, fileName), code, "utf-8");

  const previewPath =
    type === "html" ? `/api/ui-editor/html-preview/${safeName}` : `/clone/${safeName}`;
  return NextResponse.json({ name: safeName, path: previewPath, type }, { status: 201 });
}

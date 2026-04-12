import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CLONE_DIR = path.join(process.cwd(), "src", "app", "clone");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const dir = path.join(CLONE_DIR, name);

  try {
    const htmlPath = path.join(dir, "content.html");
    const tsxPath = path.join(dir, "page.tsx");

    if (fs.existsSync(htmlPath)) {
      const code = fs.readFileSync(htmlPath, "utf-8");
      return NextResponse.json({ name, code, type: "html" });
    }

    if (fs.existsSync(tsxPath)) {
      const code = fs.readFileSync(tsxPath, "utf-8");
      return NextResponse.json({ name, code, type: "tsx" });
    }

    return NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "read error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const { code, type = "tsx" } = await req.json();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const pageDir = path.join(CLONE_DIR, name);
  fs.mkdirSync(pageDir, { recursive: true });

  const fileName = type === "html" ? "content.html" : "page.tsx";
  fs.writeFileSync(path.join(pageDir, fileName), code, "utf-8");

  const previewPath =
    type === "html" ? `/api/ui-editor/html-preview/${name}` : `/clone/${name}`;
  return NextResponse.json({ name, path: previewPath, type });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const pageDir = path.join(CLONE_DIR, name);

  if (!fs.existsSync(pageDir)) {
    return NextResponse.json({ success: true });
  }

  // On Windows, Next.js Turbopack holds file locks on page.tsx files it is
  // currently watching. We work around this by first renaming the directory
  // OUTSIDE src/app/ (which removes it from the watched scope), then deleting.
  const tempBase = path.join(process.cwd(), ".next", "_deleted");
  const tempDir = path.join(tempBase, `${name}_${Date.now()}`);

  try {
    fs.mkdirSync(tempBase, { recursive: true });
    fs.renameSync(pageDir, tempDir);
    // Deletion of temp copy is best-effort; cleanup isn't critical
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ok */ }
  } catch {
    // Rename failed (e.g. cross-device link) — try direct recursive delete
    try {
      fs.rmSync(pageDir, { recursive: true, force: true });
    } catch (e) {
      return NextResponse.json(
        { error: `삭제 실패: ${e instanceof Error ? e.message : String(e)}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}

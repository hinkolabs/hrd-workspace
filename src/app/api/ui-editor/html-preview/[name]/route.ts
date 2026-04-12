import fs from "fs";
import path from "path";

const CLONE_DIR = path.join(process.cwd(), "src", "app", "clone");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // Basic path traversal guard
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    return new Response("Invalid name", { status: 400 });
  }

  const htmlPath = path.join(CLONE_DIR, name, "content.html");

  if (!fs.existsSync(htmlPath)) {
    return new Response("Not found", { status: 404 });
  }

  const html = fs.readFileSync(htmlPath, "utf-8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}

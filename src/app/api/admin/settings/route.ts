import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

const HRD_CONTEXT_KEY = "hrd_context";

function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, 50000);
}

async function extractTextFromFile(file: File): Promise<string> {
  const ext = (file.name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (ext === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse") as (
      buf: Buffer
    ) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return data.text?.trim() || "";
  } else if (ext === "hwp" || ext === "hwpx") {
    const raw = buffer
      .toString("utf-8")
      .replace(/[^\x20-\x7E\uAC00-\uD7AF\u3131-\u318E\n\r\t]/g, " ");
    const lines = raw
      .split(/[\n\r]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 1);
    const koreanLines = lines.filter((l) => /[\uAC00-\uD7AF]/.test(l));
    return koreanLines.length > 0
      ? koreanLines.join("\n")
      : lines.slice(0, 300).join("\n");
  } else if (ext === "doc" || ext === "docx") {
    const raw = buffer
      .toString("utf-8")
      .replace(/[^\x20-\x7E\uAC00-\uD7AF\u3131-\u318E\n\r\t]/g, " ")
      .replace(/ {3,}/g, " ");
    const lines = raw
      .split(/[\n\r]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 2);
    const meaningful = lines.filter(
      (l) => /[\uAC00-\uD7AF]/.test(l) || /[a-zA-Z]{3,}/.test(l)
    );
    return meaningful.length > 0
      ? meaningful.join("\n")
      : lines.slice(0, 300).join("\n");
  } else {
    return buffer.toString("utf-8");
  }
}

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("settings")
    .select("key, value, file_name, updated_at")
    .eq("key", HRD_CONTEXT_KEY)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? { key: HRD_CONTEXT_KEY, value: "", file_name: null, updated_at: null });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  const supabase = createServerClient();

  let value: string;
  let fileName: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const extraText = (formData.get("text") as string | null) || "";

    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    try {
      const extracted = await extractTextFromFile(file);
      const combined = [extracted, extraText].filter(Boolean).join("\n\n");
      value = sanitizeText(combined);
      fileName = file.name;
    } catch (e) {
      console.error("File extract error:", e);
      return NextResponse.json({ error: "파일 텍스트 추출 실패" }, { status: 400 });
    }
  } else {
    const body = await req.json();
    value = sanitizeText(body.value || "");
    fileName = body.file_name ?? null;
  }

  const { data, error } = await supabase
    .from("settings")
    .upsert(
      { key: HRD_CONTEXT_KEY, value, file_name: fileName, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    )
    .select("key, value, file_name, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

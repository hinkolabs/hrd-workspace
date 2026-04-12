import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = createServerClient();
  const contentType = req.headers.get("content-type") || "";

  let title: string;
  let content: string;
  let fileType = "text";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customTitle = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    title = customTitle?.trim() || file.name;
    const ext = (file.name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
    fileType = ext;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (ext === "pdf") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse/lib/pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
        const data = await pdfParse(buffer);
        content = data.text?.trim() || "";
        if (!content) {
          return NextResponse.json({ error: "PDF에서 텍스트를 추출할 수 없습니다. 이미지 기반 PDF이거나 텍스트가 없는 파일입니다." }, { status: 400 });
        }
      } catch (e) {
        console.error("PDF parse error:", e);
        return NextResponse.json({ error: "PDF 텍스트 추출 실패: 파일이 손상되었거나 암호화된 PDF일 수 있습니다." }, { status: 400 });
      }
    } else if (ext === "hwp" || ext === "hwpx") {
      const raw = buffer
        .toString("utf-8")
        .replace(/[^\x20-\x7E\uAC00-\uD7AF\u3131-\u318E\n\r\t]/g, " ");
      const lines = raw.split(/[\n\r]+/).map((l) => l.trim()).filter((l) => l.length > 1);
      const koreanLines = lines.filter((l) => /[\uAC00-\uD7AF]/.test(l));
      content = koreanLines.length > 0 ? koreanLines.join("\n") : lines.slice(0, 300).join("\n");
    } else if (ext === "doc" || ext === "docx") {
      const raw = buffer
        .toString("utf-8")
        .replace(/[^\x20-\x7E\uAC00-\uD7AF\u3131-\u318E\n\r\t]/g, " ")
        .replace(/ {3,}/g, " ");
      const lines = raw.split(/[\n\r]+/).map((l) => l.trim()).filter((l) => l.length > 2);
      const meaningful = lines.filter((l) => /[\uAC00-\uD7AF]/.test(l) || /[a-zA-Z]{3,}/.test(l));
      content = meaningful.length > 0 ? meaningful.join("\n") : lines.slice(0, 300).join("\n");
    } else {
      content = buffer.toString("utf-8");
    }
  } else {
    const body = await req.json();
    title = body.title;
    content = body.content;
    fileType = body.fileType || "text";
  }

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "제목과 내용이 필요합니다." }, { status: 400 });
  }

  // null bytes, 유효하지 않은 유니코드 이스케이프 제거 (PostgreSQL 호환)
  const sanitized = content
    .replace(/\u0000/g, "")
    .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  const trimmedContent = sanitized.trim().slice(0, 50000);

  const chunkCount = Math.ceil(trimmedContent.length / 500);

  // file_type 컬럼 포함해서 먼저 시도
  let result = await supabase
    .from("documents")
    .insert({ title: title.trim(), content: trimmedContent, file_type: fileType, chunk_count: chunkCount })
    .select()
    .single();

  // 컬럼이 없으면 file_type 제외하고 재시도
  if (result.error?.message?.includes("file_type")) {
    result = await supabase
      .from("documents")
      .insert({ title: title.trim(), content: trimmedContent, chunk_count: chunkCount })
      .select()
      .single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json(result.data, { status: 201 });
}

import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// GPT-4o context window은 128k 토큰. 한글 1자 ≈ 2토큰 기준으로
// 안전하게 최대 60,000자까지 허용 (시스템 프롬프트 포함 여유분 확보)
const MAX_CHARS = 60_000;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = getExtension(file.name);

    const textContent = await extractText(buffer, file.name, ext);

    if (!textContent.trim()) {
      return NextResponse.json({ error: "파일에서 텍스트를 추출할 수 없습니다." }, { status: 400 });
    }

    const isTruncated = textContent.length >= MAX_CHARS;

    // HTML 변환 + AI 요약을 병렬 실행
    const [convertResult, summaryResult] = await Promise.allSettled([
      // 1. 전체 내용 HTML 변환
      openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 16000,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `당신은 문서 변환 전문가입니다. 아래 텍스트는 ${ext.toUpperCase()} 파일에서 추출한 원문입니다.

[절대 규칙]
- 내용을 절대 요약하거나 생략하지 마세요. 원문의 모든 내용을 빠짐없이 포함해야 합니다.
- 원문에 있는 모든 문장, 수치, 항목을 그대로 유지하세요.
- 내용을 임의로 추가하거나 변경하지 마세요.

[변환 규칙]
- 표 구조가 있으면 반드시 <table> 태그로 재현하세요.
- 제목, 부제목, 날짜, 서명란 등 문서 구조를 그대로 살리세요.
- 번호 목록, 불릿 목록은 <ol>/<ul> 태그를 사용하세요.
- 인라인 스타일로 A4 사이즈 인쇄에 적합하게 만드세요.
- <html><head><body> 포함한 완전한 HTML 문서로 출력하세요.
- head에 <meta charset="UTF-8"> 포함.
- 폰트: 'Malgun Gothic', '맑은 고딕', sans-serif
- body margin: 20mm, font-size: 10pt
- 표: border-collapse: collapse, 모든 셀에 border: 1px solid #333, padding: 4px 8px
- 코드블록은 <pre><code> 태그 사용
${isTruncated ? "- 주의: 원본 파일이 길어 일부만 추출되었습니다. 추출된 내용 전체를 변환하세요." : ""}`,
          },
          {
            role: "user",
            content: `파일명: ${file.name}\n파일형식: ${ext.toUpperCase()}\n${isTruncated ? `(원본 ${Math.round(file.size / 1024)}KB 중 앞부분 추출)\n` : ""}\n추출된 원문 내용:\n\n${textContent}`,
          },
        ],
      }),

      // 2. AI 요약 (별도 call, 빠른 모델로)
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `당신은 문서 분석 전문가입니다. 아래는 ${ext.toUpperCase()} 문서에서 추출한 텍스트입니다.
이 문서의 핵심 내용을 한국어로 구조화된 요약으로 작성하세요.

[요약 형식]
1. **문서 유형**: (공문서/보고서/계약서/지침 등)
2. **주요 목적**: (한 문장으로)
3. **핵심 내용**: (3~7개 불릿 포인트, 중요 수치/날짜 포함)
4. **주요 수치/조건**: (금액, 날짜, 기준 등 있으면)
5. **특이사항**: (주의사항, 예외조항 등 있으면)

마크다운 형식으로 작성하세요.`,
          },
          {
            role: "user",
            content: `파일명: ${file.name}\n\n${textContent.slice(0, 20000)}`,
          },
        ],
      }),
    ]);

    const html = convertResult.status === "fulfilled"
      ? (convertResult.value.choices[0].message.content || "")
      : "";

    const summary = summaryResult.status === "fulfilled"
      ? (summaryResult.value.choices[0].message.content || "")
      : null;

    // 변환 히스토리 저장 (비동기, 실패해도 응답에 영향 없음)
    try {
      const session = await getSessionFromCookies();
      const supabase = createServerClient();
      await supabase.from("convert_history").insert({
        file_name: file.name,
        file_type: ext,
        file_size: file.size,
        summary: summary,
        user_display_name: session?.displayName ?? null,
        user_id: session?.userId ?? null,
      });
    } catch (histErr) {
      console.error("convert_history save error:", histErr);
    }

    const outputName = file.name.replace(/\.[^.]+$/, ".pdf");
    return NextResponse.json({
      html,
      summary,
      filename: outputName,
      originalName: file.name,
      fileType: ext,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "변환 실패" },
      { status: 500 },
    );
  }
}

function getExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "unknown";
}

async function extractText(buffer: Buffer, filename: string, ext: string): Promise<string> {
  switch (ext) {
    case "pdf":
      return extractPdfText(buffer);
    case "docx":
    case "doc":
      return extractDocxText(buffer, filename);
    case "hwp":
    case "hwpx":
      return extractHwpText(buffer, filename);
    case "txt":
    case "md":
    case "log":
      return extractPlainText(buffer, filename);
    case "csv":
      return extractCsvText(buffer, filename);
    case "json":
    case "xml":
    case "html":
    case "htm":
    case "rtf":
      return extractPlainText(buffer, filename);
    default:
      return extractPlainText(buffer, filename);
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
    const data = await pdfParse(buffer);
    return (data.text || "").slice(0, MAX_CHARS);
  } catch (e) {
    console.error("PDF parse error:", e);
    return "[PDF 텍스트 추출 실패 - 이미지 기반 PDF이거나 암호화된 파일일 수 있습니다]";
  }
}

async function extractDocxText(buffer: Buffer, filename: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth") as {
      extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
    };
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || "";
    return `[파일명: ${filename}]\n\n${text}`.slice(0, MAX_CHARS);
  } catch (e) {
    console.error("mammoth error:", e);
    return extractDocFallback(buffer, filename);
  }
}

function extractDocFallback(buffer: Buffer, filename: string): string {
  const text = buffer
    .toString("utf-8")
    .replace(/[^\x20-\x7E\uAC00-\uD7AF\u3131-\u318E\n\r\t]/g, " ")
    .replace(/ {3,}/g, " ");
  const lines = text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && (/[\uAC00-\uD7AF]/.test(l) || /[a-zA-Z]{3,}/.test(l)));
  return `[파일명: ${filename}]\n\n${lines.join("\n")}`.slice(0, MAX_CHARS);
}

function extractHwpText(buffer: Buffer, filename: string): string {
  const parts: string[] = [`[파일명: ${filename}]`];
  const collected: string[] = [];

  // UTF-16LE 디코딩 시도 (HWP 본문 스트림이 UTF-16LE를 사용)
  try {
    const chunkSize = 4096;
    for (let offset = 0; offset < buffer.length - 1; offset += chunkSize) {
      const chunk = buffer.slice(offset, offset + chunkSize);
      const decoded = chunk.toString("utf16le");
      const koreanChars = decoded.match(/[\uAC00-\uD7AF\u3131-\u318E\u0030-\u0039\u0020-\u007E]+/g) || [];
      for (const seg of koreanChars) {
        const trimmed = seg.trim();
        if (trimmed.length > 1) collected.push(trimmed);
      }
    }
  } catch { /* ignore */ }

  // UTF-8 기반 추출도 병행
  try {
    const utf8text = buffer.toString("utf-8");
    const utf8Korean = utf8text.match(/[\uAC00-\uD7AF\u3131-\u318E\u0030-\u0039\u0020-\u007E]{2,}/g) || [];
    for (const seg of utf8Korean) {
      const trimmed = seg.trim();
      if (trimmed.length > 1) collected.push(trimmed);
    }
  } catch { /* ignore */ }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of collected) {
    if (!seen.has(line) && line.length > 1) {
      seen.add(line);
      unique.push(line);
    }
  }

  const body = unique.filter((l) => /[\uAC00-\uD7AF]/.test(l) || /\d{2,}/.test(l)).join("\n");
  parts.push(body || "[HWP 텍스트 추출 제한 - 더 정확한 변환을 위해 한글에서 DOCX로 저장 후 다시 업로드하세요]");

  return parts.join("\n\n").slice(0, MAX_CHARS);
}

function extractPlainText(buffer: Buffer, filename: string): string {
  let text = buffer.toString("utf-8");
  if (text.includes("\ufffd") || !text.trim()) {
    try { text = buffer.toString("latin1"); } catch { /* keep */ }
  }
  return `[파일명: ${filename}]\n\n${text}`.slice(0, MAX_CHARS);
}

function extractCsvText(buffer: Buffer, filename: string): string {
  let text = buffer.toString("utf-8");
  if (text.includes("\ufffd")) {
    try { text = buffer.toString("latin1"); } catch { /* keep */ }
  }
  return `[파일명: ${filename}]\n[CSV 데이터 - 표로 변환 필요]\n\n${text}`.slice(0, MAX_CHARS);
}

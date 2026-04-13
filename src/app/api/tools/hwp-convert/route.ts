import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

const MAX_CHARS = 40_000;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = getExtension(file.name);

    const textContent = await extractText(buffer, file.name, ext);

    if (!textContent.trim() || textContent.length < 20) {
      return NextResponse.json({ error: "파일에서 텍스트를 추출할 수 없습니다. DOCX 또는 PDF로 저장 후 다시 시도해 주세요." }, { status: 400 });
    }

    const isTruncated = textContent.length >= MAX_CHARS;

    // 요약 + 핵심 질문을 병렬 실행
    const [summaryResult, questionsResult] = await Promise.allSettled([
      // 1. 상세 요약
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `당신은 공공기관 인재개발실 문서 분석 전문가입니다. 아래 문서를 분석하여 구조화된 요약을 작성하세요.

[출력 형식 - 반드시 아래 마크다운 형식으로 작성]
## 문서 개요
- **문서 유형**: (공문서/지침/계획서/보고서/계약서/기타)
- **주요 목적**: (한 문장)
- **대상/범위**: (해당되는 경우)

## 핵심 내용
(3~7개 불릿, 각 항목은 구체적인 수치/날짜 포함)

## 주요 수치 및 조건
(금액, 날짜, 비율, 기준값 등 — 없으면 생략)

## 주의사항 및 특이사항
(예외조항, 첨부서류, 기한 등 — 없으면 생략)
${isTruncated ? "\n(주의: 파일이 길어 앞부분만 분석됨)" : ""}`,
          },
          { role: "user", content: `파일명: ${file.name}\n\n${textContent}` },
        ],
      }),

      // 2. 핵심 확인 질문 자동 생성
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 600,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `당신은 공공기관 인재개발실 담당자입니다. 아래 문서를 검토할 때 반드시 확인해야 할 핵심 질문 5개를 생성하세요.

[출력 형식]
각 질문을 번호 없이 한 줄씩, 질문 형태로만 작성하세요.
예시:
교육비 지원 한도가 1인당 얼마인지 명시되어 있는가?
신청 마감일은 언제이며 서류 제출처는 어디인가?`,
          },
          { role: "user", content: `파일명: ${file.name}\n\n${textContent.slice(0, 15000)}` },
        ],
      }),
    ]);

    const summary = summaryResult.status === "fulfilled"
      ? (summaryResult.value.choices[0].message.content ?? "")
      : null;

    const questionsRaw = questionsResult.status === "fulfilled"
      ? (questionsResult.value.choices[0].message.content ?? "")
      : null;

    const questions = questionsRaw
      ? questionsRaw.split("\n").map((q) => q.trim()).filter((q) => q.length > 5)
      : [];

    // 히스토리 저장
    try {
      const session = await getSessionFromCookies();
      const supabase = createServerClient();
      await supabase.from("convert_history").insert({
        file_name: file.name,
        file_type: ext,
        file_size: file.size,
        summary,
        user_display_name: session?.displayName ?? null,
        user_id: session?.userId ?? null,
      });
    } catch (histErr) {
      console.error("history save error:", histErr);
    }

    return NextResponse.json({
      summary,
      questions,
      originalName: file.name,
      fileType: ext,
      fileSize: file.size,
      isTruncated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "분석 실패" },
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
    case "pdf":   return extractPdfText(buffer);
    case "docx":
    case "doc":   return extractDocxText(buffer, filename);
    case "hwp":
    case "hwpx":  return extractHwpText(buffer, filename);
    default:      return extractPlainText(buffer, filename);
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return (data.text || "").slice(0, MAX_CHARS);
  } catch {
    return "[PDF 텍스트 추출 실패 — 이미지 기반 PDF이거나 암호화된 파일일 수 있습니다]";
  }
}

async function extractDocxText(buffer: Buffer, filename: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth") as { extractRawText: (o: { buffer: Buffer }) => Promise<{ value: string }> };
    const result = await mammoth.extractRawText({ buffer });
    return `[파일명: ${filename}]\n\n${result.value || ""}`.slice(0, MAX_CHARS);
  } catch {
    return extractPlainText(buffer, filename);
  }
}

function extractHwpText(buffer: Buffer, filename: string): string {
  const collected: string[] = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const iconv = require("iconv-lite") as { decode: (buf: Buffer, enc: string) => string };
    const cp949 = iconv.decode(buffer, "cp949");
    const lines = cp949
      .split(/[\r\n]+/)
      .map((l: string) => l.replace(/[^\uAC00-\uD7AF\u3131-\u318E\u0021-\u007E\s]/g, " ").trim())
      .filter((l: string) => l.length >= 2 && /[\uAC00-\uD7AF]/.test(l));
    collected.push(...lines);
  } catch { /* ignore */ }

  try {
    const chunkSize = 4096;
    for (let offset = 0; offset < buffer.length - 1; offset += chunkSize) {
      const decoded = buffer.slice(offset, offset + chunkSize).toString("utf16le");
      const segs = decoded.match(/[\uAC00-\uD7AF\u3131-\u318E][^\x00-\x08\x0B\x0C\x0E-\x1F]{1,200}/g) || [];
      for (const seg of segs) {
        const clean = seg.replace(/[^\uAC00-\uD7AF\u3131-\u318E\u0021-\u007E\s]/g, " ").trim();
        if (clean.length >= 2 && /[\uAC00-\uD7AF]/.test(clean)) collected.push(clean);
      }
    }
  } catch { /* ignore */ }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of collected) {
    const key = line.slice(0, 60);
    if (!seen.has(key)) {
      seen.add(key);
      const korCount = (line.match(/[\uAC00-\uD7AF]/g) || []).length;
      if (korCount / line.length >= 0.1) unique.push(line);
    }
  }

  const body = unique.join("\n");
  return `[파일명: ${filename}]\n\n${
    body.length > 100 ? body : "[HWP 텍스트 추출 제한 — 한글에서 DOCX/PDF로 저장 후 업로드하면 더 정확합니다]"
  }`.slice(0, MAX_CHARS);
}

function extractPlainText(buffer: Buffer, filename: string): string {
  let text = buffer.toString("utf-8");
  if (text.includes("\ufffd") || !text.trim()) {
    try { text = buffer.toString("latin1"); } catch { /* keep */ }
  }
  return `[파일명: ${filename}]\n\n${text}`.slice(0, MAX_CHARS);
}

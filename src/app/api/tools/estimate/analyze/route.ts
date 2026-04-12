import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServerClient } from "@/lib/supabase-server";

// ── 텍스트 추출 ─────────────────────────────────────────────────

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

// ── PDF 형광 표시 텍스트 추출 ────────────────────────────────────

interface PdfjsTextItem {
  str: string;
  transform: number[];
}

interface PdfjsAnnotation {
  subtype: string;
  quadPoints?: ArrayLike<number>;
  rect?: number[];
  contents?: string;
}

async function extractPdfHighlights(buffer: Buffer): Promise<string[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const PDFJS = require("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js") as any;
    PDFJS.disableWorker = true;

    const doc = await PDFJS.getDocument(new Uint8Array(buffer));
    const highlights: string[] = [];

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);

      const annotations: PdfjsAnnotation[] = await page.getAnnotations();
      const highlightAnnots = annotations.filter((a) => a.subtype === "Highlight");

      if (highlightAnnots.length === 0) {
        page.cleanup?.();
        continue;
      }

      const textContent = await page.getTextContent({ normalizeWhitespace: true });
      const textItems: PdfjsTextItem[] = textContent.items || [];

      for (const annot of highlightAnnots) {
        const rawQP = annot.quadPoints ? Array.from(annot.quadPoints) : [];
        const quadPoints: number[] =
          rawQP.length > 0 && annot.rect
            ? rawQP
            : annot.rect
            ? [
                annot.rect[0], annot.rect[1],
                annot.rect[2], annot.rect[1],
                annot.rect[0], annot.rect[3],
                annot.rect[2], annot.rect[3],
              ]
            : [];

        if (quadPoints.length === 0) continue;

        const highlightedParts: string[] = [];

        for (let qi = 0; qi < quadPoints.length; qi += 8) {
          const xs = [quadPoints[qi], quadPoints[qi + 2], quadPoints[qi + 4], quadPoints[qi + 6]];
          const ys = [quadPoints[qi + 1], quadPoints[qi + 3], quadPoints[qi + 5], quadPoints[qi + 7]];
          const minX = Math.min(...xs) - 4;
          const maxX = Math.max(...xs) + 4;
          const minY = Math.min(...ys) - 4;
          const maxY = Math.max(...ys) + 4;

          for (const item of textItems) {
            if (!item.str?.trim()) continue;
            const tx = item.transform[4];
            const ty = item.transform[5];
            if (tx >= minX && tx <= maxX && ty >= minY && ty <= maxY) {
              highlightedParts.push(item.str.trim());
            }
          }
        }

        if (highlightedParts.length > 0) {
          const combined = highlightedParts.join(" ").replace(/\s+/g, " ").trim();
          if (combined) highlights.push(combined);
        }
      }

      page.cleanup?.();
    }

    doc.destroy();
    return highlights;
  } catch (err) {
    console.warn("PDF highlight extraction failed (non-fatal):", err);
    return [];
  }
}

// ── 웹 검색 (openai.responses API) ──────────────────────────────

async function webSearch(query: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp = await (openai as any).responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      input: query,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = resp as any;
    if (typeof raw.output_text === "string") return raw.output_text;
    let text = "";
    for (const block of raw.output || []) {
      if (block.type === "message") {
        for (const c of block.content || []) {
          if (c.type === "output_text") text += c.text;
        }
      }
    }
    return text;
  } catch (err) {
    console.warn("Web search failed (non-fatal):", err);
    return "";
  }
}

// 분석 전 선행 시장 조사: 견적서에 등장하는 주요 항목의 현재 시장 단가 수집
async function gatherMarketData(estimateText: string, hrdContext: string): Promise<string> {
  const contextHint = hrdContext
    ? `(인재개발실/HRD 교육 프로그램 견적, AI·디지털 교육 특화)`
    : `(기업 교육 프로그램 견적)`;

  const query = `다음은 한국 기업/공공기관의 교육 견적서입니다 ${contextHint}. 이 견적서에 포함된 항목들의 2024-2025년 현재 실제 시장 단가를 조사해주세요.

견적서 내용 (일부):
${estimateText.slice(0, 800)}

조사 항목:
1. AI/디지털 교육 강사료 시장 단가 (시간당, 일당)
2. 교육 프로그램 기획·설계 용역 단가
3. 오프라인 워크숍/세미나 진행비 단가
4. 기술 지원·플랫폼 운영 비용
5. 교육 자료 제작 단가

각 항목별로 (1) 실제 시장 단가 범위와 출처, (2) AI/특수 분야 교육의 경우 프리미엄 수준, (3) 공공기관 표준 단가표 기준을 조사해주세요.`;

  return await webSearch(query);
}

// 분석 후 flagged 항목 추가 심층 조사
async function searchMarketPrices(
  flaggedItems: { name: string; amount: string }[],
  context: string
): Promise<string> {
  if (flaggedItems.length === 0) return "";
  const itemList = flaggedItems.map((it) => `- ${it.name}${it.amount ? ` (${it.amount})` : ""}`).join("\n");
  const query = `다음 교육 견적 항목들이 과다 책정 의심으로 플래그 되었습니다. 현재 시장 단가와 비교하여 구체적인 검토 의견을 제시해주세요.\n${itemList}\n\n${context ? `배경: ${context.slice(0, 300)}` : ""}\n\n각 항목별로 (1) 현재 시장 단가 범위와 근거, (2) 해당 금액의 적정성 판단, (3) 협상 기준가를 알려주세요.`;
  return await webSearch(query);
}

// ── 메인 핸들러 ─────────────────────────────────────────────────

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const supabase = createServerClient();

    let estimateText = "";
    let fileName: string | null = null;
    let highlights: string[] = [];
    const refDocs: { name: string; content: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const pastedText = (formData.get("text") as string | null) || "";
      const refDocFiles = formData.getAll("refDoc") as File[];

      if (file && file.size > 0) {
        const ext = (file.name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        try {
          estimateText = await extractTextFromFile(file);
          fileName = file.name;

          // PDF라면 형광 표시 추출 시도
          if (ext === "pdf") {
            highlights = await extractPdfHighlights(buffer);
          }
        } catch (e) {
          console.error("File extract error:", e);
          return NextResponse.json({ error: "파일 텍스트 추출 실패" }, { status: 400 });
        }

        if (pastedText.trim()) {
          estimateText = [estimateText, pastedText].filter(Boolean).join("\n\n");
        }
      } else {
        estimateText = pastedText;
      }

      // 비교 참고 문서 추출
      for (const refFile of refDocFiles) {
        if (!refFile || refFile.size === 0) continue;
        try {
          const content = await extractTextFromFile(refFile);
          if (content.trim()) {
            refDocs.push({ name: refFile.name, content: content.trim().slice(0, 4000) });
          }
        } catch {
          // 비교 문서 추출 실패는 무시
        }
      }
    } else {
      const body = await req.json();
      estimateText = body.text || "";
      fileName = body.fileName || null;
    }

    if (!estimateText.trim()) {
      return NextResponse.json(
        { error: "견적서 내용을 입력하거나 파일을 업로드해주세요." },
        { status: 400 }
      );
    }

    // 인재개발실 기준 데이터 조회
    const { data: settingRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "hrd_context")
      .single();

    const hrdContext = settingRow?.value?.trim() || "";

    // ── 선행 시장 조사 (분석 전 실행) ─────────────────────────
    const marketDataBeforeAnalysis = await gatherMarketData(estimateText, hrdContext);

    // ── 프롬프트 구성 ──────────────────────────────────────────

    const systemPrompt = `당신은 한국 기업/공공기관 교육 견적서 검토 전문가입니다.

⚠️ 절대 규칙:
- 출처 없는 수치를 절대 사용하지 마세요. "일반적으로", "보통", "통상적으로"같은 표현으로 만들어낸 기준치는 금지입니다.
- 모든 판단 근거(reasoning)와 단가 계산(calculation)에는 반드시 아래의 "시장 조사 결과" 또는 "인재개발실 기준 정보"에서 인용한 수치만 사용하세요.
- 시장 조사 결과에서 수치를 찾을 수 없는 항목은 수치 대신 "시장 단가 조사 범위에 포함되지 않음, 별도 견적 비교 필요"라고 명시하세요.
- AI/디지털 전문 교육은 일반 교육 대비 프리미엄이 있을 수 있습니다. 해당 분야 특수성을 반드시 고려하세요.
- 금액이 높다고 무조건 warning이 아닙니다. 강사의 전문성, AI 특화 여부, 교육 품질에 따라 정당화될 수 있습니다.
${hrdContext ? `\n[인재개발실 기준 정보 — 이 기준을 최우선으로 적용하세요]\n${hrdContext}` : ""}

[웹 검색으로 수집한 현재 시장 단가 데이터 — 이 수치를 판단 근거에 인용하세요]
${marketDataBeforeAnalysis || "시장 조사 데이터를 가져오지 못했습니다. 판단 근거에 수치 인용 대신 '별도 시장 조사 필요'라고 명시하세요."}`;

    let userPrompt = `다음 견적서를 분석해주세요${fileName ? ` (파일명: ${fileName})` : ""}:\n\n---\n${estimateText.slice(0, 20000)}\n---`;

    if (highlights.length > 0) {
      userPrompt += `\n\n[검토자 형광 표시 항목 - 이 항목들을 반드시 더 상세하게 분석해주세요]\n${highlights.map((h, i) => `${i + 1}. ${h}`).join("\n")}`;
    }

    if (refDocs.length > 0) {
      userPrompt += `\n\n[비교 참고 문서 ${refDocs.length}건 - 이 문서들과 비교 분석해주세요]`;
      for (const doc of refDocs) {
        userPrompt += `\n\n[참고: ${doc.name}]\n${doc.content}`;
      }
    }

    userPrompt += `\n\n아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "summary": "전체 검토 요약 (4-5문장). 이 견적의 전반적인 적정성 평가, 주요 이슈, 적정한 항목과 문제 있는 항목의 비율 등을 포함하세요.",
  "totalAmount": "견적서에서 파악된 총 금액 (불명확하면 '확인 필요')",
  "overallRisk": "low | medium | high",
  "items": [
    {
      "name": "항목명",
      "amount": "금액 또는 수량 (없으면 빈 문자열)",
      "status": "ok | warning | remove",
      "feedback": "이 항목의 판정 결과를 1문장으로 요약",
      "reasoning": "판단 근거를 3-5문장으로 상세 설명. 반드시 위의 시장 조사 데이터 또는 HRD 기준 정보에서 인용한 수치로 근거를 제시하세요. ok라면 왜 적정한지(어떤 기준/데이터에 부합하는지) 구체적으로 설명하고, warning/remove라면 구체적으로 무엇이 기준을 초과하는지 수치로 설명하세요. AI/디지털 특화 교육이라면 그 특수성도 반영하세요.",
      "calculation": "단가 계산 과정을 수식으로 표기. 반드시 시장 조사에서 확인된 실제 단가 범위를 인용하세요. 예: '총액 ○○천원 ÷ ○시간 = 시간당 ○○천원. 시장 조사 기준 AI교육 전문 강사 단가(○○~○○천원) 범위 내/초과'. 수치를 확인할 수 없는 항목이면 빈 문자열",
      "suggestion": "ok 항목은 '현행 유지 권고' 또는 '추가로 확보할 서류'. warning/remove 항목은 구체적인 조정 방안을 2-3문장으로 — 어떤 수준으로 조정해야 하는지, 근거 서류는 무엇인지 명시.",
      "isHighlighted": false
    }
  ],
  "generalFeedback": ["전반적인 검토 의견 또는 주의사항을 각각 1-2문장으로"],
  "riskItems": ["반드시 검토가 필요한 사항을 각각 구체적인 수치와 함께 1-2문장으로"],
  "comparisonInsights": ["비교 참고 문서가 있는 경우 문서명을 인용하며 비교 결과를 각각 구체적으로 (없으면 빈 배열)"],
  "plans": [
    {
      "id": "A",
      "title": "플랜 A — 엄격 기준 적용안",
      "description": "모든 항목을 HRD 기준 및 시장 조사 데이터에 엄격하게 대입하여 조정합니다. 기준 초과가 명확한 항목은 기준 상한선으로 조정하고, 적정 항목은 현행 유지합니다. 조정의 근거는 시장 조사 결과와 HRD 기준에 근거합니다.",
      "estimatedTotal": "조정 후 예상 총 금액 (원안과 비교: 예 15,400천원 → 11,200천원)",
      "savings": "원안 대비 차이 (절감 또는 동일, 예: 4,200천원 조정, 27% 감소). 적정 판정 시 '변경 없음'",
      "adjustments": [
        {
          "name": "항목명",
          "before": "조정 전 금액/내용",
          "after": "조정 후 금액/내용 (적정 항목은 '현행 유지', 제거 항목은 '제외')",
          "reason": "조정 이유를 2-3문장으로 — 반드시 시장 조사 데이터나 HRD 기준의 구체적 수치를 인용하세요. 예: '시장 조사 결과 AI전문 강사 시간당 단가는 ○○~○○천원 범위이며, 현 견적은 이를 ○배 초과함'"
        }
      ],
      "pros": ["장점 1 (구체적)"],
      "cons": ["단점 1 (구체적)"]
    },
    {
      "id": "B",
      "title": "플랜 B — 증빙 조건부 승인안",
      "description": "금액 자체를 일방적으로 조정하기보다, 각 항목에 대한 근거 서류와 상세 내역을 요구하는 방식입니다. 서류로 정당성이 입증되는 항목은 원안을 유지하고, 입증이 불가능한 항목만 조정합니다.",
      "estimatedTotal": "증빙 조건부 유지 금액 또는 조정 후 금액",
      "savings": "증빙 미제출 시 조정 가능한 금액",
      "adjustments": [
        {
          "name": "항목명",
          "before": "현재 금액/내용",
          "after": "요구 조건 또는 조정 금액",
          "reason": "어떤 서류/근거를 제출해야 현행 유지가 가능한지, 미제출 시 어느 수준으로 조정되는지 구체적으로"
        }
      ],
      "pros": ["장점 1"],
      "cons": ["단점 1"]
    },
    {
      "id": "C",
      "title": "플랜 C — 현행 승인안",
      "description": "전체적으로 견적이 교육 목적과 규모에 부합한다고 판단되는 경우, 현행 승인을 권고합니다. 다만 향후 집행 시 주의해야 할 사항과 보완이 필요한 서류를 명시합니다.",
      "estimatedTotal": "원안 유지 (총액 그대로)",
      "savings": "변경 없음",
      "adjustments": [
        {
          "name": "항목명",
          "before": "현재 금액/내용",
          "after": "현행 유지 / 또는 경미한 조정",
          "reason": "현행 유지 근거 또는 보완 권고사항을 2-3문장으로"
        }
      ],
      "pros": ["장점 1"],
      "cons": ["단점 1"]
    }
  ],
  "recommendedPlan": "A 또는 B 또는 C",
  "recommendationReason": "추천 플랜을 선정한 이유를 3-4문장으로. 이 견적의 전반적인 적정성 수준, 증빙 서류 확보 가능성, 인재개발실 기준 부합 여부 등을 종합적으로 설명하세요."
}

status 기준:
- "ok": 시장 조사 또는 HRD 기준에 비추어 적정한 항목 — ok라도 반드시 왜 적정한지 reasoning에 구체적으로 설명
- "warning": 금액 또는 내역이 기준 초과 의심, 세부 내역 부족, 증빙 서류 필요
- "remove": 기준을 명확히 초과하거나 교육 목적에 불필요한 항목

isHighlighted: 검토자가 형광 표시한 항목과 관련된 경우 true로 설정하세요.
calculation 필드: 시장 조사 데이터에서 확인된 단가 범위를 반드시 인용하세요 (단순 서술 금지).
suggestion 필드: ok 항목도 반드시 채우세요 ('현행 유지 권고, 단 ○○ 서류 확보 권장').

플랜 작성 원칙:
- 절감이 목적이 아닙니다. "이 견적이 올바른가"를 검증하는 것이 목적입니다.
- 적정한 항목은 플랜 A에서도 "현행 유지"로 표시하고, 조정이 필요한 항목만 조정하세요.
- 각 adjustments의 reason은 반드시 시장 조사 데이터나 HRD 기준의 구체적 수치를 인용한 2-3문장으로 작성하세요. "과다 책정"처럼 단정적 서술만 하는 것은 금지입니다.`;

    // o3는 system role 대신 developer role 사용, temperature 미지원
    const completion = await openai.chat.completions.create({
      model: "o3",
      messages: [
        { role: "developer", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    // 형광 표시 감지된 수 응답에 포함
    result.highlightCount = highlights.length;
    result.hasRefDocs = refDocs.length > 0;

    // 웹 검색: warning/remove 항목에 대한 시장 가격 조사
    const flaggedItems: { name: string; amount: string }[] = (result.items || [])
      .filter((it: { status: string }) => it.status === "warning" || it.status === "remove")
      .map((it: { name: string; amount: string }) => ({ name: it.name, amount: it.amount || "" }));

    const marketResearch = await searchMarketPrices(flaggedItems, hrdContext || estimateText.slice(0, 500));
    result.marketResearch = marketResearch;

    // 분석 결과 히스토리 저장
    const historyTitle = fileName
      ? fileName.replace(/\.[^.]+$/, "")
      : `견적 분석 ${new Date().toLocaleDateString("ko-KR")}`;

    try {
      const { data: saved } = await supabase
        .from("estimate_analyses")
        .insert({ title: historyTitle, file_name: fileName, result })
        .select("id")
        .single();
      if (saved?.id) result.analysisId = saved.id;
    } catch {
      // 저장 실패는 분석 결과 반환에 영향 주지 않음
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "견적 분석 실패" },
      { status: 500 }
    );
  }
}

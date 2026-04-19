import { NextRequest, NextResponse } from "next/server";
import { chat, stripJsonFences } from "@/lib/llm-adapter";
import { parsePptx, slidesToPromptText, extractImagesPerSlide } from "@/lib/pptx-parser";
import type { ParsedSlide } from "@/lib/pptx-parser";
import type { PptPresentation, AnySlide, ImageSlot, SceneSlide, HighlightSlide } from "@/lib/ppt-builder";
import type { ThemeId } from "@/lib/ppt-themes";
import { buildFreeformSystemPrompt, parseFreeformResponse } from "@/lib/freeform-prompt";
import { pickImageForSlide } from "@/lib/image-source";
import { getPreset } from "@/lib/ppt-presets";
import { buildSlideSchema, buildLayoutGuide, buildSlideFewShots } from "@/lib/ppt-prompt-shared";
import { validateAndFixRedesign } from "@/lib/ppt-validator";

const SLIDE_FEW_SHOTS = buildSlideFewShots();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract all text from a parsed slide's fullText */
function slideCharCount(slide: ParsedSlide): number {
  return slide.fullText.replace(/\s+/g, "").length;
}

/** Extract all text chars from a converted slide JSON */
function convertedCharCount(slide: AnySlide): number {
  const s = slide as unknown as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof s.title === "string") parts.push(s.title);
  if (typeof s.subtitle === "string") parts.push(s.subtitle);
  if (typeof s.message === "string") parts.push(s.message);
  if (typeof s.quote === "string") parts.push(s.quote);
  if (Array.isArray(s.bullets)) parts.push(...(s.bullets as string[]));
  if (typeof s.left === "object" && s.left && Array.isArray((s.left as Record<string, unknown>).bullets))
    parts.push(...((s.left as Record<string, string[]>).bullets));
  if (typeof s.right === "object" && s.right && Array.isArray((s.right as Record<string, unknown>).bullets))
    parts.push(...((s.right as Record<string, string[]>).bullets));
  if (Array.isArray(s.items)) {
    for (const item of (s.items as Record<string, string>[])) {
      if (item.heading) parts.push(item.heading);
      if (item.description) parts.push(item.description);
    }
  }
  if (Array.isArray(s.steps)) {
    for (const step of (s.steps as Record<string, string>[])) {
      if (step.label) parts.push(step.label);
      if (step.description) parts.push(step.description);
    }
  }
  if (Array.isArray(s.events)) {
    for (const ev of (s.events as Record<string, string>[])) {
      if (ev.label) parts.push(ev.label);
      if (ev.description) parts.push(ev.description);
    }
  }
  return parts.join("").replace(/\s+/g, "").length;
}

/** Build a content-layout fallback from raw parsed text */
function buildFallbackSlide(orig: ParsedSlide, index: number, total: number): AnySlide {
  const lines = orig.fullText.split("\n").filter((l) => l.trim());
  if (index === 0) {
    return { layout: "title", title: lines[0] ?? "제목", subtitle: lines[1] };
  }
  if (index === total - 1) {
    return { layout: "closing", title: lines[0] ?? "감사합니다", subtitle: lines[1] };
  }
  return { layout: "content", title: lines[0] ?? `슬라이드 ${index + 1}`, bullets: lines.slice(1) };
}

// ─── Core conversion batch ────────────────────────────────────────────────────

async function convertSlideBatch(
  slideText: string,
  batchStart: number,
  totalSlides: number,
  theme: ThemeId,
  presetId?: string,
  llmProvider: "claude" | "openai" | "auto" = "auto",
  llmModel?: string
): Promise<AnySlide[]> {
  const batchSize = (slideText.match(/=== 슬라이드/g) ?? []).length;
  const isFirst = batchStart === 0;
  const isLast = batchStart + batchSize >= totalSlides;

  const preset = getPreset(presetId);
  const sampleDeckInstructions = buildLayoutGuide(preset);

  const systemPrompt = `당신은 맥킨지/BCG 수준의 시니어 프레젠테이션 디자이너입니다.
주어진 PPT 슬라이드 텍스트를 **시각적으로 풍부하고 다채로운** JSON 포맷으로 재설계합니다.

## 원본 보존 규칙 (최우선)
1. 원본 텍스트를 절대 수정·요약·생략하지 마세요. 오타·띄어쓰기도 그대로 유지하세요.
2. 이 배치의 슬라이드 수와 동일한 수의 JSON 객체를 반환하세요 (추가·삭제 금지).
3. 반드시 순수 JSON 배열만 반환하고 마크다운 코드 블록은 사용하지 마세요.
4. 원본 bullet 수를 유지하세요. 긴 줄을 여러 bullet으로 쪼개는 건 허용하지만, bullet을 합치거나 삭제하는 건 금지입니다.
5. 원본 고유명사·숫자·날짜는 일체 변경 금지.

## 제목(title) 필드 규칙 ⚠️ 매우 중요
- **footer/머리말로 반복되는 회사명·부서명·날짜·발표자명은 title로 사용 금지.**
  예: "경영지원그룹", "인사부", "2024.01" 등이 모든 슬라이드 상단/하단에 반복된다면 그건 footer이지 title이 아닙니다.
- 각 슬라이드마다 **서로 다른, 그 슬라이드 내용을 대표하는 한 줄 요약**을 title로 써야 합니다.
- 원본에 명확한 slide title이 없으면, 본문 내용에서 핵심 키워드를 뽑아 10~20자의 제목을 만드세요.
- 연속된 슬라이드에 동일한 title이 2회 이상 나오면 오류입니다.

## 비주얼 재설계 규칙 (품질 향상 포인트)
- 동일한 텍스트라도 **내용의 성격에 맞는 최적 레이아웃**을 적극적으로 선택하세요
- content 레이아웃은 전체의 **25% 이하**로 제한 — 단조로움 방지
- **같은 레이아웃을 연속 2개 이상 반복하지 마세요**
- 내용을 분석해서 자동 매핑:
  * 숫자 3개 이상 비교(%, 금액 등) → **chart_bar**
  * 비율·구성(합계 100%) → **chart_pie**
  * 시계열 추이(분기/연도) → **chart_line**
  * 단일 KPI 수치(2~4개) → **stats** (tag/subtitle/badge/symbol 반드시 채움)
  * 단계·절차(3~5개) → **process**
  * 두 대안/현황↔목표 비교 → **comparison** (vsLabel: "VS")
  * 목차/아젠다 → **agenda** (number는 로마숫자 Ⅰ Ⅱ Ⅲ 권장)
  * 3~6개 특징/기능 → **grid**
  * 연도별 로드맵 → **timeline**
  * 핵심 슬로건·비전 한 줄 → **highlight** (features 배열 3개 이상 필수)
- content 레이아웃을 불가피하게 쓸 때는 \`variant\` 필드 부여:
  * bullets 3-4개 → "cards"
  * bullets 5-9개 → "numbered" 또는 "icon_rows"
  * bullets 10+ → "compact"
  * 특히 강조할 메시지가 있을 땐 → "dashboard"(\`callout\` 필드로 우측 KPI 강조)
- stats 레이아웃: 원본에 수치가 있으면 value에 넣고 단위·증감률을 caption/badge에 분리
- 가능한 한 여러 종류의 레이아웃을 섞어 시각적 다양성 극대화

${sampleDeckInstructions}

${SLIDE_FEW_SHOTS}`;

  const userPrompt = `다음 슬라이드 텍스트 ${batchSize}장을 **다양한 레이아웃을 섞어** JSON으로 변환하세요.
⚠️ 반드시 정확히 ${batchSize}개의 JSON 객체를 반환하세요 (더 많거나 적으면 안 됩니다).
${isFirst ? "⚠️ 가능하면 첫 번째 슬라이드는 title 레이아웃을 사용하세요 (표지가 아니면 content 허용)." : ""}
${isLast ? "⚠️ 가능하면 마지막 슬라이드는 closing 레이아웃을 사용하세요." : ""}

원본 슬라이드:
${slideText}

${buildSlideSchema()}

JSON 배열로만 반환하세요: [ { "layout": "...", ... }, ... ]`;

  const res = await chat({
    provider: llmProvider,
    model: llmModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.15,
    maxTokens: 16384,
  });

  console.log(`[ppt/redesign batch@${batchStart}] ${res.provider}/${res.model} in=${res.usage?.inputTokens} out=${res.usage?.outputTokens}`);
  const raw = res.text || "[]";
  const cleaned = stripJsonFences(raw);

  try {
    const parsed = JSON.parse(cleaned);
    const arr: AnySlide[] = Array.isArray(parsed) ? parsed : (parsed.slides ?? []);
    return arr;
  } catch {
    try { return JSON.parse(`[${cleaned}]`); } catch { return []; }
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const theme = (formData.get("theme") as ThemeId | null) ?? "hana";
    const designMode = (formData.get("designMode") as string | null) ?? "preset";
    const presetId = (formData.get("presetId") as string | null) ?? undefined;
    const providerRaw = formData.get("provider") as string | null;
    const llmProvider: "claude" | "openai" | "auto" =
      providerRaw === "openai" || providerRaw === "claude" ? providerRaw : "auto";
    const modelRaw = formData.get("model") as string | null;
    const llmModel = modelRaw ? modelRaw : undefined;

    if (!file) {
      return NextResponse.json({ error: "PPTX 파일이 없습니다." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pptx") {
      return NextResponse.json({ error: ".pptx 파일만 지원합니다." }, { status: 400 });
    }

    // 1. Parse PPTX (text + images in parallel)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const [parsedSlides, imagesPerSlide] = await Promise.all([
      parsePptx(buffer),
      extractImagesPerSlide(buffer).catch(() => [] as ReturnType<typeof extractImagesPerSlide> extends Promise<infer T> ? T : never),
    ]);

    if (parsedSlides.length === 0) {
      return NextResponse.json(
        { error: "슬라이드를 읽을 수 없습니다. 암호화되지 않은 .pptx 파일인지 확인하세요." },
        { status: 400 }
      );
    }

    const allText = slidesToPromptText(parsedSlides);

    // ── Freeform (scene-based) redesign ──────────────────────────────────────
    if (designMode === "freeform") {
      const systemPrompt = buildFreeformSystemPrompt(theme);
      const userPrompt = `다음은 원본 PPT 슬라이드 텍스트입니다. 총 ${parsedSlides.length}장입니다.
각 슬라이드의 내용을 그대로 유지하면서 시각적으로 풍부한 scene JSON으로 재설계하세요.

원본 내용:
${allText}

규칙:
- 반드시 정확히 ${parsedSlides.length}개의 scene 객체를 반환 (추가/삭제 금지)
- 원본 텍스트를 절대 수정/요약/생략하지 말 것
- 첫 슬라이드는 표지 스타일, 마지막은 마무리 스타일로
- 반드시 순수 JSON 배열만 반환 (마크다운 코드블록 금지)`;

      const isOpus = typeof llmModel === "string" && llmModel.toLowerCase().includes("opus");
      const freeformResponse = await chat({
        provider: llmProvider,
        model: llmModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        maxTokens: isOpus ? 32000 : 16384,
      });

      console.log(`[ppt/redesign freeform] ${freeformResponse.provider}/${freeformResponse.model} in=${freeformResponse.usage?.inputTokens} out=${freeformResponse.usage?.outputTokens}`);
      const rawContent = freeformResponse.text || "[]";
      const sceneSlides = parseFreeformResponse(rawContent, theme, parsedSlides.length);
      console.log(`[ppt/redesign freeform] parsed ${sceneSlides.length} scenes (raw len=${rawContent.length})`);
      if (sceneSlides.length === 0) {
        console.error("[ppt/redesign freeform] PARSE FAILED — raw head:", rawContent.slice(0, 500));
        console.error("[ppt/redesign freeform] raw tail:", rawContent.slice(-500));
      }

      const scenesWithImages: SceneSlide[] = sceneSlides.map((scene, idx) => {
        const imgs = (imagesPerSlide as Array<Array<{ data: string; mime: string; rId: string }>>)[idx] ?? [];
        if (imgs.length === 0) return scene;
        const imgElements = imgs.slice(0, 2).map((img, imgIdx) => ({
          type: "image" as const,
          base64: img.data,
          mime: img.mime,
          x: 6.5,
          y: 1.0 + imgIdx * 2.2,
          w: 3.2,
          h: 2.0,
        }));
        return { ...scene, elements: [...scene.elements, ...imgElements] };
      });

      const freeformTitle =
        scenesWithImages[0]?.title ??
        file.name.replace(/\.pptx$/i, "") ??
        "재디자인 프레젠테이션";

      return NextResponse.json({
        presentation: {
          title: freeformTitle,
          theme,
          ...(presetId && { presetId }),
          slides: scenesWithImages,
        } satisfies PptPresentation,
        originalSlideCount: parsedSlides.length,
      });
    }

    // ── Preset mode redesign ──────────────────────────────────────────────────
    const CHUNK_SIZE = 8;
    const allSlides: AnySlide[] = [];

    for (let i = 0; i < parsedSlides.length; i += CHUNK_SIZE) {
      const chunk = parsedSlides.slice(i, i + CHUNK_SIZE);
      const chunkText = slidesToPromptText(chunk);
      const converted = await convertSlideBatch(chunkText, i, parsedSlides.length, theme, presetId, llmProvider, llmModel);
      allSlides.push(...converted);
    }

    // Guard: ensure output count matches input count
    const expected = parsedSlides.length;
    let slides = allSlides;

    if (slides.length > expected) {
      slides = slides.slice(0, expected);
    } else if (slides.length < expected) {
      for (let i = slides.length; i < expected; i++) {
        slides.push(buildFallbackSlide(parsedSlides[i]!, i, expected));
      }
    }

    // ── Content-fidelity check ────────────────────────────────────────────────
    // If a converted slide retains < 50% of original chars, replace with fallback
    // (raised from 30% → 50% to guard against LLM summarization more aggressively)
    let fallbacksApplied = 0;
    slides = slides.map((slide, i) => {
      const orig = parsedSlides[i];
      if (!orig) return slide;
      const origLen = slideCharCount(orig);
      // Skip very short originals (title-only slides < 20 chars)
      if (origLen < 20) return slide;
      const convLen = convertedCharCount(slide);
      if (convLen < origLen * 0.50) {
        console.warn(
          `[ppt/redesign] slide ${i + 1} fidelity low: orig=${origLen} conv=${convLen} (${Math.round(convLen / origLen * 100)}%) → fallback`
        );
        fallbacksApplied++;
        return buildFallbackSlide(orig, i, expected);
      }
      return slide;
    });
    if (fallbacksApplied > 0) {
      console.log(`[ppt/redesign] ${fallbacksApplied}/${expected} slides used fallback due to low fidelity`);
    }

    // Attach extracted images + Unsplash for highlight slides
    const imagePromises = slides.map(async (slide, idx) => {
      const imgs = (imagesPerSlide as Array<Array<{ data: string; mime: string; rId: string }>>)[idx] ?? [];

      if (slide.layout === "content" && imgs.length > 0) {
        const slots: ImageSlot[] = imgs.map((img) => ({ data: img.data, mime: img.mime }));
        return { ...slide, imageSlots: slots } as AnySlide;
      }

      if (slide.layout === "highlight") {
        const hl = slide as HighlightSlide;
        const imgData = await pickImageForSlide(
          imgs.length > 0 ? imgs.map(img => ({ data: img.data, mime: img.mime })) : undefined,
          hl.message ? hl.message.slice(0, 50) : undefined
        );
        if (imgData) {
          return { ...hl, imageData: imgData.base64, imageMime: imgData.mime } as AnySlide;
        }
      }

      return slide;
    });
    slides = await Promise.all(imagePromises);

    const firstSlide = slides[0] as { title?: string };
    const presentationTitle =
      firstSlide?.title ??
      file.name.replace(/\.pptx$/i, "") ??
      "재디자인 프레젠테이션";

    const rawPresentation: PptPresentation = {
      title: presentationTitle,
      theme,
      ...(presetId && { presetId }),
      slides,
    };

    // Light validator: preserve original bullets/text, but auto-pick content variant
    // and break 3+ consecutive content slides via variant rotation
    const { fixed: presentation, report } = validateAndFixRedesign(rawPresentation);
    console.log("[ppt/redesign] validator report:", report);

    return NextResponse.json({
      presentation,
      originalSlideCount: parsedSlides.length,
    });
  } catch (err) {
    console.error("[ppt/redesign]", err);
    return NextResponse.json(
      { error: "PPTX 재디자인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

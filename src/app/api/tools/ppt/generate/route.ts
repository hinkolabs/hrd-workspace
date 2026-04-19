import { NextRequest, NextResponse } from "next/server";
import { chat, stripJsonFences } from "@/lib/llm-adapter";
import type { PptPresentation } from "@/lib/ppt-builder";
import type { ThemeId } from "@/lib/ppt-themes";
import { buildFreeformSystemPrompt, parseFreeformResponse } from "@/lib/freeform-prompt";
import { getPreset } from "@/lib/ppt-presets";
import { buildSlideSchema, buildLayoutGuide, buildSlideFewShots } from "@/lib/ppt-prompt-shared";
import { validateAndFixPresentation } from "@/lib/ppt-validator";

const PPT_TYPE_LABELS: Record<string, string> = {
  education: "교육/강의 자료",
  report: "보고서/분석 발표",
  proposal: "제안서/기획서",
  general: "범용 프레젠테이션",
};

const SLIDE_SCHEMA_DESCRIPTION = buildSlideSchema();
const SLIDE_FEW_SHOTS = buildSlideFewShots();

function buildSystemPrompt(pptType: string, themeId?: string, presetId?: string) {
  const typeLabel = PPT_TYPE_LABELS[pptType] ?? "범용 프레젠테이션";
  const isHana = themeId === "hana";
  const hanaNote = isHana ? `
- 하나증권 전용 레이아웃(hana_kpi, hana_timeline, hana_divider, hana_matrix, hana_org)을 적극 활용하세요
- 금융 수치/KPI가 있으면 반드시 hana_kpi 레이아웃을 사용하세요` : "";
  const preset = presetId ? getPreset(presetId) : null;
  const sampleDeckNote = buildLayoutGuide(preset);

  return `당신은 맥킨지·BCG 수준의 컨설팅 덱을 만드는 시니어 프레젠테이션 디자이너입니다.
${typeLabel} 형식으로 **정보 밀도가 높고, 수치가 구체적이며, 비주얼 계층이 뚜렷한** PPT 내용을 작성합니다.
${sampleDeckNote}

## 콘텐츠 품질 규칙
- 모든 bullets/items/steps/events는 **최소 3개 이상** (1~2개만 있으면 슬라이드가 비어 보임)
- 제목·단일 라벨은 **8-15자**, bullet/description은 **25-60자** (너무 짧으면 정보 부족, 너무 길면 가독성 저하)
- 가능한 곳은 **구체적 수치, 비율, 날짜, 고유명사**로 채우기 (예: "매출 증가" X → "YoY 매출 +18%" O)
- caption/badge/symbol/source 등 선택 필드를 적극 활용해 정보 밀도를 높이기
- 추상적 표현 지양 ("성공적 수행" → "3개월 내 80% 달성")

## 레이아웃 선택 규칙
- content 레이아웃은 전체의 **25% 이하**로 제한 — 다양한 레이아웃 활용 필수
- 같은 레이아웃을 연속 2개 이상 반복 금지
- content 레이아웃을 쓸 때는 variant 필드로 다양성 확보:
  * bullets 3-4개 → "cards" (기본) 또는 "dashboard"(callout 추가)
  * bullets 5-7개 → "numbered" 또는 "icon_rows"
- 각 레이아웃 적용 기준:
  * 수치/KPI/비율 비교(3개 이상) → **chart_bar** 또는 chart_pie (실제 차트)
  * 트렌드/추이/시계열 → **chart_line**
  * 단일 KPI 카드(3~4개, 수치 강조) → stats (tag/subtitle/badge/symbol 모두 채우기)
  * 단계/순서 → process (steps에 label+description)
  * 목차 → agenda (로마숫자 Ⅰ Ⅱ Ⅲ 권장)
  * 두 옵션 비교 → comparison (AS-IS/TO-BE, 현황/목표)
  * 핵심 메시지 → highlight (features 배열 **필수** 3개 이상)
  * 기간별 실적/로드맵 → timeline
  * SWOT/2×2 매트릭스 → swot 또는 hana_matrix${hanaNote}

${SLIDE_FEW_SHOTS}

- 반드시 순수 JSON만 반환하고 마크다운 코드 블록을 사용하지 마세요
- 사용자가 요청한 슬라이드 수를 정확히 맞추세요`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, topic, pptType, theme, slideCount, outline, documentText, existingData, designMode, presetId, provider, model } = body;
    const llmProvider: "claude" | "openai" | "auto" =
      provider === "openai" || provider === "claude" ? provider : "auto";
    const llmModel = typeof model === "string" ? model : undefined;

    if (!pptType) {
      return NextResponse.json({ error: "PPT 타입은 필수입니다." }, { status: 400 });
    }
    const resolvedTheme = (theme as ThemeId | undefined) ?? "hana";

    const targetCount = Math.min(Math.max(Number(slideCount) || 10, 5), 20);
    const typeLabel = PPT_TYPE_LABELS[pptType] ?? "범용 프레젠테이션";
    let userPrompt = "";

    if (mode === "outline" && outline) {
      const outlineText = outline.slides
        .map((s: {
            title: string;
            keyPoints: string[];
            layout: string;
            subtitle?: string;
            narrative?: string;
            datapoints?: string[];
          }, i: number) => {
          const parts = [`슬라이드 ${i + 1}: [${s.layout}] ${s.title}`];
          if (s.subtitle) parts.push(`  부제: ${s.subtitle}`);
          if (s.narrative) parts.push(`  내러티브: ${s.narrative}`);
          parts.push(`  핵심포인트: ${(s.keyPoints ?? []).join(" / ")}`);
          if (s.datapoints && s.datapoints.length > 0) {
            parts.push(`  데이터포인트: ${s.datapoints.join(" / ")}`);
          }
          return parts.join("\n");
        })
        .join("\n\n");

      userPrompt = `다음 아웃라인을 기반으로 PPT 전체 내용을 생성해주세요.

프레젠테이션 제목: ${outline.presentationTitle}
유형: ${typeLabel}

아웃라인:
${outlineText}

${SLIDE_SCHEMA_DESCRIPTION}

## 본문 확장 규칙
- 각 슬라이드의 narrative(내러티브)와 datapoints(데이터포인트)를 모두 본문에 녹여내세요
- 아웃라인의 keyPoints를 **있는 그대로 사용하지 말고**, 더 구체적이고 풍성한 표현으로 재작성하세요
- bullets/items/steps는 아웃라인의 개수 이상으로 유지 (부족하면 추가 생성)
- 가능한 곳엔 수치·비율·날짜를 반드시 포함

위 아웃라인의 순서와 레이아웃을 유지하면서 각 슬라이드의 실제 내용을 풍부하게 채워서 다음 JSON 형식으로 반환하세요:
{
  "title": "${outline.presentationTitle}",
  "theme": "${resolvedTheme}",
  "slides": [ ... ]
}`;
    } else if (mode === "document" && documentText) {
      userPrompt = `다음 문서 내용을 분석하여 ${typeLabel} PPT로 변환해주세요.

문서 내용:
---
${documentText.slice(0, 8000)}
---

요청 슬라이드 수: 약 ${targetCount}장

${SLIDE_SCHEMA_DESCRIPTION}

문서의 핵심 내용을 추출하고 발표 자료로 재구성하여 다음 JSON 형식으로 반환하세요:
{
  "title": "적절한 프레젠테이션 제목",
  "theme": "${resolvedTheme}",
  "slides": [ ... ]
}

반드시 첫 슬라이드는 "title", 마지막 슬라이드는 "closing" 레이아웃을 사용하세요.`;
    } else if (mode === "data" && existingData) {
      userPrompt = `다음 데이터를 기반으로 ${typeLabel} PPT를 생성해주세요.

데이터 유형: ${existingData.type}
제목: ${existingData.title}

내용:
---
${JSON.stringify(existingData.content, null, 2).slice(0, 6000)}
---

요청 슬라이드 수: 약 ${targetCount}장

${SLIDE_SCHEMA_DESCRIPTION}

데이터를 발표 자료로 구성하여 다음 JSON 형식으로 반환하세요:
{
  "title": "적절한 프레젠테이션 제목",
  "theme": "${resolvedTheme}",
  "slides": [ ... ]
}

반드시 첫 슬라이드는 "title", 마지막 슬라이드는 "closing" 레이아웃을 사용하세요.`;
    } else {
      // Mode: topic (direct generation)
      if (!topic) {
        return NextResponse.json({ error: "주제는 필수입니다." }, { status: 400 });
      }

      userPrompt = `주제: ${topic}
PPT 유형: ${typeLabel}
슬라이드 수: ${targetCount}장

${SLIDE_SCHEMA_DESCRIPTION}

위 주제로 전문적인 ${typeLabel} PPT를 생성해주세요.
다음 JSON 형식으로 반환하세요:
{
  "title": "프레젠테이션 제목",
  "theme": "${resolvedTheme}",
  "slides": [ ... ]
}

구성 권장사항:
- 첫 번째: title (표지)
- 두 번째: agenda (목차) - 전체 내용을 번호로 정리
- 중간: section + process + grid + stats + timeline + comparison + swot 등 다양하게 활용
- content 레이아웃은 전체의 30% 이하로 제한하세요
- stats에는 tag, subtitle, badge, symbol 필드를 적극 활용하세요
- highlight에는 features 배열을 적극 활용하세요${resolvedTheme === "hana" ? "\n- 하나증권 전용 레이아웃(hana_kpi, hana_timeline, hana_divider, hana_matrix, hana_org)을 적극 활용하세요" : ""}
- 마지막: closing (마무리)`;
    }

    // ── Freeform (scene-based) mode ──────────────────────────────────────────
    if (designMode === "freeform") {
      const themeId = resolvedTheme;
      const systemPrompt = buildFreeformSystemPrompt(themeId);
      const freeformUserPrompt = `다음 내용으로 ${targetCount}장의 슬라이드를 scene JSON 배열로 생성하세요.
${userPrompt}

중요: 정확히 ${targetCount}개의 scene 객체를 JSON 배열로 반환하세요.
첫 슬라이드는 표지(title), 마지막 슬라이드는 마무리(closing) 스타일로 설계하세요.
반드시 순수 JSON 배열만 반환하고 마크다운 코드블록을 절대 사용하지 마세요.`;

      const isOpus = typeof llmModel === "string" && llmModel.toLowerCase().includes("opus");
      const freeformResponse = await chat({
        provider: llmProvider,
        model: llmModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: freeformUserPrompt },
        ],
        temperature: 0.3,
        maxTokens: isOpus ? 32000 : 16384,
      });

      console.log(`[ppt/generate freeform] ${freeformResponse.provider}/${freeformResponse.model} in=${freeformResponse.usage?.inputTokens} out=${freeformResponse.usage?.outputTokens}`);
      const rawContent = freeformResponse.text || "[]";
      const sceneSlides = parseFreeformResponse(rawContent, themeId, targetCount);
      console.log(`[ppt/generate freeform] parsed ${sceneSlides.length} scenes (raw len=${rawContent.length})`);

      if (sceneSlides.length === 0) {
        console.error("[ppt/generate freeform] PARSE FAILED — raw head:", rawContent.slice(0, 500));
        console.error("[ppt/generate freeform] raw tail:", rawContent.slice(-500));
        return NextResponse.json({ error: "Freeform 슬라이드 생성에 실패했습니다. (AI 응답 형식 오류)" }, { status: 500 });
      }

      const titleSlide = sceneSlides[0];
      const presentationTitle =
        (titleSlide?.title ?? topic ?? "프레젠테이션").slice(0, 60);

      const freeformPresentation: PptPresentation = {
        title: presentationTitle,
        theme: themeId,
        ...(presetId && { presetId }),
        slides: sceneSlides,
      };
      return NextResponse.json(freeformPresentation);
    }

    // ── Preset mode ───────────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(pptType, resolvedTheme, presetId as string | undefined) +
      "\n\n응답은 반드시 `{ \"title\": ..., \"theme\": ..., \"slides\": [...] }` JSON 객체 하나여야 합니다. 마크다운 코드펜스 금지.";
    const response = await chat({
      provider: llmProvider,
      model: llmModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      maxTokens: 16384,
    });

    console.log(`[ppt/generate] ${response.provider}/${response.model} in=${response.usage?.inputTokens} out=${response.usage?.outputTokens}`);
    const content = response.text;
    if (!content) {
      return NextResponse.json({ error: "AI 응답이 비어있습니다." }, { status: 500 });
    }

    const rawPresentation: PptPresentation = JSON.parse(stripJsonFences(content));

    // Ensure theme and presetId are set correctly
    rawPresentation.theme = resolvedTheme;
    if (presetId) rawPresentation.presetId = presetId;

    // Post-generation quality gate: pad sparse slides, break repetition, cap content ratio
    const { fixed: presentation, report } = validateAndFixPresentation(rawPresentation);
    console.log("[ppt/generate] validator report:", report);

    return NextResponse.json(presentation);
  } catch (err) {
    console.error("[ppt/generate]", err);
    return NextResponse.json({ error: "슬라이드 내용 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

/**
 * Renders a SceneSlide to a pptxgenjs slide using primitive drawing elements.
 * Elements are drawn in array order (first = bottom z-order).
 *
 * Supports two primitive tiers:
 *   Tier 1: rect, ellipse, line, text, icon, image
 *   Tier 2: shape (any prstGeom), table, chart, richText
 */

import pptxgen from "pptxgenjs";
import type {
  Primitive,
  SceneSlide,
  GradientFill,
  ShapeStyle,
} from "./ppt-builder";
import { PPT_THEMES, type ThemeId } from "./ppt-themes";
import { fetchIconAsPng, getIconMime } from "./iconify-client";

const SLIDE_W = 10;
const SLIDE_H = 5.625;

function h(hexColor: string): string {
  return hexColor.replace("#", "");
}

function toTransparency(opacity?: number): number {
  if (opacity === undefined || opacity >= 1) return 0;
  if (opacity <= 0) return 100;
  return Math.round((1 - opacity) * 100);
}

/** Resolve a fill value (string or GradientFill object) to a pptxgenjs fill option. */
function resolveFill(
  fill: string | GradientFill | undefined,
  fallback = "FFFFFF",
  opacity?: number
): pptxgen.ShapeFillProps {
  const transparency = toTransparency(opacity);
  if (!fill) return { color: fallback, transparency };
  if (typeof fill === "string") return { color: h(fill), transparency };
  if (fill.type === "solid") {
    return {
      color: h(fill.color),
      transparency: toTransparency(fill.opacity ?? opacity),
    };
  }
  if (fill.type === "gradient") {
    // pptxgenjs doesn't support native gradient on shapes cleanly.
    // Approximate by using the first color as the main fill.
    return { color: h(fill.colors[0] ?? fallback), transparency };
  }
  return { color: fallback, transparency };
}

function resolveBorder(
  border?: { color: string; pt: number; dash?: string }
): pptxgen.ShapeLineProps | undefined {
  if (!border) return undefined;
  const dashMap: Record<string, pptxgen.ShapeLineProps["dashType"]> = {
    solid: "solid", dash: "dash", dot: "sysDot",
  };
  return {
    color: h(border.color),
    width: border.pt,
    dashType: border.dash ? dashMap[border.dash] ?? "solid" : "solid",
  };
}

function toShapeType(pres: pptxgen, name: string): pptxgen.SHAPE_NAME {
  const ST = pres.ShapeType as unknown as Record<string, pptxgen.SHAPE_NAME>;
  if (name in ST) return ST[name]!;
  // Fallback map for common names
  const aliases: Record<string, string> = {
    roundRect: "roundRect",
    round1Rect: "round1Rect",
    round2SameRect: "round2SameRect",
    star: "star5",
  };
  const mapped = aliases[name];
  if (mapped && mapped in ST) return ST[mapped]!;
  return ST.rect!;
}

async function renderElement(
  pres: pptxgen,
  slide: pptxgen.Slide,
  el: Primitive,
  defaultFont: string
): Promise<void> {
  switch (el.type) {
    case "rect": {
      const fill = resolveFill(el.fill, "FFFFFF", el.opacity);
      const line = resolveBorder(el.border) ?? { color: (fill.color as string) ?? "FFFFFF", transparency: 100 };
      const shapeType = el.radius && el.radius > 0
        ? pres.ShapeType.roundRect
        : pres.ShapeType.rect;
      const opts: pptxgen.ShapeProps = {
        x: el.x, y: el.y, w: el.w, h: el.h, fill, line,
      };
      if (el.radius && el.radius > 0) opts.rectRadius = el.radius;
      if (el.shadow) {
        opts.shadow = {
          type: "outer",
          blur: 8,
          offset: 2,
          angle: 90,
          color: "000000",
          opacity: 0.25,
        };
      }
      slide.addShape(shapeType, opts);
      break;
    }

    case "ellipse": {
      const fill = resolveFill(el.fill, "FFFFFF", el.opacity);
      const line = resolveBorder(el.border) ?? { color: (fill.color as string) ?? "FFFFFF", transparency: 100 };
      const opts: pptxgen.ShapeProps = {
        x: el.x, y: el.y, w: el.w, h: el.h, fill, line,
      };
      if (el.shadow) {
        opts.shadow = {
          type: "outer", blur: 8, offset: 2, angle: 90, color: "000000", opacity: 0.25,
        };
      }
      slide.addShape(pres.ShapeType.ellipse, opts);
      break;
    }

    case "line": {
      const color = el.color ? h(el.color) : "000000";
      const pt = el.thickness ?? 1;
      const dx = el.x2 - el.x1;
      const dy = el.y2 - el.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.005) break;

      const hasArrow = el.arrowHead || el.arrowTail;
      const dashMap: Record<string, pptxgen.ShapeLineProps["dashType"]> = {
        solid: "solid", dash: "dash", dot: "sysDot", dashDot: "dashDot",
      };
      const lineProps: pptxgen.ShapeLineProps = { color, width: pt };
      if (el.dashStyle) lineProps.dashType = dashMap[el.dashStyle] ?? "solid";
      if (el.arrowHead && el.arrowHead !== "none") {
        lineProps.endArrowType = el.arrowHead;
      }
      if (el.arrowTail && el.arrowTail !== "none") {
        lineProps.beginArrowType = el.arrowTail;
      }

      if (!hasArrow && Math.abs(dy) <= 0.005) {
        const lineH = pt / 72;
        slide.addShape(pres.ShapeType.rect, {
          x: Math.min(el.x1, el.x2),
          y: el.y1 - lineH / 2,
          w: Math.abs(dx),
          h: Math.max(lineH, 0.02),
          fill: { color },
          line: { color, transparency: 100 },
        });
      } else if (!hasArrow && Math.abs(dx) <= 0.005) {
        const lineW = pt / 72;
        slide.addShape(pres.ShapeType.rect, {
          x: el.x1 - lineW / 2,
          y: Math.min(el.y1, el.y2),
          w: Math.max(lineW, 0.02),
          h: Math.abs(dy),
          fill: { color },
          line: { color, transparency: 100 },
        });
      } else {
        slide.addShape(pres.ShapeType.line, {
          x: el.x1, y: el.y1, w: dx, h: dy, line: lineProps,
        });
      }
      break;
    }

    case "text": {
      const color = el.color ? h(el.color) : "000000";
      const fontFace = el.fontFace ?? defaultFont;
      const opts: pptxgen.TextPropsOptions = {
        x: el.x, y: el.y, w: el.w, h: el.h,
        fontSize: el.fontSize ?? 14,
        fontFace,
        color,
        bold: el.bold ?? false,
        italic: el.italic ?? false,
        underline: el.underline ? { style: "sng" } : undefined,
        align: (el.align ?? "left") as pptxgen.HAlign,
        valign: (el.valign ?? "middle") as pptxgen.VAlign,
        wrap: true,
        lineSpacingMultiple: el.lineSpacingMultiple ?? 1.15,
      };
      if (el.fill) opts.fill = { color: h(el.fill) };
      slide.addText(el.text, opts);
      break;
    }

    case "icon": {
      try {
        const svgBase64 = await fetchIconAsPng(el.name, el.color ?? "#000000");
        if (svgBase64) {
          const mime = getIconMime();
          slide.addImage({
            data: `data:${mime};base64,${svgBase64}`,
            x: el.x, y: el.y, w: el.w, h: el.h,
          });
        }
      } catch {
        /* silently skip */
      }
      break;
    }

    case "image": {
      try {
        const imgOpts: pptxgen.ImageProps = {
          data: `data:${el.mime};base64,${el.base64}`,
          x: el.x, y: el.y, w: el.w, h: el.h,
        };
        if (el.border) {
          // pptxgenjs image has no direct border; draw a rect behind/around
          slide.addShape(pres.ShapeType.rect, {
            x: el.x - el.border.pt / 144,
            y: el.y - el.border.pt / 144,
            w: el.w + el.border.pt / 72,
            h: el.h + el.border.pt / 72,
            fill: { color: h(el.border.color) },
            line: { color: h(el.border.color) },
          });
        }
        slide.addImage(imgOpts);
      } catch {
        /* skip */
      }
      break;
    }

    case "shape": {
      const shapeType = toShapeType(pres, el.shape);
      const style: ShapeStyle = el.style ?? {};
      const fill = resolveFill(style.fill, "FFFFFF", style.opacity);
      const line = resolveBorder(style.border) ?? { color: (fill.color as string) ?? "FFFFFF", transparency: 100 };
      const opts: pptxgen.ShapeProps = {
        x: el.x, y: el.y, w: el.w, h: el.h, fill, line,
      };
      if (el.rotate) opts.rotate = el.rotate;
      if (style.shadow) {
        opts.shadow = {
          type: "outer", blur: 8, offset: 2, angle: 90, color: "000000", opacity: 0.3,
        };
      }
      slide.addShape(shapeType, opts);
      if (el.text) {
        slide.addText(el.text, {
          x: el.x, y: el.y, w: el.w, h: el.h,
          fontSize: el.fontSize ?? 14,
          fontFace: el.fontFace ?? defaultFont,
          color: el.color ? h(el.color) : "000000",
          bold: el.bold ?? false,
          align: (el.align ?? "center") as pptxgen.HAlign,
          valign: (el.valign ?? "middle") as pptxgen.VAlign,
          wrap: true,
        });
      }
      break;
    }

    case "table": {
      const cellRows = el.cells.map((row) =>
        row.map((cell): pptxgen.TableCell => ({
          text: cell.text,
          options: {
            bold: cell.bold ?? false,
            italic: cell.italic ?? false,
            color: cell.color ? h(cell.color) : "262626",
            fill: cell.fill ? { color: h(cell.fill) } : undefined,
            fontSize: cell.fontSize ?? el.defaultFontSize ?? 11,
            fontFace: cell.fontFace ?? el.defaultFontFace ?? defaultFont,
            align: (cell.align ?? "left") as pptxgen.HAlign,
            valign: (cell.valign ?? "middle") as pptxgen.VAlign,
            colspan: cell.colspan,
            rowspan: cell.rowspan,
          },
        }))
      );
      const borderOpt: pptxgen.BorderProps = el.border
        ? { type: "solid", pt: el.border.pt, color: h(el.border.color) }
        : { type: "solid", pt: 0.5, color: "CCCCCC" };
      slide.addTable(cellRows, {
        x: el.x, y: el.y, w: el.w, h: el.h,
        colW: el.colW,
        rowH: el.rowH,
        border: borderOpt,
        fontFace: el.defaultFontFace ?? defaultFont,
        fontSize: el.defaultFontSize ?? 11,
      });
      break;
    }

    case "chart": {
      // pptxgenjs chart types: BAR, BAR3D, PIE, DOUGHNUT, LINE, AREA
      const chartMap: Record<string, pptxgen.CHART_NAME> = {
        bar: pres.ChartType.bar,
        bar3d: pres.ChartType.bar3d,
        pie: pres.ChartType.pie,
        doughnut: pres.ChartType.doughnut,
        line: pres.ChartType.line,
        area: pres.ChartType.area,
      };
      const chartType = chartMap[el.chartType] ?? pres.ChartType.bar;
      // Build data in pptxgenjs format
      // For pie/doughnut: only first series' labels/values are used
      const isPieLike = el.chartType === "pie" || el.chartType === "doughnut";
      let data: pptxgen.OptsChartData[];
      if (isPieLike) {
        const s = el.series[0]!;
        data = [{ name: s.name, labels: s.labels, values: s.values }];
      } else {
        data = el.series.map((s) => ({
          name: s.name,
          labels: s.labels,
          values: s.values,
        }));
      }
      const chartOpts: pptxgen.IChartOpts = {
        x: el.x, y: el.y, w: el.w, h: el.h,
        showTitle: Boolean(el.title),
        title: el.title,
        showLegend: el.showLegend ?? true,
        legendPos: "b",
        showValue: el.showValue ?? false,
        chartColors: el.colors?.map((c) => h(c)),
        fontFace: defaultFont,
        titleFontFace: defaultFont,
        catAxisLabelFontFace: defaultFont,
        valAxisLabelFontFace: defaultFont,
      };
      if (el.chartType === "bar" && el.barDir) chartOpts.barDir = el.barDir;
      try {
        slide.addChart(chartType, data as pptxgen.OptsChartData[], chartOpts);
      } catch {
        // Fallback: render title as text if chart fails
        slide.addText(el.title ?? "차트", {
          x: el.x, y: el.y, w: el.w, h: el.h,
          fontSize: 14, color: "888888",
          align: "center", valign: "middle",
        });
      }
      break;
    }

    case "richText": {
      const textItems: pptxgen.TextProps[] = el.runs.map((r) => ({
        text: r.text,
        options: {
          bold: r.bold ?? false,
          italic: r.italic ?? false,
          underline: r.underline ? { style: "sng" } : undefined,
          color: r.color ? h(r.color) : "262626",
          fontSize: r.fontSize ?? 14,
          fontFace: r.fontFace ?? el.fontFace ?? defaultFont,
        },
      }));
      slide.addText(textItems, {
        x: el.x, y: el.y, w: el.w, h: el.h,
        align: (el.align ?? "left") as pptxgen.HAlign,
        valign: (el.valign ?? "middle") as pptxgen.VAlign,
        fontFace: el.fontFace ?? defaultFont,
        wrap: true,
        lineSpacingMultiple: el.lineSpacingMultiple ?? 1.15,
        fill: el.fill ? { color: h(el.fill) } : undefined,
      });
      break;
    }
  }
}

export async function renderSceneSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  scene: SceneSlide,
  fontOrThemeId: string
): Promise<void> {
  const isThemeId = fontOrThemeId in PPT_THEMES;
  const defaultFont = isThemeId
    ? (PPT_THEMES[fontOrThemeId as ThemeId]?.fonts.body ?? "하나2.0 M")
    : fontOrThemeId;

  if (scene.background) {
    const bgColor = scene.background.replace("#", "");
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
      fill: { color: bgColor },
      line: { color: bgColor, transparency: 100 },
    });
  }

  for (const el of scene.elements ?? []) {
    await renderElement(pres, slide, el, defaultFont);
  }

  if (scene.notes) {
    slide.addNotes(scene.notes);
  }
}

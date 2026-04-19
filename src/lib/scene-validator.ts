/**
 * Validates and sanitises a raw GPT-4o SceneSlide JSON object.
 * Clamps coordinates, fixes hex colours, enforces icon allowlist.
 */

import type {
  Primitive,
  SceneSlide,
  GradientFill,
  ShapeStyle,
  TextRun,
  TableCellSpec,
  ChartSeries,
} from "./ppt-builder";

const SLIDE_W = 10;
const SLIDE_H = 5.625;
const HEX6_RE = /^[0-9A-Fa-f]{6}$/;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

const ALLOWED_COLLECTIONS = new Set([
  "mdi",
  "material-symbols",
  "ph",
  "tabler",
  "heroicons",
  "lucide",
  "bi",
  "ri",
  "carbon",
]);

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function sanitizeColor(c: unknown, fallback = "#000000"): string {
  if (typeof c !== "string") return fallback;
  const s = c.trim();
  if (HEX_COLOR_RE.test(s)) return s;
  if (HEX6_RE.test(s)) return `#${s}`;
  return fallback;
}

function sanitizeFill(f: unknown, fallback = "#FFFFFF"): string | GradientFill {
  if (typeof f === "string") return sanitizeColor(f, fallback);
  if (f && typeof f === "object") {
    const obj = f as Record<string, unknown>;
    if (obj.type === "gradient" && Array.isArray(obj.colors)) {
      const colors = obj.colors
        .filter((c): c is string => typeof c === "string")
        .map((c) => sanitizeColor(c, fallback));
      if (colors.length >= 2) {
        return {
          type: "gradient",
          colors,
          angle: typeof obj.angle === "number" ? clamp(obj.angle, 0, 360) : 90,
        };
      }
    }
    if (obj.type === "solid" && typeof obj.color === "string") {
      return {
        type: "solid",
        color: sanitizeColor(obj.color, fallback),
        opacity: typeof obj.opacity === "number" ? clamp(obj.opacity, 0, 1) : undefined,
      };
    }
  }
  return fallback;
}

function sanitizeShapeStyle(s: unknown): ShapeStyle | undefined {
  if (!s || typeof s !== "object") return undefined;
  const obj = s as Record<string, unknown>;
  const style: ShapeStyle = {};
  if (obj.fill !== undefined) style.fill = sanitizeFill(obj.fill, "#FFFFFF");
  if (typeof obj.opacity === "number") style.opacity = clamp(obj.opacity, 0, 1);
  if (obj.border && typeof obj.border === "object") {
    const b = obj.border as Record<string, unknown>;
    style.border = {
      color: sanitizeColor(b.color, "#000000"),
      pt: typeof b.pt === "number" ? clamp(b.pt, 0.25, 8) : 1,
      dash: ["solid", "dash", "dot"].includes(b.dash as string)
        ? (b.dash as "solid" | "dash" | "dot") : "solid",
    };
  }
  if (obj.shadow === true) style.shadow = true;
  return style;
}

function sanitizeTextRun(r: unknown): TextRun | null {
  if (!r || typeof r !== "object") return null;
  const obj = r as Record<string, unknown>;
  if (typeof obj.text !== "string") return null;
  return {
    text: obj.text,
    color: typeof obj.color === "string" ? sanitizeColor(obj.color) : undefined,
    fontSize: typeof obj.fontSize === "number" ? clamp(obj.fontSize, 6, 96) : undefined,
    bold: obj.bold === true ? true : undefined,
    italic: obj.italic === true ? true : undefined,
    underline: obj.underline === true ? true : undefined,
    fontFace: typeof obj.fontFace === "string" ? obj.fontFace : undefined,
  };
}

function sanitizeTableCell(c: unknown): TableCellSpec {
  if (!c || typeof c !== "object") return { text: "" };
  const obj = c as Record<string, unknown>;
  return {
    text: typeof obj.text === "string" ? obj.text : String(obj.text ?? ""),
    fill: typeof obj.fill === "string" ? sanitizeColor(obj.fill) : undefined,
    color: typeof obj.color === "string" ? sanitizeColor(obj.color) : undefined,
    bold: obj.bold === true ? true : undefined,
    italic: obj.italic === true ? true : undefined,
    fontSize: typeof obj.fontSize === "number" ? clamp(obj.fontSize, 6, 36) : undefined,
    fontFace: typeof obj.fontFace === "string" ? obj.fontFace : undefined,
    align: ["left", "center", "right"].includes(obj.align as string)
      ? (obj.align as "left" | "center" | "right") : undefined,
    valign: ["top", "middle", "bottom"].includes(obj.valign as string)
      ? (obj.valign as "top" | "middle" | "bottom") : undefined,
    colspan: typeof obj.colspan === "number" ? Math.max(1, Math.floor(obj.colspan)) : undefined,
    rowspan: typeof obj.rowspan === "number" ? Math.max(1, Math.floor(obj.rowspan)) : undefined,
  };
}

function sanitizeChartSeries(s: unknown): ChartSeries | null {
  if (!s || typeof s !== "object") return null;
  const obj = s as Record<string, unknown>;
  const labels = Array.isArray(obj.labels)
    ? obj.labels.filter((v): v is string => typeof v === "string") : [];
  const values = Array.isArray(obj.values)
    ? obj.values.filter((v): v is number => typeof v === "number" && isFinite(v)) : [];
  if (labels.length === 0 || values.length === 0) return null;
  const n = Math.min(labels.length, values.length);
  return {
    name: typeof obj.name === "string" ? obj.name : "Series",
    labels: labels.slice(0, n),
    values: values.slice(0, n),
  };
}

function sanitizePrimitive(raw: unknown): Primitive | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;

  switch (e.type) {
    case "rect": {
      const x = typeof e.x === "number" ? e.x : 0;
      const y = typeof e.y === "number" ? e.y : 0;
      const w = typeof e.w === "number" ? e.w : 1;
      const h = typeof e.h === "number" ? e.h : 1;
      return {
        type: "rect",
        // Rects can go a bit outside for decorative bleed effects
        x: clamp(x, -8, SLIDE_W + 6),
        y: clamp(y, -8, SLIDE_H + 6),
        w: clamp(w, 0.01, SLIDE_W + 12),
        h: clamp(h, 0.01, SLIDE_H + 12),
        fill: sanitizeFill(e.fill, "#FFFFFF"),
        opacity: typeof e.opacity === "number"
          ? clamp(e.opacity, 0, 1) : undefined,
        radius: typeof e.radius === "number" ? clamp(e.radius, 0, 1) : undefined,
        border: e.border && typeof e.border === "object"
          ? {
              color: sanitizeColor((e.border as Record<string, unknown>).color, "#000000"),
              pt: typeof (e.border as Record<string, unknown>).pt === "number"
                ? clamp((e.border as Record<string, number>).pt, 0.25, 8) : 1,
            } : undefined,
        shadow: e.shadow === true ? true : undefined,
      };
    }

    case "ellipse": {
      const x = typeof e.x === "number" ? e.x : 0;
      const y = typeof e.y === "number" ? e.y : 0;
      const w = typeof e.w === "number" ? e.w : 1;
      const h = typeof e.h === "number" ? e.h : 1;
      return {
        type: "ellipse",
        x: clamp(x, -10, SLIDE_W + 8),
        y: clamp(y, -10, SLIDE_H + 8),
        w: clamp(w, 0.01, SLIDE_W + 14),
        h: clamp(h, 0.01, SLIDE_H + 14),
        fill: sanitizeFill(e.fill, "#FFFFFF"),
        opacity: typeof e.opacity === "number"
          ? clamp(e.opacity, 0, 1) : undefined,
        border: e.border && typeof e.border === "object"
          ? {
              color: sanitizeColor((e.border as Record<string, unknown>).color, "#000000"),
              pt: typeof (e.border as Record<string, unknown>).pt === "number"
                ? clamp((e.border as Record<string, number>).pt, 0.25, 8) : 1,
            } : undefined,
        shadow: e.shadow === true ? true : undefined,
      };
    }

    case "line": {
      return {
        type: "line",
        x1: clamp(typeof e.x1 === "number" ? e.x1 : 0, -2, SLIDE_W + 2),
        y1: clamp(typeof e.y1 === "number" ? e.y1 : 0, -2, SLIDE_H + 2),
        x2: clamp(typeof e.x2 === "number" ? e.x2 : 1, -2, SLIDE_W + 2),
        y2: clamp(typeof e.y2 === "number" ? e.y2 : 0, -2, SLIDE_H + 2),
        color: sanitizeColor(e.color, "#000000"),
        thickness: typeof e.thickness === "number"
          ? clamp(e.thickness, 0.25, 12) : 1,
        dashStyle: ["solid", "dash", "dot", "dashDot"].includes(e.dashStyle as string)
          ? (e.dashStyle as "solid" | "dash" | "dot" | "dashDot") : undefined,
        arrowHead: ["none", "triangle", "arrow"].includes(e.arrowHead as string)
          ? (e.arrowHead as "none" | "triangle" | "arrow") : undefined,
        arrowTail: ["none", "triangle", "arrow"].includes(e.arrowTail as string)
          ? (e.arrowTail as "none" | "triangle" | "arrow") : undefined,
      };
    }

    case "text": {
      if (typeof e.text !== "string") return null;
      return {
        type: "text",
        x: clamp(typeof e.x === "number" ? e.x : 0, -2, SLIDE_W + 2),
        y: clamp(typeof e.y === "number" ? e.y : 0, -2, SLIDE_H + 2),
        w: clamp(typeof e.w === "number" ? e.w : 2, 0.1, SLIDE_W + 4),
        h: clamp(typeof e.h === "number" ? e.h : 0.5, 0.05, SLIDE_H + 4),
        text: e.text,
        fontSize: typeof e.fontSize === "number"
          ? clamp(e.fontSize, 7, 96) : 14,
        color: sanitizeColor(e.color, "#000000"),
        bold: e.bold === true,
        italic: e.italic === true,
        underline: e.underline === true ? true : undefined,
        align: ["left", "center", "right"].includes(e.align as string)
          ? (e.align as "left" | "center" | "right") : "left",
        valign: ["top", "middle", "bottom"].includes(e.valign as string)
          ? (e.valign as "top" | "middle" | "bottom") : "middle",
        fontFace: typeof e.fontFace === "string" ? e.fontFace : undefined,
        fill: typeof e.fill === "string" ? sanitizeColor(e.fill) : undefined,
        lineSpacingMultiple: typeof e.lineSpacingMultiple === "number"
          ? clamp(e.lineSpacingMultiple, 0.8, 2.5) : undefined,
      };
    }

    case "icon": {
      if (typeof e.name !== "string") return null;
      const colonIdx = e.name.indexOf(":");
      const collection = colonIdx > 0 ? e.name.slice(0, colonIdx) : "";
      if (!ALLOWED_COLLECTIONS.has(collection)) {
        // Replace with a small colored square placeholder
        return {
          type: "rect",
          x: clamp(typeof e.x === "number" ? e.x : 0, 0, SLIDE_W),
          y: clamp(typeof e.y === "number" ? e.y : 0, 0, SLIDE_H),
          w: clamp(typeof e.w === "number" ? e.w : 0.4, 0.1, 2),
          h: clamp(typeof e.h === "number" ? e.h : 0.4, 0.1, 2),
          fill: sanitizeColor(e.color, "#888888"),
          opacity: 0.5,
        };
      }
      return {
        type: "icon",
        name: e.name,
        x: clamp(typeof e.x === "number" ? e.x : 0, -1, SLIDE_W),
        y: clamp(typeof e.y === "number" ? e.y : 0, -1, SLIDE_H),
        w: clamp(typeof e.w === "number" ? e.w : 0.5, 0.1, 4),
        h: clamp(typeof e.h === "number" ? e.h : 0.5, 0.1, 4),
        color: sanitizeColor(e.color, "#000000"),
      };
    }

    case "image": {
      if (typeof e.base64 !== "string") return null;
      return {
        type: "image",
        base64: e.base64,
        mime: typeof e.mime === "string" ? e.mime : "image/png",
        x: clamp(typeof e.x === "number" ? e.x : 0, 0, SLIDE_W - 0.1),
        y: clamp(typeof e.y === "number" ? e.y : 0, 0, SLIDE_H - 0.1),
        w: clamp(typeof e.w === "number" ? e.w : 2, 0.1, SLIDE_W),
        h: clamp(typeof e.h === "number" ? e.h : 2, 0.1, SLIDE_H),
        border: e.border && typeof e.border === "object"
          ? {
              color: sanitizeColor((e.border as Record<string, unknown>).color, "#000000"),
              pt: typeof (e.border as Record<string, unknown>).pt === "number"
                ? clamp((e.border as Record<string, number>).pt, 0.25, 8) : 1,
            } : undefined,
      };
    }

    case "shape": {
      if (typeof e.shape !== "string") return null;
      return {
        type: "shape",
        shape: e.shape,
        x: clamp(typeof e.x === "number" ? e.x : 0, -2, SLIDE_W + 2),
        y: clamp(typeof e.y === "number" ? e.y : 0, -2, SLIDE_H + 2),
        w: clamp(typeof e.w === "number" ? e.w : 1, 0.05, SLIDE_W + 4),
        h: clamp(typeof e.h === "number" ? e.h : 1, 0.05, SLIDE_H + 4),
        style: sanitizeShapeStyle(e.style),
        rotate: typeof e.rotate === "number" ? clamp(e.rotate, -360, 360) : undefined,
        text: typeof e.text === "string" ? e.text : undefined,
        fontSize: typeof e.fontSize === "number" ? clamp(e.fontSize, 6, 72) : undefined,
        color: typeof e.color === "string" ? sanitizeColor(e.color) : undefined,
        bold: e.bold === true ? true : undefined,
        align: ["left", "center", "right"].includes(e.align as string)
          ? (e.align as "left" | "center" | "right") : undefined,
        valign: ["top", "middle", "bottom"].includes(e.valign as string)
          ? (e.valign as "top" | "middle" | "bottom") : undefined,
        fontFace: typeof e.fontFace === "string" ? e.fontFace : undefined,
      };
    }

    case "table": {
      if (!Array.isArray(e.cells)) return null;
      const rawRows = e.cells as unknown[];
      const cells: TableCellSpec[][] = rawRows
        .filter((r): r is unknown[] => Array.isArray(r))
        .map((r) => (r as unknown[]).map(sanitizeTableCell));
      if (cells.length === 0 || cells[0]!.length === 0) return null;
      return {
        type: "table",
        x: clamp(typeof e.x === "number" ? e.x : 0.3, 0, SLIDE_W),
        y: clamp(typeof e.y === "number" ? e.y : 0.8, 0, SLIDE_H),
        w: clamp(typeof e.w === "number" ? e.w : SLIDE_W - 0.6, 0.5, SLIDE_W),
        h: clamp(typeof e.h === "number" ? e.h : 3, 0.3, SLIDE_H),
        cells,
        colW: Array.isArray(e.colW)
          ? (e.colW as number[]).filter((v) => typeof v === "number") : undefined,
        rowH: Array.isArray(e.rowH)
          ? (e.rowH as number[]).filter((v) => typeof v === "number") : undefined,
        border: e.border && typeof e.border === "object"
          ? {
              color: sanitizeColor((e.border as Record<string, unknown>).color, "#CCCCCC"),
              pt: typeof (e.border as Record<string, unknown>).pt === "number"
                ? clamp((e.border as Record<string, number>).pt, 0.25, 4) : 0.5,
            } : undefined,
        defaultFontFace: typeof e.defaultFontFace === "string" ? e.defaultFontFace : undefined,
        defaultFontSize: typeof e.defaultFontSize === "number"
          ? clamp(e.defaultFontSize, 6, 24) : undefined,
      };
    }

    case "chart": {
      const chartTypes = ["bar", "pie", "line", "doughnut", "area", "bar3d"];
      if (!chartTypes.includes(e.chartType as string)) return null;
      const rawSeries = Array.isArray(e.series) ? e.series as unknown[] : [];
      const series = rawSeries
        .map(sanitizeChartSeries)
        .filter((s): s is ChartSeries => s !== null);
      if (series.length === 0) return null;
      return {
        type: "chart",
        chartType: e.chartType as "bar" | "pie" | "line" | "doughnut" | "area" | "bar3d",
        x: clamp(typeof e.x === "number" ? e.x : 0.5, 0, SLIDE_W),
        y: clamp(typeof e.y === "number" ? e.y : 1.0, 0, SLIDE_H),
        w: clamp(typeof e.w === "number" ? e.w : SLIDE_W - 1, 1, SLIDE_W),
        h: clamp(typeof e.h === "number" ? e.h : 3.5, 1, SLIDE_H),
        series,
        title: typeof e.title === "string" ? e.title : undefined,
        showLegend: e.showLegend === false ? false : true,
        showValue: e.showValue === true ? true : undefined,
        colors: Array.isArray(e.colors)
          ? (e.colors as unknown[]).filter((c): c is string => typeof c === "string")
              .map((c) => sanitizeColor(c)) : undefined,
        barDir: ["bar", "col"].includes(e.barDir as string)
          ? (e.barDir as "bar" | "col") : undefined,
      };
    }

    case "richText": {
      const rawRuns = Array.isArray(e.runs) ? e.runs as unknown[] : [];
      const runs = rawRuns.map(sanitizeTextRun).filter((r): r is TextRun => r !== null);
      if (runs.length === 0) return null;
      return {
        type: "richText",
        x: clamp(typeof e.x === "number" ? e.x : 0, -2, SLIDE_W + 2),
        y: clamp(typeof e.y === "number" ? e.y : 0, -2, SLIDE_H + 2),
        w: clamp(typeof e.w === "number" ? e.w : 2, 0.1, SLIDE_W + 4),
        h: clamp(typeof e.h === "number" ? e.h : 0.6, 0.05, SLIDE_H + 4),
        runs,
        align: ["left", "center", "right"].includes(e.align as string)
          ? (e.align as "left" | "center" | "right") : "left",
        valign: ["top", "middle", "bottom"].includes(e.valign as string)
          ? (e.valign as "top" | "middle" | "bottom") : "middle",
        fontFace: typeof e.fontFace === "string" ? e.fontFace : undefined,
        lineSpacingMultiple: typeof e.lineSpacingMultiple === "number"
          ? clamp(e.lineSpacingMultiple, 0.8, 2.5) : undefined,
        fill: typeof e.fill === "string" ? sanitizeColor(e.fill) : undefined,
      };
    }

    default:
      return null;
  }
}

export interface SceneValidationResult {
  valid: boolean;
  scene?: SceneSlide;
  reason?: string;
}

/**
 * Post-sanitize repair pass:
 * - Clip text elements whose x+w exceed slide bounds
 * - Auto-reduce fontSize when text box is too small to fit at least one line
 * - Merge near-duplicate rectangles that are stacked at identical positions
 * - Nudge overlapping text elements apart (same-y pair)
 */
function repairElements(els: Primitive[]): Primitive[] {
  const MAX_X = SLIDE_W;
  const MAX_Y = SLIDE_H;

  // 1) Clip text x+w / y+h to canvas
  const clipped = els.map((e) => {
    if (e.type !== "text") return e;
    const maxW = MAX_X - e.x - 0.05;
    const maxH = MAX_Y - e.y - 0.05;
    let w = Math.min(e.w, Math.max(0.2, maxW));
    let h = Math.min(e.h, Math.max(0.15, maxH));
    // Ensure h is at least enough to render at fontSize
    const fs = e.fontSize ?? 14;
    const minH = (fs / 72) * 1.35;
    if (h < minH) h = Math.min(minH, MAX_Y - e.y - 0.05);
    return { ...e, w, h };
  });

  // 2) De-dupe exactly identical rect backgrounds at same coords
  const seenRects = new Set<string>();
  const deduped: Primitive[] = [];
  for (const e of clipped) {
    if (e.type === "rect") {
      const fillKey = typeof e.fill === "string" ? e.fill : JSON.stringify(e.fill ?? "");
      const key = `${e.x.toFixed(2)}|${e.y.toFixed(2)}|${e.w.toFixed(2)}|${e.h.toFixed(2)}|${fillKey}`;
      if (seenRects.has(key)) continue;
      seenRects.add(key);
    }
    deduped.push(e);
  }

  // 3) Detect text-text overlap in close proximity and shrink font if badly overlapping
  const texts = deduped
    .map((e, i) => ({ e, i }))
    .filter((x) => x.e.type === "text") as Array<{ e: Extract<Primitive, { type: "text" }>; i: number }>;

  for (let a = 0; a < texts.length; a++) {
    for (let b = a + 1; b < texts.length; b++) {
      const A = texts[a]!.e;
      const B = texts[b]!.e;
      const overlapX = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      const overlapY = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (overlapX > 0.3 && overlapY > 0.2) {
        // Shrink the later one's font a bit if they overlap significantly
        const shrunk = Math.max(8, (B.fontSize ?? 14) - 2);
        deduped[texts[b]!.i] = { ...B, fontSize: shrunk };
      }
    }
  }

  return deduped;
}

export function validateAndSanitizeScene(raw: unknown): SceneValidationResult {
  if (!raw || typeof raw !== "object") {
    return { valid: false, reason: "not an object" };
  }
  const obj = raw as Record<string, unknown>;

  if (obj.layout !== "scene") {
    return { valid: false, reason: `layout is '${obj.layout}', expected 'scene'` };
  }

  const rawElements = Array.isArray(obj.elements) ? obj.elements : [];
  let elements: Primitive[] = rawElements
    .map(sanitizePrimitive)
    .filter((e): e is Primitive => e !== null);

  if (elements.length < 3) {
    return { valid: false, reason: `too few valid elements (${elements.length})` };
  }

  // Ensure there is a background covering most of the slide
  const hasBg = elements.some(
    (e) =>
      e.type === "rect" &&
      e.w >= SLIDE_W * 0.75 &&
      e.h >= SLIDE_H * 0.75 &&
      e.x <= 0.5 &&
      e.y <= 0.5
  );
  if (!hasBg) {
    elements.unshift({
      type: "rect",
      x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
      fill: "#FFFFFF",
    });
  }

  elements = repairElements(elements);

  const bgColor = typeof obj.background === "string"
    ? sanitizeColor(obj.background, "#FFFFFF")
    : undefined;

  const scene: SceneSlide = {
    layout: "scene",
    title: typeof obj.title === "string" ? obj.title : undefined,
    background: bgColor,
    elements,
    notes: typeof obj.notes === "string" ? obj.notes : undefined,
  };

  return { valid: true, scene };
}

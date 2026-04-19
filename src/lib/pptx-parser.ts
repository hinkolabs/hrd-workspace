/**
 * PPTX Parser - extracts slide text content from an existing .pptx file.
 *
 * PPTX is a ZIP archive. Key paths:
 *   ppt/slides/slide1.xml, slide2.xml, ...  → slide content XML
 *   ppt/slides/_rels/slide1.xml.rels, ...   → relationships
 *   ppt/_rels/presentation.xml.rels         → slide order
 *
 * Common pitfalls handled here:
 *  - Namespace-prefixed tags (a:, p:, r:) are stripped
 *  - Grouped shapes (p:grpSp) are recursively traversed
 *  - Connector shapes (p:cxnSp) with text are included
 *  - Tables inside graphicFrame are supported
 *  - xml:space="preserve" leading/trailing spaces preserved
 */

import JSZip from "jszip";

export interface ParsedTextBox {
  y: number;
  x: number;
  paragraphs: string[];
}

export interface ParsedSlide {
  index: number;
  textBoxes: ParsedTextBox[];
  fullText: string;
  imageCount: number;
}

// ─── Minimal XML Parser ────────────────────────────────────────────────────

interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

function stripNs(name: string): string {
  const i = name.indexOf(":");
  return i >= 0 ? name.slice(i + 1) : name;
}

function parseXml(xml: string): XmlNode {
  const root: XmlNode = { tag: "root", attrs: {}, children: [], text: "" };
  const stack: XmlNode[] = [root];

  // Normalize whitespace but preserve content inside tags
  const src = xml
    .replace(/<\?[^?]*\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_m, cdata: string) => cdata.replace(/</g, "&lt;"))
    .replace(/\r\n?/g, "\n");

  // Match opening/closing tags or text nodes
  // Using a state-machine-like regex approach
  const re = /<(\/?)([A-Za-z_][\w.:]*)((?:\s+[^>]*?)?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(src)) !== null) {
    const [, closing, rawTag, attrStr, selfClose, textContent] = m;

    if (textContent !== undefined) {
      // Unescape basic XML entities
      const decoded = textContent
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(parseInt(n, 10)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)));
      if (stack.length > 0) {
        stack[stack.length - 1].text += decoded;
      }
      continue;
    }

    if (closing) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    const tag = stripNs(rawTag);
    const attrs: Record<string, string> = {};
    const attrRe = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(attrStr)) !== null) {
      attrs[am[1]] = am[2] ?? am[3] ?? "";
    }

    const node: XmlNode = { tag, attrs, children: [], text: "" };
    stack[stack.length - 1].children.push(node);

    if (selfClose !== "/") {
      stack.push(node);
    }
  }

  return root;
}

function findFirst(node: XmlNode, tag: string): XmlNode | undefined {
  for (const c of node.children) {
    if (c.tag === tag) return c;
    const f = findFirst(c, tag);
    if (f) return f;
  }
}

function findAll(node: XmlNode, tag: string): XmlNode[] {
  const out: XmlNode[] = [];
  function walk(n: XmlNode) {
    if (n.tag === tag) out.push(n);
    for (const c of n.children) walk(c);
  }
  walk(node);
  return out;
}

// ─── Text Extraction ────────────────────────────────────────────────────────

/** Extracts all paragraphs from a txBody element */
function extractParagraphs(txBody: XmlNode): string[] {
  const paras: string[] = [];
  for (const p of txBody.children) {
    if (p.tag !== "p") continue;
    let line = "";
    for (const child of p.children) {
      if (child.tag === "r") {
        const tNode = findFirst(child, "t");
        if (tNode) {
          // Preserve whitespace if xml:space="preserve"
          const preserve =
            tNode.attrs["xml:space"] === "preserve" ||
            child.attrs["xml:space"] === "preserve";
          line += preserve ? tNode.text : tNode.text.trim();
        }
      } else if (child.tag === "fld") {
        // Field element (e.g. slide number, date)
        const tNode = findFirst(child, "t");
        if (tNode) line += tNode.text;
      } else if (child.tag === "br") {
        line += "\n";
      }
    }
    const trimmed = line.trim();
    if (trimmed) paras.push(trimmed);
  }
  return paras;
}

/** Extracts position (x, y in EMU) from a shape's spPr or grpSpPr */
function getPosition(shapeNode: XmlNode): { x: number; y: number } {
  const spPr = findFirst(shapeNode, "spPr") ?? findFirst(shapeNode, "grpSpPr");
  if (!spPr) return { x: 0, y: 0 };
  const xfrm = findFirst(spPr, "xfrm");
  if (!xfrm) return { x: 0, y: 0 };
  const off = findFirst(xfrm, "off");
  if (!off) return { x: 0, y: 0 };
  return {
    x: parseInt(off.attrs["x"] ?? "0", 10) || 0,
    y: parseInt(off.attrs["y"] ?? "0", 10) || 0,
  };
}

/** Recursively collect text boxes and image count from a shape container */
function collectShapes(
  container: XmlNode,
  textBoxes: ParsedTextBox[],
  imageCount: { count: number }
) {
  for (const child of container.children) {
    switch (child.tag) {
      case "sp":
      case "cxnSp": {
        // Shape or connector with optional text
        const txBody = findFirst(child, "txBody");
        if (txBody) {
          const paras = extractParagraphs(txBody);
          if (paras.length > 0) {
            const { x, y } = getPosition(child);
            textBoxes.push({ x, y, paragraphs: paras });
          }
        }
        break;
      }
      case "grpSp": {
        // Grouped shapes – recurse into the group
        collectShapes(child, textBoxes, imageCount);
        break;
      }
      case "pic": {
        imageCount.count++;
        break;
      }
      case "graphicFrame": {
        // Tables are wrapped in graphicFrame > graphic > graphicData > tbl
        const tbl = findFirst(child, "tbl");
        if (tbl) {
          const rows = findAll(tbl, "tr");
          const tableLines: string[] = [];
          for (const row of rows) {
            const cells = findAll(row, "tc");
            const cellTexts = cells.map((tc) => {
              const body = findFirst(tc, "txBody");
              return body ? extractParagraphs(body).join(" ") : "";
            });
            if (cellTexts.some((t) => t.trim())) {
              tableLines.push(cellTexts.join("\t"));
            }
          }
          if (tableLines.length > 0) {
            const { x, y } = getPosition(child);
            textBoxes.push({ x, y, paragraphs: tableLines });
          }
        } else {
          // SmartArt or chart – try to extract any text inside
          const allT = findAll(child, "t");
          const texts = allT.map((t) => t.text.trim()).filter(Boolean);
          if (texts.length > 0) {
            const { x, y } = getPosition(child);
            textBoxes.push({ x, y, paragraphs: texts });
          }
        }
        break;
      }
    }
  }
}

/** Parse a single slide XML and return its text boxes */
function parseSlideXml(xmlStr: string): { textBoxes: ParsedTextBox[]; imageCount: number } {
  const doc = parseXml(xmlStr);

  // spTree is inside p:sld > p:cSld > p:spTree
  const spTree = findFirst(doc, "spTree");
  if (!spTree) return { textBoxes: [], imageCount: 0 };

  const textBoxes: ParsedTextBox[] = [];
  const imageCounter = { count: 0 };

  collectShapes(spTree, textBoxes, imageCounter);

  // Sort by vertical position first, then horizontal
  textBoxes.sort((a, b) => a.y - b.y || a.x - b.x);

  return { textBoxes, imageCount: imageCounter.count };
}

// ─── Slide Ordering ─────────────────────────────────────────────────────────

async function getSlideOrder(zip: JSZip): Promise<string[]> {
  const relsFile = zip.file("ppt/_rels/presentation.xml.rels");
  if (!relsFile) return [];

  const relsXml = await relsFile.async("text");
  const doc = parseXml(relsXml);
  const rels = findAll(doc, "Relationship");

  const slides: Array<{ order: number; path: string }> = [];
  for (const rel of rels) {
    const type = rel.attrs["Type"] ?? "";
    const target = rel.attrs["Target"] ?? "";
    if (type.endsWith("/slide") && !type.endsWith("/slideLayout") && !type.endsWith("/slideMaster")) {
      // Resolve relative paths
      const resolved = target.startsWith("slides/")
        ? `ppt/${target}`
        : target.startsWith("/")
        ? target.slice(1)
        : `ppt/slides/${target.split("/").pop()}`;

      const match = resolved.match(/slide(\d+)\.xml/);
      const order = match ? parseInt(match[1], 10) : 999;
      slides.push({ order, path: resolved });
    }
  }

  slides.sort((a, b) => a.order - b.order);
  return slides.map((s) => s.path);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Parse a PPTX buffer and return structured slide data */
export async function parsePptx(buffer: Buffer): Promise<ParsedSlide[]> {
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = await getSlideOrder(zip);

  // Fallback: enumerate slides directly if relationship parsing fails
  const effectivePaths =
    slidePaths.length > 0
      ? slidePaths
      : Object.keys(zip.files)
          .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
          .sort((a, b) => {
            const na = parseInt(a.match(/(\d+)/)?.[1] ?? "0", 10);
            const nb = parseInt(b.match(/(\d+)/)?.[1] ?? "0", 10);
            return na - nb;
          });

  const parsedSlides: ParsedSlide[] = [];

  for (let i = 0; i < effectivePaths.length; i++) {
    const slideFile = zip.file(effectivePaths[i]);
    if (!slideFile) continue;

    const xmlStr = await slideFile.async("text");
    const { textBoxes, imageCount } = parseSlideXml(xmlStr);

    const fullText = textBoxes.map((tb) => tb.paragraphs.join("\n")).join("\n\n");

    parsedSlides.push({
      index: i + 1,
      textBoxes,
      fullText,
      imageCount,
    });
  }

  // ── Footer/header de-duplication ─────────────────────────────────────────
  // Detect paragraphs that repeat verbatim on ≥ 60% of slides (and ≥ 3 slides total)
  // and strip them — these are almost always footer text misidentified as content.
  if (parsedSlides.length >= 3) {
    const paraCounts = new Map<string, number>();
    for (const slide of parsedSlides) {
      const uniqueParas = new Set<string>();
      for (const tb of slide.textBoxes) {
        for (const p of tb.paragraphs) {
          const norm = p.trim();
          if (norm.length >= 2 && norm.length <= 60) uniqueParas.add(norm);
        }
      }
      for (const p of uniqueParas) {
        paraCounts.set(p, (paraCounts.get(p) ?? 0) + 1);
      }
    }
    const threshold = Math.max(3, Math.ceil(parsedSlides.length * 0.6));
    const repeats = new Set<string>();
    for (const [p, count] of paraCounts) {
      if (count >= threshold) repeats.add(p);
    }
    if (repeats.size > 0) {
      for (const slide of parsedSlides) {
        slide.textBoxes = slide.textBoxes
          .map((tb) => ({
            ...tb,
            paragraphs: tb.paragraphs.filter((p) => !repeats.has(p.trim())),
          }))
          .filter((tb) => tb.paragraphs.length > 0);
        slide.fullText = slide.textBoxes
          .map((tb) => tb.paragraphs.join("\n"))
          .join("\n\n");
      }
    }
  }

  return parsedSlides;
}

// ─── Image Extraction ────────────────────────────────────────────────────────

export interface SlideImageSlot {
  data: string;   // raw base64 (no prefix)
  mime: string;   // image/png | image/jpeg | etc.
  rId: string;
}

/**
 * Extracts images per-slide from a PPTX buffer.
 * Returns an array indexed by slide order; each element is the image list for that slide.
 */
export async function extractImagesPerSlide(buffer: Buffer): Promise<SlideImageSlot[][]> {
  const zip = await JSZip.loadAsync(buffer);

  // Discover slide paths in order
  const relsFile = zip.file("ppt/_rels/presentation.xml.rels");
  let slidePaths: string[] = [];

  if (relsFile) {
    const relsXml = await relsFile.async("text");
    const doc = parseXml(relsXml);
    const rels = findAll(doc, "Relationship");
    const ordered: Array<{ order: number; path: string }> = [];
    for (const rel of rels) {
      const type = rel.attrs["Type"] ?? "";
      const target = rel.attrs["Target"] ?? "";
      if (type.endsWith("/slide") && !type.endsWith("/slideLayout") && !type.endsWith("/slideMaster")) {
        const resolved = target.startsWith("slides/")
          ? `ppt/${target}`
          : `ppt/slides/${target.split("/").pop()}`;
        const m = resolved.match(/slide(\d+)\.xml/);
        ordered.push({ order: m ? parseInt(m[1], 10) : 999, path: resolved });
      }
    }
    ordered.sort((a, b) => a.order - b.order);
    slidePaths = ordered.map((s) => s.path);
  }

  if (slidePaths.length === 0) {
    slidePaths = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => {
        const na = parseInt(a.match(/(\d+)/)?.[1] ?? "0", 10);
        const nb = parseInt(b.match(/(\d+)/)?.[1] ?? "0", 10);
        return na - nb;
      });
  }

  const MIME_MAP: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", bmp: "image/bmp", webp: "image/webp",
    svg: "image/svg+xml",
  };

  const result: SlideImageSlot[][] = [];

  for (const slidePath of slidePaths) {
    const slideFile = zip.file(slidePath);
    if (!slideFile) { result.push([]); continue; }

    // Derive slide number to locate its rels file
    const slideNum = slidePath.match(/slide(\d+)\.xml/)?.[1];
    if (!slideNum) { result.push([]); continue; }

    const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const slideRelsFile = zip.file(relsPath);
    if (!slideRelsFile) { result.push([]); continue; }

    const relsXml = await slideRelsFile.async("text");

    // Build rId → resolved media path map
    const ridToMedia: Record<string, string> = {};
    const relMatches = relsXml.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g);
    for (const m of relMatches) {
      const rId = m[1];
      const target = m[2];
      if (!target.includes("media")) continue;
      // Normalize: ../media/imageX.ext → ppt/media/imageX.ext
      const normalized = target.replace(/^\.\.\//, "ppt/").replace(/^\//, "");
      ridToMedia[rId] = normalized;
    }

    // Find all r:embed in the slide XML (blip fills = raster images)
    const slideXml = await slideFile.async("text");
    const embedMatches = slideXml.matchAll(/r:embed="([^"]+)"/g);

    const images: SlideImageSlot[] = [];
    const seen = new Set<string>();

    for (const m of embedMatches) {
      const rId = m[1];
      if (seen.has(rId)) continue;
      seen.add(rId);

      const mediaPath = ridToMedia[rId];
      if (!mediaPath) continue;

      const mediaFile = zip.file(mediaPath);
      if (!mediaFile) continue;

      const ext = mediaPath.split(".").pop()?.toLowerCase() ?? "";
      const mime = MIME_MAP[ext];
      if (!mime) continue; // skip EMF/WMF vector metafiles

      const base64 = await mediaFile.async("base64");
      images.push({ data: base64, mime, rId });
    }

    result.push(images);
  }

  return result;
}

/** Convert parsed slides to a compact text format for GPT-4o */
export function slidesToPromptText(slides: ParsedSlide[]): string {
  return slides
    .map((slide) => {
      const imgNote =
        slide.imageCount > 0 ? `  (이미지 ${slide.imageCount}개)\n` : "";
      const boxes = slide.textBoxes
        .map(
          (tb, j) =>
            `  [텍스트${j + 1}]\n${tb.paragraphs.map((p) => `    ${p}`).join("\n")}`
        )
        .join("\n");
      return `=== 슬라이드 ${slide.index} ===\n${imgNote}${boxes || "  (텍스트 없음)"}`;
    })
    .join("\n\n");
}

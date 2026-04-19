#!/usr/bin/env node
/**
 * extract-preset-from-pptx.mjs
 *
 * 하나 PPTX 파일을 분석하여 src/lib/ppt-presets/<slug>.ts 초안을 생성합니다.
 *
 * 사용법:
 *   node scripts/extract-preset-from-pptx.mjs "<pptx 경로>" --slug hana-2022 --name "하나그룹 2022 운영안"
 *
 * 출력:
 *   src/lib/ppt-presets/<slug>.ts  (생성 후 수동 보정 필요)
 *
 * 주의: 자동 추출이 불완전할 수 있습니다. 특히 decorations 좌표와
 *       색상 투명도는 생성된 파일을 열어 직접 확인·수정하세요.
 */

import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

// ─── CLI args ─────────────────────────────────────────────────────────────────

const { positionals, values } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    slug: { type: "string" },
    name: { type: "string" },
    "base-theme": { type: "string", default: "hana" },
    out: { type: "string" },
  },
});

const pptxPath = positionals[0];
if (!pptxPath) {
  console.error("사용법: node scripts/extract-preset-from-pptx.mjs <pptx파일> --slug <slug> --name <이름>");
  process.exit(1);
}

const slug = values["slug"] ?? path.basename(pptxPath, ".pptx").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
const presetName = values["name"] ?? slug;
const baseTheme = values["base-theme"] ?? "hana";
const outDir = path.join(process.cwd(), "src", "lib", "ppt-presets");
const outFile = values["out"] ?? path.join(outDir, `${slug}.ts`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function xmlAttr(node, ...attrs) {
  for (const a of attrs) {
    const v = node?.getAttribute?.(a) ?? node?.getAttributeNS?.("http://schemas.openxmlformats.org/drawingml/2006/main", a);
    if (v) return v;
  }
  return null;
}

function srgbToHex(val) {
  if (!val) return null;
  return val.replace(/^#/, "").toUpperCase().padStart(6, "0");
}

function findFirst(doc, tagName) {
  const els = doc.getElementsByTagName(tagName);
  return els.length ? els[0] : null;
}

function emuToInches(emu) {
  return Math.round((Number(emu) / 914400) * 100) / 100;
}

// ─── Extract from PPTX ───────────────────────────────────────────────────────

async function main() {
  console.log(`\n📂 Reading: ${pptxPath}`);
  const buf = fs.readFileSync(pptxPath);
  const zip = await JSZip.loadAsync(buf);

  const parser = new DOMParser();

  // Parse theme XML
  const themeXmlName = Object.keys(zip.files).find(n => /ppt\/theme\/theme\d+\.xml$/.test(n));
  const themeXml = themeXmlName ? await zip.file(themeXmlName).async("string") : "";
  const themeDoc = parser.parseFromString(themeXml, "application/xml");

  // Parse first slide master XML
  const masterXmlName = Object.keys(zip.files).find(n => /ppt\/slideMasters\/slideMaster\d+\.xml$/.test(n));
  const masterXml = masterXmlName ? await zip.file(masterXmlName).async("string") : "";
  const masterDoc = parser.parseFromString(masterXml, "application/xml");

  // Parse first 3 content slides
  const slideNames = Object.keys(zip.files)
    .filter(n => /ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)?.[1] ?? "0");
      const nb = parseInt(b.match(/(\d+)/)?.[1] ?? "0");
      return na - nb;
    })
    .slice(0, 5);

  // ── Extract theme colors ──────────────────────────────────────────────────
  const dk1El = findFirst(themeDoc, "a:dk1");
  const dk2El = findFirst(themeDoc, "a:dk2");
  const lt1El = findFirst(themeDoc, "a:lt1");
  const acc1El = findFirst(themeDoc, "a:accent1");
  const acc2El = findFirst(themeDoc, "a:accent2");

  function extractSchemeColor(el) {
    if (!el) return null;
    const srgb = el.getElementsByTagName("a:srgbClr")[0];
    return srgb ? srgbToHex(xmlAttr(srgb, "val")) : null;
  }

  const primary   = extractSchemeColor(acc1El) ?? "009591";
  const secondary = extractSchemeColor(acc2El) ?? "ED1651";
  const bg        = extractSchemeColor(lt1El)  ?? "FFFFFF";
  const text      = extractSchemeColor(dk1El)  ?? "231F20";

  console.log(`\n🎨 Extracted colors:`);
  console.log(`   primary:   #${primary}`);
  console.log(`   secondary: #${secondary}`);
  console.log(`   bg:        #${bg}`);
  console.log(`   text:      #${text}`);

  // ── Extract title bar height from master ──────────────────────────────────
  // Look for the tallest solid-filled rect in the top portion of the master
  let titleBarH = 0.85; // fallback default
  const spElements = masterDoc.getElementsByTagName("p:sp");
  for (let i = 0; i < Math.min(spElements.length, 20); i++) {
    const sp = spElements[i];
    const spPr = sp.getElementsByTagName("p:spPr")[0];
    if (!spPr) continue;
    const xfrm = spPr.getElementsByTagName("a:xfrm")[0];
    if (!xfrm) continue;
    const off = xfrm.getElementsByTagName("a:off")[0];
    const ext = xfrm.getElementsByTagName("a:ext")[0];
    if (!off || !ext) continue;
    const y = parseInt(off.getAttribute("y") ?? "9999999");
    const h = parseInt(ext.getAttribute("cy") ?? "0");
    const yInches = emuToInches(y);
    const hInches = emuToInches(h);
    // Top bar: starts near y=0, height between 0.3 and 1.5 inches
    if (yInches < 0.1 && hInches > 0.3 && hInches < 1.5) {
      titleBarH = hInches;
      console.log(`\n📏 Detected title bar height: ${titleBarH} in`);
      break;
    }
  }

  // ── Extract font names from master ────────────────────────────────────────
  let titleFont = "하나2.0 B";
  let bodyFont  = "하나2.0 M";
  const defPPr = masterDoc.getElementsByTagName("p:txStyles")[0];
  if (defPPr) {
    const latinEls = defPPr.getElementsByTagName("a:latin");
    if (latinEls[0]) titleFont = xmlAttr(latinEls[0], "typeface") ?? titleFont;
    if (latinEls[1]) bodyFont  = xmlAttr(latinEls[1], "typeface") ?? bodyFont;
  }
  console.log(`\n✍️  Fonts: title="${titleFont}", body="${bodyFont}"`);

  // ── Collect slide shapes for decoration heuristics ────────────────────────
  const decorations = [];

  for (const slideName of slideNames) {
    const slideXml = await zip.file(slideName).async("string");
    const slideDoc = parser.parseFromString(slideXml, "application/xml");
    const shapes = slideDoc.getElementsByTagName("p:sp");

    for (let i = 0; i < shapes.length; i++) {
      const sp = shapes[i];
      const spPr = sp.getElementsByTagName("p:spPr")[0];
      const prstGeom = spPr?.getElementsByTagName("a:prstGeom")?.[0];
      const prst = prstGeom ? prstGeom.getAttribute("prst") : null;
      const xfrm = spPr?.getElementsByTagName("a:xfrm")?.[0];
      const off = xfrm?.getElementsByTagName("a:off")?.[0];
      const ext = xfrm?.getElementsByTagName("a:ext")?.[0];
      const solidFill = spPr?.getElementsByTagName("a:solidFill")?.[0];
      const srgb = solidFill?.getElementsByTagName("a:srgbClr")?.[0];
      const schemeClr = solidFill?.getElementsByTagName("a:schemeClr")?.[0];

      if (!off || !ext) continue;

      const xIn = emuToInches(off.getAttribute("x") ?? "0");
      const yIn = emuToInches(off.getAttribute("y") ?? "0");
      const wIn = emuToInches(ext.getAttribute("cx") ?? "0");
      const hIn = emuToInches(ext.getAttribute("cy") ?? "0");

      const color = srgb
        ? srgbToHex(srgb.getAttribute("val"))
        : schemeClr
          ? `SCHEME:${schemeClr.getAttribute("val")}`
          : null;

      // Look for circles (ellipse) that could be decorative
      if (prst === "ellipse" && color && wIn > 0.5) {
        const r = Math.round((wIn / 2) * 100) / 100;
        const cx = Math.round((xIn + wIn / 2) * 100) / 100;
        const cy = Math.round((yIn + hIn / 2) * 100) / 100;
        // Avoid duplicates
        const exists = decorations.some(d => d.type === "circle" && Math.abs(d.x - cx) < 0.1 && Math.abs(d.y - cy) < 0.1);
        if (!exists) {
          decorations.push({ type: "circle", x: cx, y: cy, r, color: color.startsWith("SCHEME") ? "FFFFFF" : color, opacity: 20 });
        }
      }
    }
  }

  console.log(`\n🔵 Detected decorative circles: ${decorations.length}`);
  decorations.forEach(d => console.log(`   x=${d.x}, y=${d.y}, r=${d.r}, color=#${d.color}`));

  // ─── Generate TypeScript output ───────────────────────────────────────────

  const relativePptxPath = path.relative(process.cwd(), pptxPath).replace(/\\/g, "/");

  const ts = `import type { DesignPreset } from "./types";

/**
 * ${presetName}
 *
 * 원본: ${relativePptxPath}
 * 추출: scripts/extract-preset-from-pptx.mjs 로 초안 생성 후 수동 보정
 *
 * ⚠️  아래 값들은 자동 추출 초안입니다. 실제 PPTX와 대조하여 수동 확인하세요:
 *     - decorations 좌표·크기·투명도
 *     - titleBar.heightInches
 *     - 색상(primary/secondary) 정확도
 */
const ${slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}: DesignPreset = {
  id: "${slug}",
  name: "${presetName}",
  description: "TODO: 이 시안에 대한 설명을 입력하세요.",
  sourceFile: "${relativePptxPath}",
  baseTheme: "${baseTheme}",

  tokens: {
    colors: {
      primary:     "${primary}",
      secondary:   "${secondary}",
      background:  "${bg}",
      surface:     "F0FAFA",      // TODO: PPTX에서 카드 배경색 확인
      titleText:   "${text}",
      bodyText:    "${text}",
      mutedText:   "666666",
      tableHeader: "${primary}",
      tableRow1:   "FFFFFF",
      tableRow2:   "E6F7F7",      // TODO: PPTX에서 표 짝수행 색 확인
      bullet:      "${primary}",
      sectionBg:   "${primary}", // TODO: 섹션 슬라이드 배경색 확인
    },
    fonts: {
      title: "${titleFont}",
      body:  "${bodyFont}",
    },
  },

  chrome: {
    titleBar: {
      style:        "full-bleed",
      heightInches: ${titleBarH},
    },
    decorations: [
${decorations.slice(0, 5).map(d =>
  `      // TODO: 좌표·투명도 확인 필요\n      { type: "circle", x: ${d.x}, y: ${d.y}, r: ${d.r}, color: "${d.color}", opacity: ${d.opacity} },`
).join("\n")}
    ],
    pageNumber: {
      position: "bottom-right",
      fontSize: 8,
      color: "9CA3AF",
    },
  },

  titleSlide: {
    style: "center-gradient",
    coverShape: "circle",
  },

  sectionSlide: {
    style: "full-color",
  },
};

export default ${slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase())};
`;

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, ts, "utf8");
  console.log(`\n✅ 생성 완료: ${outFile}`);
  console.log(`\n📝 다음 단계:`);
  console.log(`   1. ${outFile} 열어서 TODO 주석 확인·수정`);
  console.log(`   2. src/lib/ppt-presets/index.ts 에 import 추가`);
  console.log(`   3. PRESETS 배열에 등록`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

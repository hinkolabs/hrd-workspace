#!/usr/bin/env node
/**
 * analyze-hana.mjs  —  readonly analyzer for the Hana 2022 PPTX
 *
 * Usage:
 *   node scripts/analyze-hana.mjs "<pptx path>" [--out tmp/hana-analysis.txt]
 *
 * Prints (and optionally writes) a structured dump of:
 *   - theme1 color scheme + fonts
 *   - slide size
 *   - slideMaster1 shapes (name, geom, fill, position, size)
 *   - shape fills / text on representative slides (1, 2, 3, 5, 10, 30, last)
 *
 * This script does NOT write any ts preset file.
 */

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import JSZip from "jszip";

const { positionals, values } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: { out: { type: "string" } },
});

const pptxPath = positionals[0];
if (!pptxPath) {
  console.error("Usage: node scripts/analyze-hana.mjs <pptx-path> [--out <txt>]");
  process.exit(1);
}

const EMU = 914400;
const emu = (v) => Math.round((Number(v) / EMU) * 100) / 100;

const logs = [];
const log = (...args) => {
  const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  logs.push(line);
  console.log(line);
};

function matchAll(str, re) {
  const out = [];
  let m;
  while ((m = re.exec(str)) !== null) out.push(m);
  return out;
}

function extractFirstSrgb(chunk) {
  if (!chunk) return null;
  const m = chunk.match(/<a:srgbClr val="([A-Fa-f0-9]{6})"/);
  return m ? m[1].toUpperCase() : null;
}

function extractFirstSchemeOrSrgb(chunk) {
  if (!chunk) return null;
  const srgb = chunk.match(/<a:srgbClr val="([A-Fa-f0-9]{6})"/);
  if (srgb) return "#" + srgb[1].toUpperCase();
  const sch = chunk.match(/<a:schemeClr val="(\w+)"/);
  if (sch) return "scheme:" + sch[1];
  const sys = chunk.match(/<a:sysClr[^>]*lastClr="([A-Fa-f0-9]{6})"/);
  if (sys) return "#" + sys[1].toUpperCase();
  return null;
}

function shortText(xml, limit = 80) {
  const texts = matchAll(xml, /<a:t>([^<]*)<\/a:t>/g).map((m) => m[1]).filter(Boolean);
  const joined = texts.join(" | ");
  return joined.length > limit ? joined.slice(0, limit) + "…" : joined;
}

async function main() {
  const buf = fs.readFileSync(pptxPath);
  const zip = await JSZip.loadAsync(buf);

  log("=".repeat(72));
  log("FILE:", pptxPath);
  log("size:", (buf.length / 1024 / 1024).toFixed(2), "MB");
  log("");

  // ── presentation.xml: slide size
  const presXml = await zip.file("ppt/presentation.xml").async("string");
  const sz = presXml.match(/<p:sldSz cx="(\d+)" cy="(\d+)"(?: type="(\w+)")?/);
  if (sz) {
    log(`SLIDE SIZE: ${emu(sz[1])} in × ${emu(sz[2])} in (type=${sz[3] || "-"})`);
  }

  // ── theme1.xml: color scheme + fonts
  log("\n" + "─".repeat(72));
  log("THEME1 — color scheme + fonts");
  log("─".repeat(72));
  const themeXml = await zip.file("ppt/theme/theme1.xml").async("string");
  const clrScheme = themeXml.match(/<a:clrScheme[^>]*name="([^"]*)"[\s\S]*?<\/a:clrScheme>/);
  if (clrScheme) {
    log(`scheme name: ${clrScheme[1]}`);
    const roles = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
    for (const role of roles) {
      const re = new RegExp(`<a:${role}>([\\s\\S]*?)</a:${role}>`);
      const m = themeXml.match(re);
      if (m) {
        const c = extractFirstSchemeOrSrgb(m[1]) || "?";
        log(`  ${role.padEnd(10)}: ${c}`);
      }
    }
  }
  const fontScheme = themeXml.match(/<a:fontScheme[^>]*name="([^"]*)"[\s\S]*?<\/a:fontScheme>/);
  if (fontScheme) {
    log(`\nfont scheme: ${fontScheme[1]}`);
    const majLatin = themeXml.match(/<a:majorFont>[\s\S]*?<a:latin typeface="([^"]*)"/);
    const majEa    = themeXml.match(/<a:majorFont>[\s\S]*?<a:ea typeface="([^"]*)"/);
    const minLatin = themeXml.match(/<a:minorFont>[\s\S]*?<a:latin typeface="([^"]*)"/);
    const minEa    = themeXml.match(/<a:minorFont>[\s\S]*?<a:ea typeface="([^"]*)"/);
    log(`  major latin: ${majLatin ? majLatin[1] : "?"}`);
    log(`  major ea   : ${majEa ? majEa[1] : "?"}`);
    log(`  minor latin: ${minLatin ? minLatin[1] : "?"}`);
    log(`  minor ea   : ${minEa ? minEa[1] : "?"}`);
  }

  // ── slideMaster1.xml: shapes
  log("\n" + "─".repeat(72));
  log("SLIDE MASTER 1 — shapes (name | geom | fill | pos | size)");
  log("─".repeat(72));
  const masterXml = await zip.file("ppt/slideMasters/slideMaster1.xml").async("string");
  await dumpShapes(masterXml, { limit: 30 });

  // Background of master (cSld bg)
  const bgMatch = masterXml.match(/<p:cSld[\s\S]*?<p:bg>([\s\S]*?)<\/p:bg>/);
  if (bgMatch) {
    log("\nMASTER BG:");
    log("  ", shortenXml(bgMatch[1]));
  }

  // ── Representative slides
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = +a.match(/slide(\d+)/)[1];
      const nb = +b.match(/slide(\d+)/)[1];
      return na - nb;
    });
  const total = slideNames.length;
  const picks = Array.from(new Set([1, 2, 3, 4, 5, 10, 20, 30, total])).filter((n) => n >= 1 && n <= total);
  log("\n" + "─".repeat(72));
  log(`REPRESENTATIVE SLIDES (${picks.join(", ")} of ${total})`);
  log("─".repeat(72));
  for (const n of picks) {
    const p = `ppt/slides/slide${n}.xml`;
    const xml = await zip.file(p).async("string");
    log(`\n── slide ${n} ── text: "${shortText(xml, 120)}"`);
    await dumpShapes(xml, { limit: 40, indent: "  " });
  }

  // Write if requested
  if (values.out) {
    const outPath = path.resolve(values.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, logs.join("\n"), "utf8");
    console.error(`\n[ok] wrote ${outPath}`);
  }
}

function shortenXml(s) {
  return s.replace(/\s+/g, " ").slice(0, 200);
}

async function dumpShapes(xml, { limit = 20, indent = "" } = {}) {
  // Include sp, cxnSp, pic
  const blocks = matchAll(
    xml,
    /<p:(sp|cxnSp|pic)\b[\s\S]*?<\/p:\1>/g
  );
  const shown = [];
  for (let i = 0; i < blocks.length && i < limit; i++) {
    const m = blocks[i];
    const kind = m[1];
    const chunk = m[0];
    const name = (chunk.match(/<p:cNvPr[^>]*name="([^"]*)"/) || [])[1] || "";
    const geom = (chunk.match(/<a:prstGeom prst="(\w+)"/) || [])[1] || "-";
    const off = chunk.match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
    const ext = chunk.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
    const pos = off ? `(${emu(off[1])},${emu(off[2])})` : "-";
    const size = ext ? `${emu(ext[1])}x${emu(ext[2])}` : "-";

    // fill: solid / gradient
    let fill = "-";
    const solid = chunk.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
    const grad = chunk.match(/<a:gradFill[\s\S]*?<\/a:gradFill>/);
    if (solid) {
      fill = extractFirstSchemeOrSrgb(solid[1]) || "-";
      // alpha?
      const alpha = solid[1].match(/<a:alpha val="(\d+)"/);
      if (alpha) fill += `@${(alpha[1] / 1000).toFixed(0)}%`;
    } else if (grad) {
      const stops = matchAll(grad[0], /<a:srgbClr val="([A-Fa-f0-9]{6})"/g).map((x) => "#" + x[1].toUpperCase());
      fill = `grad[${stops.join(",")}]`;
    }

    // line stroke
    let stroke = "";
    const ln = chunk.match(/<a:ln[^>]*w="(\d+)"[\s\S]*?<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
    if (ln) {
      const c = extractFirstSchemeOrSrgb(ln[2]) || "?";
      stroke = ` stroke=${c}/${(+ln[1] / 12700).toFixed(1)}pt`;
    }

    const txt = shortText(chunk, 50);
    shown.push(`${indent}[${kind.padEnd(5)}] "${name}" geom=${geom} fill=${fill} pos=${pos} size=${size}${stroke}${txt ? ` text="${txt}"` : ""}`);
  }
  if (blocks.length > limit) shown.push(`${indent}… (${blocks.length - limit} more shapes omitted)`);
  shown.forEach((s) => log(s));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

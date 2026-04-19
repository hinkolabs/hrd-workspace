/**
 * Iconify icon fetcher with server-side memory cache.
 * Returns SVG as a base64 data URI for use with pptxgenjs addImage().
 * pptxgenjs v4 supports SVG images natively (PowerPoint 2016+).
 * Only allows safe collections.
 */

const iconCache = new Map<string, string>();

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

/**
 * Returns a base64-encoded PNG-style data string for an icon.
 * Actually embeds SVG; pptxgenjs handles it transparently.
 * @param iconName  e.g. "mdi:rocket-launch"
 * @param color     hex color string, e.g. "#009591"
 * @returns base64 string (NOT a data URI prefix — pptxgenjs addImage data)
 */
export async function fetchIconAsPng(
  iconName: string,
  color: string
): Promise<string | null> {
  const colorHex = color.replace("#", "");
  const cacheKey = `${iconName}:${colorHex}`;
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey)!;

  // Validate collection
  const colonIdx = iconName.indexOf(":");
  if (colonIdx < 1) return null;
  const collection = iconName.slice(0, colonIdx);
  const name = iconName.slice(colonIdx + 1);
  if (!ALLOWED_COLLECTIONS.has(collection) || !name) return null;

  try {
    const url =
      `https://api.iconify.design/${collection}/${name}.svg` +
      `?color=%23${colorHex}&width=128&height=128`;

    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;

    const svg = await res.text();
    if (!svg.includes("<svg")) return null;

    // Return base64-encoded SVG — pptxgenjs v4 accepts svg data URIs via addImage
    const base64 = Buffer.from(svg).toString("base64");
    iconCache.set(cacheKey, base64);
    return base64;
  } catch {
    return null;
  }
}

/** Returns the MIME type to use when embedding icon data */
export function getIconMime(): string {
  return "image/svg+xml";
}

/**
 * Image source chain: Original PPT images → Unsplash stock photos → null (icon fallback)
 * Gracefully degrades when UNSPLASH_ACCESS_KEY is not set.
 */

const photoCache = new Map<string, { base64: string; mime: string } | null>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 min
const cacheTimestamps = new Map<string, number>();

export interface ImageData {
  base64: string;
  mime: string;
}

export async function fetchStockPhoto(query: string): Promise<ImageData | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const cacheKey = query.toLowerCase().trim();
  const ts = cacheTimestamps.get(cacheKey);
  if (ts && Date.now() - ts < CACHE_TTL_MS && photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey) ?? null;
  }

  try {
    const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Client-ID ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!searchRes.ok) { photoCache.set(cacheKey, null); cacheTimestamps.set(cacheKey, Date.now()); return null; }

    const searchData = await searchRes.json();
    const photoUrl = searchData?.results?.[0]?.urls?.regular;
    if (!photoUrl) { photoCache.set(cacheKey, null); cacheTimestamps.set(cacheKey, Date.now()); return null; }

    const imgRes = await fetch(photoUrl, { signal: AbortSignal.timeout(8000) });
    if (!imgRes.ok) { photoCache.set(cacheKey, null); cacheTimestamps.set(cacheKey, Date.now()); return null; }

    const arrayBuf = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString("base64");
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const result: ImageData = { base64, mime: contentType };
    
    photoCache.set(cacheKey, result);
    cacheTimestamps.set(cacheKey, Date.now());
    return result;
  } catch {
    photoCache.set(cacheKey, null);
    cacheTimestamps.set(cacheKey, Date.now());
    return null;
  }
}

export async function pickImageForSlide(
  extractedImages: Array<{ data: string; mime: string }> | undefined,
  imageQuery: string | undefined
): Promise<ImageData | null> {
  if (extractedImages && extractedImages.length > 0) {
    return { base64: extractedImages[0].data, mime: extractedImages[0].mime };
  }
  if (imageQuery) {
    return fetchStockPhoto(imageQuery);
  }
  return null;
}

export function hasUnsplashKey(): boolean {
  return !!process.env.UNSPLASH_ACCESS_KEY;
}

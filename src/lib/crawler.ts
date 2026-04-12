import * as cheerio from "cheerio";
import iconv from "iconv-lite";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
};

/**
 * URL을 크롤링하여 정제된 HTML을 반환합니다.
 * - 인코딩 자동 감지 (EUC-KR, UTF-8 등)
 * - 상대 URL → 절대 URL 변환
 * - CSS 파일 인라인화 (최대 4개)
 * - 폰트 파일 base64 임베딩 (@font-face CORS 우회)
 * - 불필요 요소 제거
 */
export async function crawlUrl(url: string): Promise<string> {
  const baseUrl = new URL(url);

  const res = await fetch(url, {
    headers: {
      ...FETCH_HEADERS,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await res.arrayBuffer());

  let html = decodeBuffer(buffer, contentType);

  // meta charset 재확인
  const charsetMatch = html.match(/charset=["']?([a-zA-Z0-9-]+)/i);
  if (charsetMatch) {
    const charset = charsetMatch[1].toLowerCase();
    if (charset !== "utf-8" && charset !== "utf8" && iconv.encodingExists(charset)) {
      html = iconv.decode(buffer, charset);
    }
  }

  return await cleanHtml(html, baseUrl);
}

function decodeBuffer(buffer: Buffer, contentType: string): string {
  const match = contentType.match(/charset=([a-zA-Z0-9-]+)/i);
  if (match) {
    const charset = match[1].toLowerCase();
    if (iconv.encodingExists(charset)) return iconv.decode(buffer, charset);
  }
  return buffer.toString("utf-8");
}

async function cleanHtml(html: string, baseUrl: URL): Promise<string> {
  const $ = cheerio.load(html);

  resolveUrls($, baseUrl);
  await inlineStyles($, baseUrl);
  await inlineImages($);

  // Keep most scripts so that modals, popups, tabs, and UI interactions work.
  // Remove only analytics / tracking scripts that serve no UI purpose.
  $('script[src*="google-analytics"], script[src*="googletagmanager"], script[src*="gtag"], script[src*="analytics"]').remove();

  // Add a preview-mode guard at the top of <head> to prevent unwanted
  // server-side redirects (auth checks, etc.) from navigating away.
  $("head").prepend(`<script>
// Preview mode: intercept common redirect patterns used by auth scripts
(function(){
  var _push = history.pushState;
  var _replace = history.replaceState;
  function isSafeUrl(u){
    try{ return new URL(u, location.href).hostname === location.hostname; }catch(e){ return true; }
  }
  history.pushState = function(s,t,u){ if(isSafeUrl(u)) _push.apply(this,arguments); };
  history.replaceState = function(s,t,u){ if(isSafeUrl(u)) _replace.apply(this,arguments); };
  // Suppress form submissions that would navigate away
  document.addEventListener('submit', function(e){ e.preventDefault(); }, true);
})();
</script>`);

  $("noscript").remove();
  $("iframe").remove();
  $("video").remove();
  $("audio").remove();

  return $.html();
}

function resolveUrls($: ReturnType<typeof cheerio.load>, baseUrl: URL) {
  $("[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) $(el).attr("src", toAbsolute(src, baseUrl));
  });

  $("[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href) $(el).attr("href", toAbsolute(href, baseUrl));
  });

  $("[srcset]").each((_, el) => {
    const srcset = $(el).attr("srcset");
    if (srcset) {
      const resolved = srcset
        .split(",")
        .map((part) => {
          const [u, ...rest] = part.trim().split(/\s+/);
          return [toAbsolute(u, baseUrl), ...rest].join(" ");
        })
        .join(", ");
      $(el).attr("srcset", resolved);
    }
  });

  $("[style]").each((_, el) => {
    const style = $(el).attr("style") ?? "";
    const replaced = style.replace(
      /url\(['"]?([^'")]+)['"]?\)/g,
      (_, u) => `url('${toAbsolute(u, baseUrl)}')`
    );
    $(el).attr("style", replaced);
  });
}

async function inlineStyles($: ReturnType<typeof cheerio.load>, baseUrl: URL) {
  const linkTags = $('link[rel="stylesheet"]').toArray().slice(0, 8);

  await Promise.all(
    linkTags.map(async (el) => {
      const href = $(el).attr("href");
      if (!href) return;
      try {
        const cssUrl = toAbsolute(href, baseUrl);
        const res = await fetch(cssUrl, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return;
        let css = await res.text();
        if (css.length > 200000) css = css.slice(0, 200000);

        // CSS 내 url() 절대경로 변환
        css = css.replace(
          /url\(['"]?([^'")]+)['"]?\)/g,
          (_, u) => `url('${toAbsolute(u, new URL(cssUrl))}')`
        );

        // @font-face 폰트 파일 base64 임베딩
        css = await inlineFonts(css, new URL(cssUrl));

        $(el).replaceWith(`<style data-src="${cssUrl}">${css}</style>`);
      } catch {
        // CSS 로드 실패 시 무시
      }
    })
  );

  // <style> 태그 안의 폰트도 처리
  const styleTags = $("style").toArray();
  await Promise.all(
    styleTags.map(async (el) => {
      const css = $(el).html() ?? "";
      if (!css.includes("@font-face")) return;
      const inlined = await inlineFonts(css, baseUrl);
      $(el).html(inlined);
    })
  );
}

/**
 * CSS 문자열에서 @font-face 내 url()을 찾아 base64 data URL로 교체합니다.
 * CORS 없이 폰트를 로드할 수 있게 됩니다.
 */
async function inlineFonts(css: string, baseUrl: URL): Promise<string> {
  // @font-face 블록 안의 url() 패턴 수집
  const urlPattern = /url\(['"]?(https?:\/\/[^'")]+\.(?:woff2?|ttf|otf|eot)[^'")]*|[^'")]+\.(?:woff2?|ttf|otf|eot)[^'")"]*)['"]?\)/gi;

  const matches = [...new Set([...css.matchAll(urlPattern)].map((m) => m[1]))];
  if (matches.length === 0) return css;

  // 폰트 URL → base64 변환 (최대 10개, 각 500KB 제한)
  const fontCache = new Map<string, string>();

  await Promise.all(
    matches.slice(0, 10).map(async (fontUrl) => {
      const absoluteUrl = toAbsolute(fontUrl, baseUrl);
      try {
        const res = await fetch(absoluteUrl, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;

        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 500 * 1024) return; // 500KB 초과 skip

        const mime = getFontMime(absoluteUrl);
        const b64 = buf.toString("base64");
        fontCache.set(fontUrl, `data:${mime};base64,${b64}`);
      } catch {
        // 폰트 로드 실패 시 무시 (원본 URL 유지)
      }
    })
  );

  // CSS에서 폰트 URL을 data URL로 교체
  return css.replace(urlPattern, (match, fontUrl) => {
    const dataUrl = fontCache.get(fontUrl);
    return dataUrl ? `url('${dataUrl}')` : match;
  });
}

/**
 * <img src> 및 인라인 style의 background-image를 base64 data URL로 변환합니다.
 * 로그인이 필요한 서버 이미지도 서버 사이드에서 가져와 임베딩합니다.
 */
async function inlineImages($: ReturnType<typeof cheerio.load>) {
  async function fetchDataUrl(url: string): Promise<string | null> {
    if (!url || url.startsWith("data:") || url.startsWith("javascript:")) return null;
    try {
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 1024 * 1024) return null; // 1MB 초과 skip
      const ct = (res.headers.get("content-type") ?? getImageMime(url)).split(";")[0];
      return `data:${ct};base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  }

  // <img src="..."> 인라인화 (최대 20개)
  const imgEls = $("img[src]").toArray().slice(0, 20);
  await Promise.all(
    imgEls.map(async (el) => {
      const src = $(el).attr("src") ?? "";
      const dataUrl = await fetchDataUrl(src);
      if (dataUrl) $(el).attr("src", dataUrl);
    })
  );

  // style attribute의 background-image 인라인화 (최대 10개)
  const bgQueue: Array<{ el: (typeof imgEls)[0]; url: string }> = [];
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") ?? "";
    const m = style.match(
      /url\(['"]?(https?:\/\/[^'")\s]+\.(?:png|jpg|jpeg|gif|webp|svg)[^'")\s]*)['"]?\)/i
    );
    if (m?.[1]) bgQueue.push({ el: el as (typeof imgEls)[0], url: m[1] });
  });

  await Promise.all(
    bgQueue.slice(0, 10).map(async ({ el, url }) => {
      const dataUrl = await fetchDataUrl(url);
      if (!dataUrl) return;
      const style = $(el).attr("style") ?? "";
      $(el).attr(
        "style",
        style.replace(
          /url\(['"]?https?:\/\/[^'")\s]+\.(?:png|jpg|jpeg|gif|webp|svg)[^'")\s]*['"]?\)/i,
          `url('${dataUrl}')`
        )
      );
    })
  );
}

function getImageMime(url: string): string {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

function getFontMime(url: string): string {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".ttf")) return "font/ttf";
  if (lower.endsWith(".otf")) return "font/otf";
  if (lower.endsWith(".eot")) return "application/vnd.ms-fontobject";
  return "font/woff2";
}

function toAbsolute(url: string, baseUrl: URL): string {
  if (!url || url.startsWith("data:") || url.startsWith("#")) return url;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

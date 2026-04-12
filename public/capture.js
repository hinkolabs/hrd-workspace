/**
 * HRD Workspace – Browser Capture Script
 * ----------------------------------------
 * Run as a bookmarklet while on any page (including auth-gated ones).
 * Serializes the fully-rendered DOM with all CSS / images / fonts inlined,
 * then POSTs to the local dev server and opens the UI editor.
 *
 * Bookmarklet (drag to bookmark bar):
 *   javascript:void((function(){var s=document.createElement('script');s.src='http://localhost:3000/capture.js?t='+Date.now();document.head.appendChild(s)})())
 */
(function () {
  'use strict';

  var SERVER = 'http://localhost:3000';
  var MAX_IMAGES = 30;
  var MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB per image
  var MAX_FONT_BYTES = 600 * 1024;        // 600 KB per font

  // ── Status overlay ────────────────────────────────────────────────────────
  var overlay = document.createElement('div');
  overlay.id = '__hrd_capture_overlay';
  overlay.style.cssText = [
    'position:fixed', 'top:16px', 'right:16px', 'z-index:2147483647',
    'background:#1e293b', 'color:#e2e8f0', 'font:14px/1.5 system-ui,sans-serif',
    'padding:14px 20px', 'border-radius:10px', 'box-shadow:0 8px 32px rgba(0,0,0,.4)',
    'min-width:260px', 'max-width:360px', 'transition:opacity .3s',
  ].join(';');
  document.body.appendChild(overlay);

  function status(msg, color) {
    overlay.innerHTML =
      '<b style="color:' + (color || '#60a5fa') + '">HRD 캡처</b> &nbsp;' + msg;
  }
  function dismiss() {
    overlay.style.opacity = '0';
    setTimeout(function () { overlay.remove(); }, 400);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function toB64(buffer, mime) {
    var bytes = new Uint8Array(buffer);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'data:' + mime + ';base64,' + btoa(bin);
  }

  function guessMime(url) {
    var u = url.split('?')[0].toLowerCase();
    if (u.endsWith('.png'))  return 'image/png';
    if (u.endsWith('.gif'))  return 'image/gif';
    if (u.endsWith('.webp')) return 'image/webp';
    if (u.endsWith('.svg'))  return 'image/svg+xml';
    if (u.endsWith('.woff2')) return 'font/woff2';
    if (u.endsWith('.woff'))  return 'font/woff';
    if (u.endsWith('.ttf'))   return 'font/ttf';
    if (u.endsWith('.otf'))   return 'font/otf';
    return 'image/jpeg';
  }

  function fetchBinary(url) {
    return fetch(url, { credentials: 'include' }).then(function (r) {
      if (!r.ok) return null;
      return r.arrayBuffer().then(function (buf) {
        return { buf: buf, ct: r.headers.get('content-type') || guessMime(url) };
      });
    }).catch(function () { return null; });
  }

  // ── 1. Collect all stylesheets ─────────────────────────────────────────────
  async function collectAllCSS() {
    var sheets = Array.from(document.styleSheets);
    var parts = [];

    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      try {
        // Same-origin: read cssRules directly
        var rules = Array.from(sheet.cssRules);
        parts.push(rules.map(function (r) { return r.cssText; }).join('\n'));
      } catch (e) {
        // Cross-origin: fetch the stylesheet text
        if (sheet.href) {
          try {
            var r = await fetch(sheet.href, { credentials: 'include' });
            if (r.ok) parts.push(await r.text());
          } catch (e2) { /* skip */ }
        }
      }
    }

    return parts.join('\n');
  }

  // ── 2. Inline @font-face URLs in CSS ──────────────────────────────────────
  async function inlineFontsInCss(css) {
    var urlPattern = /url\(['"]?(https?:\/\/[^'")\s]+\.(?:woff2?|ttf|otf|eot)[^'")\s]*)['"]?\)/gi;
    var matches = [];
    var m;
    var seen = new Set();
    while ((m = urlPattern.exec(css)) !== null) {
      if (!seen.has(m[1])) { seen.add(m[1]); matches.push(m[1]); }
    }

    var fontMap = {};
    await Promise.all(matches.slice(0, 20).map(async function (url) {
      var result = await fetchBinary(url);
      if (!result || result.buf.byteLength > MAX_FONT_BYTES) return;
      var mime = result.ct.split(';')[0] || guessMime(url);
      fontMap[url] = toB64(result.buf, mime);
    }));

    return css.replace(urlPattern, function (match, url) {
      return fontMap[url] ? "url('" + fontMap[url] + "')" : match;
    });
  }

  // ── 3. Inline <img> tags ───────────────────────────────────────────────────
  async function inlineImages(cloneDoc) {
    var imgs = Array.from(cloneDoc.querySelectorAll('img[src]')).slice(0, MAX_IMAGES);

    await Promise.all(imgs.map(async function (img) {
      var src = img.getAttribute('src');
      if (!src || src.startsWith('data:')) return;

      // Try canvas approach first (works for same-origin + CORS-enabled images)
      try {
        var canvas = document.createElement('canvas');
        var origImg = document.querySelector('img[src="' + CSS.escape(src) + '"]') || img;
        if (origImg.naturalWidth && origImg.naturalHeight) {
          canvas.width = origImg.naturalWidth;
          canvas.height = origImg.naturalHeight;
          canvas.getContext('2d').drawImage(origImg, 0, 0);
          var dataUrl = canvas.toDataURL();
          if (dataUrl !== 'data:,') { img.setAttribute('src', dataUrl); return; }
        }
      } catch (e) { /* cross-origin taint — fall through */ }

      // Fallback: fetch binary
      var result = await fetchBinary(src);
      if (!result || result.buf.byteLength > MAX_IMAGE_BYTES) return;
      var mime = result.ct.split(';')[0] || guessMime(src);
      img.setAttribute('src', toB64(result.buf, mime));
    }));
  }

  // ── 4. Build self-contained HTML ───────────────────────────────────────────
  async function buildHtml() {
    status('DOM 수집 중...');

    // Deep-clone the live DOM so we can mutate without affecting the page
    var cloneDoc = document.documentElement.cloneNode(true);

    // Collect and inline all CSS
    status('스타일 수집 중...');
    var rawCss = await collectAllCSS();
    var inlinedCss = await inlineFontsInCss(rawCss);

    // Replace <link rel="stylesheet"> tags in the clone with a single <style>
    Array.from(cloneDoc.querySelectorAll('link[rel="stylesheet"]')).forEach(function (l) {
      l.remove();
    });
    // Remove existing <style> tags (they're already captured in cssRules)
    Array.from(cloneDoc.querySelectorAll('style')).forEach(function (s) { s.remove(); });

    var styleEl = document.createElement('style');
    styleEl.textContent = inlinedCss;
    cloneDoc.querySelector('head').insertBefore(styleEl, cloneDoc.querySelector('head').firstChild);

    // Inline images
    status('이미지 변환 중...');
    await inlineImages(cloneDoc);

    // Inject preview-mode guard (prevent auth redirects, disable form submissions)
    var guardScript = document.createElement('script');
    guardScript.textContent = [
      '(function(){',
      '  var _p=history.pushState,_r=history.replaceState;',
      '  function safe(u){try{return new URL(u,location.href).hostname===location.hostname;}catch(e){return true;}}',
      '  history.pushState=function(s,t,u){if(safe(u))_p.apply(this,arguments);};',
      '  history.replaceState=function(s,t,u){if(safe(u))_r.apply(this,arguments);};',
      '  document.addEventListener("submit",function(e){e.preventDefault();},true);',
      '})();',
    ].join('\n');
    cloneDoc.querySelector('head').insertBefore(guardScript, cloneDoc.querySelector('head').firstChild);

    // Remove analytics / tracking scripts
    Array.from(cloneDoc.querySelectorAll(
      'script[src*="google-analytics"],script[src*="googletagmanager"],script[src*="gtag"],script[src*="analytics"]'
    )).forEach(function (s) { s.remove(); });

    // Remove iframes, video, audio, noscript
    ['iframe', 'video', 'audio', 'noscript'].forEach(function (tag) {
      cloneDoc.querySelectorAll(tag).forEach(function (el) { el.remove(); });
    });

    return '<!DOCTYPE html>\n<html' + (cloneDoc.getAttribute('lang') ? ' lang="' + cloneDoc.getAttribute('lang') + '"' : '') + '>\n' +
      cloneDoc.querySelector('head').outerHTML + '\n' +
      cloneDoc.querySelector('body').outerHTML + '\n</html>';
  }

  // ── 5. Auto-extract page name from URL ────────────────────────────────────
  function extractPageName(url) {
    try {
      var path = new URL(url).pathname;
      var last = path.split('/').filter(Boolean).pop() || '';
      return (last.replace(/\.[a-z]+$/i, '') || 'page').replace(/[^a-zA-Z0-9_-]/g, '-');
    } catch (e) { return 'page'; }
  }

  // ── 6. Upload to local dev server ─────────────────────────────────────────
  async function upload(html) {
    status('서버에 저장 중...');
    var pageName = extractPageName(location.href);

    var resp = await fetch(SERVER + '/api/ui-editor/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: html, url: location.href, pageName: pageName }),
    });

    if (!resp.ok) {
      var err = await resp.json().catch(function () { return {}; });
      throw new Error(err.error || ('서버 오류 ' + resp.status));
    }

    return await resp.json();
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  (async function () {
    try {
      var html = await buildHtml();
      var result = await upload(html);
      status('완료! 편집기를 엽니다...', '#34d399');
      setTimeout(function () {
        window.open(SERVER + '/ui-editor?captured=' + encodeURIComponent(result.name), '_blank');
        dismiss();
      }, 800);
    } catch (e) {
      status('오류: ' + e.message, '#f87171');
      setTimeout(dismiss, 5000);
    }
  })();
})();

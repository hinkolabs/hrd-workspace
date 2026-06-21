/**
 * KIFIN(금융투자협회) 학습 자동화
 *
 * 사용법:
 *   1. config.json 에 courseUrl 설정 (또는 config.example.json 복사)
 *   2. npm install (프로젝트 루트에서 playwright 이미 있음)
 *   3. npx playwright install chromium
 *   4. node kifin-auto/run.mjs
 *
 * 첫 실행 시 브라우저가 열리면 로그인 후 과정 상세 페이지로 이동한 뒤 Enter.
 */

import { chromium } from "playwright";
import { existsSync, readFileSync, appendFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import {
  STEALTH_INIT_SCRIPT,
  sleep,
  humanDelay,
  humanClick,
  humanDismissConfirm,
  attachHumanDialogHandler,
} from "./stealth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ERROR_LOG = join(__dirname, "error.log");

/** Windows bat 더블클릭 시 stdin 이 닫히지 않도록 readline 을 한 번만 생성 */
let rlInterface = null;

function loadConfig() {
  const path = join(__dirname, "config.json");
  const example = join(__dirname, "config.example.json");
  const src = existsSync(path) ? path : example;
  const cfg = JSON.parse(readFileSync(src, "utf8"));
  return {
    humanLike: true,
    useChromeChannel: true,
    enterKeyRatio: 0.5,
    actionDelayMinMs: 400,
    actionDelayMaxMs: 1400,
    dialogDelayMinMs: 800,
    dialogDelayMaxMs: 2500,
    dialogPollMinMs: 800,
    dialogPollMaxMs: 1600,
    betweenSessionsMinMs: 3000,
    betweenSessionsMaxMs: 7000,
    mouseStepsMin: 14,
    mouseStepsMax: 32,
    ...cfg,
  };
}

async function pollDelay(cfg) {
  const min = cfg.dialogPollMinMs ?? 800;
  const max = cfg.dialogPollMaxMs ?? 1600;
  await sleep(min + Math.random() * (max - min));
}

async function betweenSessionsDelay(cfg) {
  const min = cfg.betweenSessionsMinMs ?? 3000;
  const max = cfg.betweenSessionsMaxMs ?? 7000;
  await sleep(min + Math.random() * (max - min));
}

function log(msg) {
  const t = new Date().toLocaleTimeString("ko-KR");
  console.log(`[${t}] ${msg}`);
}

function logError(err) {
  const text = err instanceof Error ? `${err.stack || err.message}` : String(err);
  console.error("\n[ERROR]", text);
  try {
    appendFileSync(ERROR_LOG, `[${new Date().toISOString()}]\n${text}\n\n`);
    console.error(`(error.log 에 저장됨: ${ERROR_LOG})`);
  } catch {
    /* ignore */
  }
}

function waitForEnter(prompt) {
  if (!rlInterface) {
    rlInterface = readline.createInterface({ input: process.stdin, output: process.stdout });
  }
  return new Promise((resolve) => {
    rlInterface.question(prompt, () => resolve());
  });
}

function closeReadline() {
  if (rlInterface) {
    rlInterface.close();
    rlInterface = null;
  }
}

function printNavigationGuide() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  어디로 들어가야 하나요?                                      ║
╠══════════════════════════════════════════════════════════════╣
║  "메인페이지" = 협회 홈이 아니라, 차시 목록이 보이는 페이지   ║
║                                                               ║
║  화면에 이런 게 보이면 맞는 페이지입니다:                     ║
║    · 4. 협회규정 / 5. KRX 제도 … 처럼 과목(섹션) 목록         ║
║    · 차시1, 차시2 … + 파란색 [학습하기] 버튼                  ║
║    · 주소창 URL 이 …detail.do 로 끝남                         ║
╠══════════════════════════════════════════════════════════════╣
║  브라우저에서 직접 이동하는 순서:                             ║
║                                                               ║
║  1) kifin.or.kr 접속 → 로그인                                 ║
║  2) 상단/메뉴에서 [교육] 또는 [나의 학습] / [수강신청·학습]   ║
║  3) 수강 중인 과정(시험 준비 과정명) 클릭                      ║
║  4) 과정 안의 목차·차시 목록 페이지로 들어감                  ║
║     → 여기서 [학습하기] 버튼이 보이는 화면!                   ║
║                                                               ║
║  ※ 이미 Chrome에서 그 페이지를 열어 두었다면                  ║
║     그 탭 주소를 복사해 config.json 의 courseUrl 에 넣으면    ║
║     다음부터 자동으로 그 페이지로 이동합니다.                 ║
╚══════════════════════════════════════════════════════════════╝
`);
}

async function countSessionButtons(page) {
  const all = page.locator("a, button, input[type='button'], input[type='submit'], span");
  const learn = all.filter({ hasText: "학습하기" }).filter({ hasNotText: "복습" });
  const review = all.filter({ hasText: "복습하기" });
  const learnCount = await learn.count().catch(() => 0);
  const reviewCount = await review.count().catch(() => 0);
  return { learnCount, reviewCount };
}

async function validateCoursePage(page) {
  const url = page.url();
  const { learnCount, reviewCount } = await countSessionButtons(page);

  if (learnCount > 0 || reviewCount > 0) {
    log(`차시 목록 페이지 확인 (학습하기 ${learnCount}개, 복습하기 ${reviewCount}개)`);
    return true;
  }

  console.log(`
[!] 아직 차시 목록이 보이지 않습니다.

  현재 주소: ${url}

  브라우저에서 차시1, 차시2 + [학습하기] 버튼이 보이는 화면까지
  이동한 뒤, 이 cmd 창에서 다시 Enter 를 눌러주세요.
  (cmd 창을 닫지 마세요!)
`);
  return false;
}

/** 일시정지가 길면 플레이어 영역을 마우스로 한 번 클릭 (JS play() 호출 안 함) */
async function nudgePlayerIfPaused(page, cfg) {
  if (cfg.humanLike === false) return;

  const paused = await page
    .evaluate(() => {
      const v = document.querySelector("video");
      return v ? v.paused && !v.ended : false;
    })
    .catch(() => false);

  if (!paused) return;

  const player = page.locator("video, .player, [class*='player'], iframe").first();
  if (await player.isVisible({ timeout: 200 }).catch(() => false)) {
    await humanClick(page, player, cfg);
  }
}

/** 학습하기 클릭 후 실제 popup.do 페이지가 열릴 때까지 대기 */
async function waitForLearningPopup(context, mainPage, hint, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let lastLogged = "";

  while (Date.now() < deadline) {
    const pages = context.pages().filter((p) => !p.isClosed() && p !== mainPage);

    for (const p of pages) {
      const url = p.url();
      if (url.includes("popup.do") || (url.includes("kifin.or.kr") && !url.startsWith("about:"))) {
        log("  팝업 준비: " + url);
        await p.waitForLoadState("domcontentloaded").catch(() => {});
        return p;
      }
      if (url !== lastLogged) {
        log("  팝업 로딩 중: " + url);
        lastLogged = url;
      }
    }

    if (hint && !hint.isClosed()) {
      const url = hint.url();
      if (url.includes("popup.do") || (url.includes("kifin.or.kr") && !url.startsWith("about:"))) {
        log("  팝업 준비: " + url);
        return hint;
      }
      if (url !== lastLogged) {
        log("  팝업 로딩 중: " + url);
        lastLogged = url;
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return null;
}

/** video 또는 iframe 플레이어가 나타날 때까지 대기 */
async function waitForPlayer(popup, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline && !popup.isClosed()) {
    const hasVideo = (await popup.locator("video").count()) > 0;
    const hasIframe = (await popup.locator("iframe").count()) > 0;
    const hasClipCounter = await popup
      .locator("text=/\\d+\\s*\\/\\s*\\d+/")
      .first()
      .isVisible({ timeout: 300 })
      .catch(() => false);

    if (hasVideo || hasClipCounter) return true;

    for (const frame of popup.frames()) {
      if ((await frame.locator("video").count()) > 0) return true;
    }

    if (hasIframe) {
      await popup.waitForTimeout(2000);
      continue;
    }

    await popup.waitForTimeout(500);
  }

  return false;
}

/** 팝업 창에서 모든 클립이 끝날 때까지 대기. 성공 여부 반환 */
async function runPopupUntilDone(popup, cfg) {
  attachHumanDialogHandler(popup, cfg);

  if (popup.isClosed()) return false;

  try {
    await popup.waitForURL(/popup\.do|learning/, { timeout: 60000 });
  } catch {
    log("  URL 로딩 지연, 현재: " + popup.url());
  }

  await popup.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

  const playerReady = await waitForPlayer(popup, 60000);
  if (!playerReady) {
    log("  ⚠ 영상 플레이어를 찾지 못했습니다 (현재 URL: " + popup.url() + ")");
    return false;
  }

  log("  플레이어 감지 — 1배속 재생, 확인은 마우스/Enter 로 처리");

  const deadline = Date.now() + cfg.clipEndTimeoutMs;
  let lastClipLabel = "";
  let staleCount = 0;
  let sawClip = false;
  let idleTicks = 0;

  while (!popup.isClosed() && Date.now() < deadline) {
    idleTicks++;
    if (idleTicks % 25 === 0) {
      await nudgePlayerIfPaused(popup, cfg);
    }

    const dismissed = await humanDismissConfirm(popup, cfg);
    if (dismissed) {
      await humanDelay(cfg, "dialogDelayMinMs", "dialogDelayMaxMs", 300, 900);
    }

    // 플레이어 클립 번호 (예: 5/12) — 재생 시간(00:21/06:04)과 구분
    const clipText = await popup
      .evaluate(() => {
        const body = document.body?.innerText || "";
        // "5 / 12" 형태, 앞 숫자 <= 뒤 숫자, 뒤 숫자 2~30 (차시당 클립 수)
        const m = body.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/g);
        if (!m) return null;
        for (const part of m) {
          const [, cur, total] = part.match(/(\d+)\s*\/\s*(\d+)/) || [];
          const c = Number(cur);
          const t = Number(total);
          if (c >= 1 && t >= 2 && t <= 30 && c <= t) return `${c}/${t}`;
        }
        return null;
      })
      .catch(() => null);

    if (clipText) {
      const [cur, total] = clipText.split("/");
      if (clipText !== lastClipLabel) {
        log(`  클립 ${cur}/${total}`);
        lastClipLabel = clipText;
        staleCount = 0;
        sawClip = true;
        await humanDelay(cfg, "actionDelayMinMs", "actionDelayMaxMs", 200, 600);
      } else if (cur === total) {
        staleCount++;
        if (staleCount > 40) {
          log("  마지막 클립 완료");
          break;
        }
      }
    }

    await pollDelay(cfg);
  }

  if (!popup.isClosed()) {
    await humanDelay(cfg, "actionDelayMinMs", "actionDelayMaxMs", 500, 1200);
    await popup.close().catch(() => {});
  }

  return sawClip;
}

/** 메인 페이지에서 '학습하기' 버튼 찾기 (복습하기 제외) */
async function findLearnButtons(page) {
  const learn = page
    .locator("a, button, input[type='button'], input[type='submit']")
    .filter({ hasText: "학습하기" })
    .filter({ hasNotText: "복습" });
  const count = await learn.count();
  const result = [];
  for (let i = 0; i < count; i++) {
    const el = learn.nth(i);
    if (await el.isVisible().catch(() => false)) {
      result.push(el);
    }
  }
  return result;
}

async function launchBrowser(cfg) {
  const userDataDir = join(__dirname, cfg.userDataDir || "browser-data");
  const launchOpts = {
    headless: cfg.headless ?? false,
    viewport: { width: 1280, height: 900 },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--no-first-run",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  };

  if (cfg.useChromeChannel !== false) {
    launchOpts.channel = "chrome";
  }

  try {
    const context = await chromium.launchPersistentContext(userDataDir, launchOpts);
    await context.addInitScript(STEALTH_INIT_SCRIPT);
    return context;
  } catch (err) {
    if (launchOpts.channel) {
      log("설치된 Chrome 없음 — Chromium 으로 실행");
      delete launchOpts.channel;
      const context = await chromium.launchPersistentContext(userDataDir, launchOpts);
      await context.addInitScript(STEALTH_INIT_SCRIPT);
      return context;
    }
    throw err;
  }
}

async function main() {
  let context = null;

  try {
    const cfg = loadConfig();
    const userDataDir = join(__dirname, cfg.userDataDir || "browser-data");

    log("브라우저 시작 (humanLike=" + cfg.humanLike + ", " + userDataDir + ")");
    context = await launchBrowser(cfg);

    context.on("page", (p) => attachHumanDialogHandler(p, cfg));

    let page = context.pages()[0] || (await context.newPage());

    printNavigationGuide();

    const startUrl = cfg.courseUrl || cfg.startUrl || "https://www.kifin.or.kr";
    log("브라우저 열기: " + startUrl);
    await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    while (true) {
      await waitForEnter("\n>>> 차시 목록([학습하기] 버튼) 화면까지 이동했으면 Enter <<<\n");

      page =
        context.pages().find((p) => !p.isClosed() && p.url().includes("kifin.or.kr")) ||
        page;

      if (page.isClosed()) {
        log("브라우저 탭이 닫혔습니다. 새 탭을 엽니다.");
        page = await context.newPage();
        await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
        continue;
      }

      await page.bringToFront().catch(() => {});

      if (await validateCoursePage(page)) break;
    }

    const currentUrl = page.url();
    if (currentUrl.includes("detail.do")) {
      log("팁: config.json 에 아래 주소를 courseUrl 로 저장하면 다음부터 바로 이동합니다.");
      log("  " + currentUrl);
    }

    let sessionNum = 0;

    while (true) {
      await page.bringToFront().catch(() => {});
      await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
      await betweenSessionsDelay(cfg);

      const buttons = await findLearnButtons(page);
      if (buttons.length === 0) {
        const { learnCount, reviewCount } = await countSessionButtons(page);
        if (sessionNum === 0 && reviewCount === 0) {
          log("'학습하기' 버튼을 찾지 못했습니다. 페이지가 맞는지 확인해주세요.");
          await waitForEnter("\n다시 시도하려면 Enter (종료는 Ctrl+C)...\n");
          continue;
        }
        log("남은 '학습하기' 차시가 없습니다. 완료!");
        break;
      }

      sessionNum++;
      log(`=== 차시 ${sessionNum} 시작 (남은 학습하기: ${buttons.length}개) ===`);

      const btn = buttons[0];
      const popupPromise = context.waitForEvent("page", { timeout: 15000 }).catch(() => null);

      await humanDelay(cfg, "actionDelayMinMs", "actionDelayMaxMs", 500, 1500);
      await humanClick(page, btn, cfg);
      log("  '학습하기' 클릭 (마우스)");

      const popupHint = await popupPromise;
      const popup = await waitForLearningPopup(context, page, popupHint, 60000);

      if (!popup) {
        log("  ⚠ 학습 팝업이 열리지 않았습니다. 잠시 후 재시도...");
        await betweenSessionsDelay(cfg);
        sessionNum--;
        continue;
      }

      const ok = await runPopupUntilDone(popup, cfg);
      if (!ok) {
        log("  ⚠ 이 차시 학습이 진행되지 않았습니다. 같은 차시 재시도...");
        sessionNum--;
        await betweenSessionsDelay(cfg);
        continue;
      }

      log(`=== 차시 ${sessionNum} 처리 완료 ===\n`);

      await betweenSessionsDelay(cfg);
    }

    log("작업 완료. 브라우저를 닫습니다.");
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    await waitForEnter("\n종료하려면 Enter 키를 누르세요...\n");
    closeReadline();
  }
}

main().catch(async (err) => {
  logError(err);
  await waitForEnter("\n오류 발생. Enter 를 누르면 종료합니다...\n").catch(() => {});
  closeReadline();
  process.exit(1);
});

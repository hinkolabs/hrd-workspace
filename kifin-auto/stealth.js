/** Playwright 자동화 흔적 완화 (페이지 로드 전 주입) */
export const STEALTH_INIT_SCRIPT = () => {
  Object.defineProperty(navigator, "webdriver", {
    get: () => undefined,
    configurable: true,
  });

  if (!window.chrome) {
    window.chrome = { runtime: {} };
  }

  const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
  window.navigator.permissions.query = (parameters) =>
    parameters.name === "notifications"
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(parameters);

  Object.defineProperty(navigator, "plugins", {
    get: () => [1, 2, 3, 4, 5],
  });

  Object.defineProperty(navigator, "languages", {
    get: () => ["ko-KR", "ko", "en-US", "en"],
  });
};

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function humanDelay(cfg, minKey, maxKey, defaultMin = 400, defaultMax = 1200) {
  const min = cfg[minKey] ?? defaultMin;
  const max = cfg[maxKey] ?? defaultMax;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  await sleep(lo + Math.random() * (hi - lo));
}

/** 마우스를 곡선처럼 이동 후 클릭 */
export async function humanClick(page, locator, cfg) {
  if (cfg.humanLike === false) {
    await locator.click();
    return;
  }

  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (!box) {
    await locator.click();
    return;
  }

  const x = box.x + box.width * (0.28 + Math.random() * 0.44);
  const y = box.y + box.height * (0.32 + Math.random() * 0.36);
  const stepsMin = cfg.mouseStepsMin ?? 14;
  const stepsMax = cfg.mouseStepsMax ?? 32;
  const steps = stepsMin + Math.floor(Math.random() * (stepsMax - stepsMin + 1));

  const fromX = x + (Math.random() - 0.5) * 100;
  const fromY = y + (Math.random() - 0.5) * 60;
  await page.mouse.move(fromX, fromY, { steps: Math.max(6, Math.floor(steps / 2)) });
  await humanDelay(cfg, "actionDelayMinMs", "actionDelayMaxMs", 60, 220);
  await page.mouse.move(x, y, { steps });
  await humanDelay(cfg, "actionDelayMinMs", "actionDelayMaxMs", 40, 160);
  await page.mouse.down();
  await humanDelay(cfg, "actionDelayMinMs", "actionDelayMaxMs", 30, 100);
  await page.mouse.up();
}

/** Enter 키 입력 (딜레이 포함) */
export async function humanEnter(page, cfg) {
  await humanDelay(cfg, "actionDelayMinMs", "actionDelayMaxMs", 80, 200);
  const delay = 40 + Math.floor(Math.random() * 90);
  await page.keyboard.press("Enter", { delay });
}

/** 확인 모달: Enter 또는 마우스 클릭을 섞어서 처리 */
export async function humanDismissConfirm(page, cfg) {
  const selectors = [
    'button:has-text("확인")',
    'a:has-text("확인")',
    'input[type="button"][value="확인"]',
    'input[type="submit"][value="확인"]',
    ".modal-footer button.btn-primary",
    ".popup_btn_confirm",
    "#btnConfirm",
  ];

  let target = null;
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if (await loc.isVisible({ timeout: 80 }).catch(() => false)) {
      target = loc;
      break;
    }
  }
  if (!target) return false;

  await humanDelay(cfg, "dialogDelayMinMs", "dialogDelayMaxMs", 700, 2200);

  const enterRatio = cfg.enterKeyRatio ?? 0.5;
  const useEnter = cfg.humanLike !== false && Math.random() < enterRatio;

  if (useEnter) {
    try {
      await target.focus();
    } catch {
      await page.locator("body").click({ position: { x: 8, y: 8 }, force: true }).catch(() => {});
    }
    await humanEnter(page, cfg);
    return true;
  }

  await humanClick(page, target, cfg);
  return true;
}

export function attachHumanDialogHandler(page, cfg) {
  page.on("dialog", async (dialog) => {
    await humanDelay(cfg, "dialogDelayMinMs", "dialogDelayMaxMs", 800, 2500);
    await dialog.accept();
  });
}

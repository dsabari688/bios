import { chromium } from "playwright";

async function testSWCacheIssue() {
  console.log("Testing Service Worker stale cache & mobile behavior...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  });

  const page = await context.newPage();

  page.on("console", (msg) => console.log(`[PHONE CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`));
  page.on("pageerror", (err) => console.error("[PHONE PAGE ERROR]", err));
  page.on("requestfailed", (req) => console.error(`[PHONE REQ FAILED] ${req.url()} - ${req.failure()?.errorText}`));

  try {
    await page.goto("http://localhost:9000", { waitUntil: "networkidle" });
    
    // Check registered Service Workers & Cache Storage
    const swRegistrations = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return [];
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.map(r => ({ scope: r.scope, active: !!r.active }));
    });

    const cacheKeys = await page.evaluate(async () => {
      if (!("caches" in window)) return [];
      return await caches.keys();
    });

    console.log("\nRegistered Service Workers on Phone:", swRegistrations);
    console.log("Active Cache Storage Keys on Phone:", cacheKeys);

    // Capture screenshot of mobile phone screen
    await page.screenshot({ path: "phone-debug-live.png", fullPage: true });
    console.log("Saved screenshot to phone-debug-live.png");
  } catch (err: any) {
    console.error("Test error:", err);
  } finally {
    await browser.close();
  }
}

testSWCacheIssue();

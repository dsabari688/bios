import { chromium } from "playwright";

async function testCleanMobile() {
  console.log("Testing fresh/clean mobile browser session...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  });

  // Ensure completely clean storage (no pre-set localStorage)
  const page = await context.newPage();

  page.on("console", (msg) => {
    console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on("pageerror", (err) => {
    console.error(`[PAGE ERROR]`, err);
  });

  page.on("requestfailed", (req) => {
    console.error(`[REQUEST FAILED] ${req.url()} - ${req.failure()?.errorText}`);
  });

  try {
    console.log("Navigating to http://localhost:9000...");
    await page.goto("http://localhost:9000", { waitUntil: "domcontentloaded", timeout: 10000 });
    
    await page.waitForTimeout(5000);

    const rootHTML = await page.evaluate(() => document.getElementById("root")?.innerHTML || "EMPTY ROOT");
    console.log("\n--- ROOT ELEMENT HTML LENGTH ---:", rootHTML.length);
    if (rootHTML.length < 500) {
      console.log("--- ROOT HTML CONTENT ---:", rootHTML);
    }
  } catch (err: any) {
    console.error("Test error:", err.message);
  } finally {
    await browser.close();
  }
}

testCleanMobile();

import { chromium } from "playwright";

async function testMobileNetwork() {
  console.log("Testing mobile access on localhost:9000 and 10.239.162.231:9000...");
  const browser = await chromium.launch({ headless: true });

  const targets = [
    "http://localhost:9000",
    "http://10.239.162.231:9000"
  ];

  for (const targetUrl of targets) {
    console.log(`\n--- TESTING TARGET: ${targetUrl} ---`);
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    });

    const page = await context.newPage();

    const logs: string[] = [];
    const errors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      logs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on("pageerror", (err) => {
      errors.push(`[PAGE ERROR] ${err.name}: ${err.message}\n${err.stack}`);
    });

    page.on("requestfailed", (req) => {
      failedRequests.push(`[FAILED REQ] ${req.url()} - ${req.failure()?.errorText}`);
    });

    try {
      await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(3000);

      const rootHTML = await page.evaluate(() => document.getElementById("root")?.innerHTML || "EMPTY ROOT");
      console.log(`Root HTML length for ${targetUrl}:`, rootHTML.length);

      if (rootHTML.length < 500) {
        console.log(`--- ROOT HTML FOR ${targetUrl} ---:`, rootHTML);
      }

      console.log("Console Logs:", logs.slice(0, 15));
      if (errors.length > 0) {
        console.log("Page Errors:", errors);
      }
      if (failedRequests.length > 0) {
        console.log("Failed Requests:", failedRequests);
      }
    } catch (err: any) {
      console.error(`Error navigating to ${targetUrl}:`, err.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();
}

testMobileNetwork();

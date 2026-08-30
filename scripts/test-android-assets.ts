import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";

// Simple static server for android assets directory
const assetsDir = path.resolve("frontend/android/app/src/main/assets/public");

const server = http.createServer((req, res) => {
  let filePath = path.join(assetsDir, req.url === "/" ? "index.html" : req.url!.split("?")[0]);
  
  if (!fs.existsSync(filePath)) {
    // SPA fallback
    filePath = path.join(assetsDir, "index.html");
  }

  const ext = path.extname(filePath);
  let contentType = "text/html";
  if (ext === ".js") contentType = "text/javascript";
  if (ext === ".css") contentType = "text/css";
  if (ext === ".json") contentType = "application/json";
  if (ext === ".png") contentType = "image/png";
  if (ext === ".svg") contentType = "image/svg+xml";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    }
  });
});

async function testAndroidAssets() {
  server.listen(9876, async () => {
    console.log("Static asset test server running on port 9876...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    });

    const page = await context.newPage();
    const logs: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => logs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`));
    page.on("pageerror", (err) => pageErrors.push(`[PAGE ERROR] ${err.name}: ${err.message}\n${err.stack}`));

    try {
      await page.goto("http://localhost:9876", { waitUntil: "networkidle" });
      await page.waitForTimeout(4000);

      const rootHTML = await page.evaluate(() => document.getElementById("root")?.innerHTML || "EMPTY ROOT");
      console.log("\n=== ANDROID BUILT ASSETS ROOT HTML LENGTH ===:", rootHTML.length);
      console.log("Console Logs:", logs);
      if (pageErrors.length > 0) {
        console.error("PAGE ERRORS DETECTED:", pageErrors);
      }
      
      await page.screenshot({ path: "phone-android-built-shot.png", fullPage: true });
      console.log("Saved screenshot to phone-android-built-shot.png");
    } catch (err: any) {
      console.error("Test failed:", err.message);
    } finally {
      await browser.close();
      server.close();
    }
  });
}

testAndroidAssets();

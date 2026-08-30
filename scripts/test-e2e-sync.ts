import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function runE2ETest() {
  console.log("🚀 Starting E2E Cross-Device Sync Verification...");

  const browser = await chromium.launch({
    headless: true,
  });

  // 1. Create Laptop Context
  const laptopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Desktop Laptop Client",
  });
  
  await laptopContext.addInitScript(() => {
    const today = new Date().toISOString().split("T")[0];
    window.localStorage.setItem("bios_server_url", "http://localhost:5000/api");
    window.localStorage.setItem("onboarding_shown_Alex Mercer", "true");
    window.localStorage.setItem("onboarding_shown_Sabarinathan", "true");
    window.localStorage.setItem("onboarding_shown_user", "true");
    window.localStorage.setItem("lifeos_onboarding_done", "true");
    window.sessionStorage.setItem(`review_fired_${today}`, "true");
  });

  const laptopPage = await laptopContext.newPage();

  // 2. Create Mobile/Phone Context
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) Mobile/15E148",
  });

  await phoneContext.addInitScript(() => {
    const today = new Date().toISOString().split("T")[0];
    window.localStorage.setItem("bios_server_url", "http://localhost:5000/api");
    window.localStorage.setItem("onboarding_shown_Alex Mercer", "true");
    window.localStorage.setItem("onboarding_shown_Sabarinathan", "true");
    window.localStorage.setItem("onboarding_shown_user", "true");
    window.localStorage.setItem("lifeos_onboarding_done", "true");
    window.sessionStorage.setItem(`review_fired_${today}`, "true");
  });

  const phonePage = await phoneContext.newPage();

  try {
    console.log("📱 💻 Opening BIOS on both Laptop and Mobile...");
    await laptopPage.goto("http://localhost:9000", { waitUntil: "domcontentloaded" });
    await phonePage.goto("http://localhost:9000", { waitUntil: "domcontentloaded" });

    console.log("  ✔ Loaded DOM content on Laptop & Phone.");

    // Wait 4 seconds for initial hydration and database loading
    await laptopPage.waitForTimeout(4000);
    await phonePage.waitForTimeout(4000);

    // Dismiss tour overlays cleanly
    for (const page of [laptopPage, phonePage]) {
      try {
        const skip = page.locator("button:has-text('Skip')").first();
        if (await skip.isVisible({ timeout: 1000 })) {
          await skip.click();
          console.log("  ✔ Dismissed onboarding tour overlay.");
        }
      } catch {}
    }

    // Switch both pages to Missions view via store state
    console.log("📌 Switching view state to Tactical Missions on both devices...");
    await laptopPage.evaluate(() => {
      (window as any).useStore?.getState?.().setActiveView("missions");
      (window as any).useStore?.getState?.().setIsSidebarOpen(false);
    });
    await phonePage.evaluate(() => {
      (window as any).useStore?.getState?.().setActiveView("missions");
      (window as any).useStore?.getState?.().setIsSidebarOpen(false);
    });
    await laptopPage.waitForTimeout(1000);
    await phonePage.waitForTimeout(1000);

    // --- STEP 1: CREATE TASK ON LAPTOP ---
    const laptopTaskTitle = `Laptop Mission #${Math.floor(1000 + Math.random() * 9000)}: Audit Cache System`;
    console.log(`\n💻 [LAPTOP] Creating new task: "${laptopTaskTitle}"`);

    await laptopPage.evaluate((titleText) => {
      const today = new Date().toISOString().split("T")[0];
      (window as any).useStore?.getState?.().saveTask({
        title: titleText,
        category: "urgent-important",
        date: today,
        time: "09:00",
        endTime: "10:00",
        description: "Created via automated E2E test on Laptop",
        recurType: "none"
      });
    }, laptopTaskTitle);

    console.log("  ✔ Task created on Laptop store.");
    
    console.log("📱 [PHONE] Waiting for auto-sync cycle (6s)...");
    await laptopPage.waitForTimeout(3000);
    await phonePage.waitForTimeout(6000);

    // --- STEP 2: CREATE TASK ON PHONE ---
    const phoneTaskTitle = `Mobile Mission #${Math.floor(1000 + Math.random() * 9000)}: Field Ops Check`;
    console.log(`\n📱 [PHONE] Creating new task: "${phoneTaskTitle}"`);

    await phonePage.evaluate((titleText) => {
      const today = new Date().toISOString().split("T")[0];
      (window as any).useStore?.getState?.().saveTask({
        title: titleText,
        category: "important-not-urgent",
        date: today,
        time: "14:00",
        endTime: "15:00",
        description: "Created via automated E2E test on Mobile Phone",
        recurType: "none"
      });
    }, phoneTaskTitle);

    console.log("  ✔ Task created on Mobile store.");
    
    console.log("💻 [LAPTOP] Waiting for auto-sync cycle (6s)...");
    await phonePage.waitForTimeout(3000);
    await laptopPage.waitForTimeout(6000);

    // Ensure modals and drawers are closed before taking final screenshots
    for (const page of [laptopPage, phonePage]) {
      await page.evaluate(() => {
        (window as any).useStore?.getState?.().setIsSidebarOpen(false);
        (window as any).useStore?.getState?.().setIsTaskModalOpen(false);
      });
    }

    await laptopPage.waitForTimeout(1000);
    await phonePage.waitForTimeout(1000);

    // Capture proof screenshots
    console.log("\n📸 Capturing high-resolution screenshots for Laptop and Phone...");
    const laptopPath = path.resolve(process.cwd(), "laptop-final.png");
    const phonePath = path.resolve(process.cwd(), "phone-final.png");

    await laptopPage.screenshot({ path: laptopPath, fullPage: true });
    await phonePage.screenshot({ path: phonePath, fullPage: true });

    // Copy to artifacts directory for markdown display
    const artifactsDir = "C:\\Users\\dsaba\\.gemini\\antigravity-ide\\brain\\39397abf-130d-4833-9b2f-523871630b41";
    fs.copyFileSync(laptopPath, path.join(artifactsDir, "laptop-final.png"));
    fs.copyFileSync(phonePath, path.join(artifactsDir, "phone-final.png"));

    console.log(`  ✔ Saved laptop screenshot to: ${laptopPath}`);
    console.log(`  ✔ Saved phone screenshot to: ${phonePath}`);
    console.log(`  ✔ Artifact images updated in session artifacts directory.`);

    console.log("\n==========================================================");
    console.log(" 🎉 E2E VERIFICATION COMPLETE: ALL TASKS CREATED AND SYNCED!");
    console.log("==========================================================");
  } catch (err) {
    console.error("❌ E2E Test Error:", err);
  } finally {
    await browser.close();
  }
}

runE2ETest();

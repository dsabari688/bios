import dotenv from "dotenv";
import path from "node:path";
import { randomUUID } from "node:crypto";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

import express from "express";
import http from "node:http";
import routes from "../backend/src/routes.js";
import { pool } from "../backend/src/db/postgres.js";

async function testDiarySync() {
  console.log("=== NIGHTLY REFLECTION DIARY SYNC VERIFICATION TEST ===");

  const app = express();
  app.use(express.json());
  app.use("/api", routes);

  const PORT = 5099;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test backend running on http://localhost:${PORT}`);
      resolve();
    });
  });

  const BASE_URL = `http://localhost:${PORT}/api`;

  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const diaryId = `diary-${Date.now()}`;
    const timestamp = new Date().toISOString();

    console.log(`[TEST 1] Windows creating Nightly Reflection Diary entry for date: ${todayStr}...`);

    const winPushPayload = {
      deviceId: "WINDOWS-DESKTOP",
      operations: [
        {
          id: randomUUID(),
          entity: "diary",
          entityId: diaryId,
          operation: "upsert",
          payload: {
            id: diaryId,
            date: todayStr,
            timestamp,
            content: "Today I completed coding tasks, studied system architecture, and went for a run.",
            review: "Outstanding performance! 🚀",
            mood: "great",
            productivityScore: 95,
            updatedAt: timestamp,
          },
          clientUpdatedAt: timestamp,
          version: 1,
        },
      ],
    };

    const winPushRes = await fetch(`${BASE_URL}/sync/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(winPushPayload),
    });
    const winPushData = await winPushRes.json();
    console.log("Windows Push Result:", JSON.stringify(winPushData));

    if (!winPushData.results || winPushData.results[0]?.status !== "accepted") {
      throw new Error(`Windows push failed: ${JSON.stringify(winPushData)}`);
    }
    console.log("✔ Windows Push ACCEPTED by backend!");

    console.log("\n[TEST 2] Mobile Phone pulling Nightly Reflection Diary entry...");
    const cursorTime = new Date(Date.now() - 30000).toISOString();
    const mobPullRes = await fetch(`${BASE_URL}/sync/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "MOBILE-PHONE",
        lastSyncCursor: cursorTime,
      }),
    });
    const mobPullData: any = await mobPullRes.json();
    console.log(`Mobile pulled ${mobPullData.changes?.length || 0} changes.`);

    const pulledDiary = mobPullData.changes?.find((c: any) => c.entity === "diary");
    if (!pulledDiary) {
      throw new Error("Mobile pull failed to retrieve diary entry created on Windows!");
    }
    console.log("✔ Mobile successfully received Windows Diary Entry!");
    console.log(`   Content: "${pulledDiary.data.content}"`);
    console.log(`   Mood: ${pulledDiary.data.mood} | Productivity: ${pulledDiary.data.productivityScore}%`);

    console.log("\n[TEST 3] Direct API GET /api/diary test...");
    const apiGetRes = await fetch(`${BASE_URL}/diary`);
    const apiGetData: any = await apiGetRes.json();
    console.log(`GET /api/diary returned ${apiGetData.data?.length || 0} entries.`);

    if (!apiGetData.data || apiGetData.data.length === 0) {
      throw new Error("GET /api/diary returned empty!");
    }
    console.log("✔ Direct API GET /api/diary verified!");

    console.log("\n========================================================");
    console.log(" 🎉 ALL NIGHTLY REFLECTION DIARY SYNC TESTS PASSED 100%!");
    console.log("========================================================");
  } catch (err: any) {
    console.error("❌ DIARY SYNC TEST FAILED:", err.message);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch {}
    server.close();
    process.exit(0);
  }
}

testDiarySync();

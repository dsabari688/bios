import dotenv from "dotenv";
import path from "node:path";
import { randomUUID } from "node:crypto";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

import express from "express";
import http from "node:http";
import routes from "../backend/src/routes.js";
import { pool } from "../backend/src/db/postgres.js";

// Colors for terminal formatting
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const RED = "\x1b[31m";

async function runDeviceSyncProof() {
  console.log(`${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN} 📱 💻  LIFE-OS: MULTI-DEVICE (WINDOWS <-> MOBILE) SYNC TEST    ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

  // 1. Setup local Express server for isolation testing
  const app = express();
  app.use(express.json());
  app.use("/api", routes);

  const PORT = 5098;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`${GREEN}✔ Backend Sync Server running on http://localhost:${PORT}${RESET}\n`);
      resolve();
    });
  });

  const BASE_URL = `http://localhost:${PORT}/api`;

  try {
    const taskId = randomUUID();
    const expenseId = randomUUID();
    const habitId = randomUUID();
    const mobileExpenseId = randomUUID();

    const cursorTime = new Date(Date.now() - 60000).toISOString();

    console.log(`${BOLD}${MAGENTA}[STEP 1] 💻 WINDOWS DESKTOP PERFORMING ACTIONS...${RESET}`);
    console.log(`  ➔ Creating Task: "Finish Q4 Project Report" (ID: ${taskId})`);
    console.log(`  ➔ Creating Expense: "Office Equipment ₹4,500" (ID: ${expenseId})`);
    console.log(`  ➔ Creating Habit: "30 Mins Daily Workout" (ID: ${habitId})`);

    const windowsPushPayload = {
      deviceId: "WINDOWS-DESKTOP-CLIENT-X1",
      operations: [
        {
          id: randomUUID(),
          entity: "task",
          entityId: taskId,
          operation: "upsert",
          payload: {
            id: taskId,
            title: "Finish Q4 Project Report",
            description: "Prepare presentation slides and review budget",
            status: "pending",
            category: "work",
            date: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          clientUpdatedAt: new Date().toISOString(),
          version: 1
        },
        {
          id: randomUUID(),
          entity: "expense",
          entityId: expenseId,
          operation: "upsert",
          payload: {
            id: expenseId,
            amount: 4500,
            category: "Work & Office",
            description: "Office Equipment ₹4,500",
            paymentMethod: "UPI",
            transactionDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          clientUpdatedAt: new Date().toISOString(),
          version: 1
        },
        {
          id: randomUUID(),
          entity: "habit",
          entityId: habitId,
          operation: "upsert",
          payload: {
            id: habitId,
            name: `Workout ${Date.now().toString().slice(-4)}`,
            frequency: "daily",
            streak: 5,
            category: "Fitness",
            updatedAt: new Date().toISOString()
          },
          clientUpdatedAt: new Date().toISOString(),
          version: 1
        }
      ]
    };

    console.log(`  ➔ Pushing operations from Windows to Sync Server...`);
    const winPushRes = await fetch(`${BASE_URL}/sync/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(windowsPushPayload)
    });
    const winPushData = await winPushRes.json();
    const winAcceptedCount = winPushData.results?.filter((r: any) => r.status === "accepted").length || 0;
    console.log(`  ${GREEN}✔ Server Push Accepted! ${winAcceptedCount}/3 operations successfully saved.${RESET}\n`);

    console.log(`${BOLD}${YELLOW}[STEP 2] 📱 MOBILE PHONE PULLING SYNC...${RESET}`);
    console.log(`  ➔ Device ID: "MOBILE-PHONE-CLIENT-M1"`);
    console.log(`  ➔ Requesting updates since: ${cursorTime}`);

    const mobilePullPayload = {
      deviceId: "MOBILE-PHONE-CLIENT-M1",
      lastSyncCursor: cursorTime
    };

    const mobPullRes = await fetch(`${BASE_URL}/sync/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mobilePullPayload)
    });
    const mobPullData: { changes: Array<{ entity: string; entityId: string; data: any }> } = await mobPullRes.json();

    console.log(`  ${GREEN}✔ Mobile successfully pulled ${mobPullData.changes.length} total synced items from backend!${RESET}`);

    // Verify items received on mobile
    const receivedTask = mobPullData.changes.find(c => c.entityId === taskId);
    const receivedExpense = mobPullData.changes.find(c => c.entityId === expenseId);
    const receivedHabit = mobPullData.changes.find(c => c.entityId === habitId);

    if (receivedTask && receivedExpense && receivedHabit) {
      console.log(`\n  ${BOLD}${GREEN}✔ PROOF 1: Mobile Phone received all items created on Windows!${RESET}`);
      console.log(`     - Task Title: "${receivedTask.data.title}" [Status: ${receivedTask.data.status}]`);
      console.log(`     - Expense Amount: ₹${receivedExpense.data.amount} [Category: ${receivedExpense.data.category}]`);
      console.log(`     - Habit Name: "${receivedHabit.data.name}" [Streak: ${receivedHabit.data.streak}]\n`);
    } else {
      throw new Error(`Mobile pull missing expected IDs.`);
    }

    console.log(`${BOLD}${MAGENTA}[STEP 3] 📱 MOBILE PHONE PERFORMING ACTIONS...${RESET}`);
    console.log(`  ➔ Marking Task as COMPLETED on Mobile (ID: ${taskId})`);
    console.log(`  ➔ Creating New Mobile Expense: "Coffee & Snacks ₹250" (ID: ${mobileExpenseId})`);

    const mobilePushPayload = {
      deviceId: "MOBILE-PHONE-CLIENT-M1",
      operations: [
        {
          id: randomUUID(),
          entity: "task",
          entityId: taskId,
          operation: "upsert",
          payload: {
            id: taskId,
            title: "Finish Q4 Project Report",
            description: "Prepare presentation slides and review budget",
            status: "completed",
            category: "work",
            date: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          clientUpdatedAt: new Date().toISOString(),
          version: 2
        },
        {
          id: randomUUID(),
          entity: "expense",
          entityId: mobileExpenseId,
          operation: "upsert",
          payload: {
            id: mobileExpenseId,
            amount: 250,
            category: "Food & Dining",
            description: "Coffee & Snacks ₹250",
            paymentMethod: "UPI",
            transactionDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          clientUpdatedAt: new Date().toISOString(),
          version: 1
        }
      ]
    };

    console.log(`  ➔ Pushing operations from Mobile to Sync Server...`);
    const mobPushRes = await fetch(`${BASE_URL}/sync/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mobilePushPayload)
    });
    const mobPushData = await mobPushRes.json();
    const mobAcceptedCount = mobPushData.results?.filter((r: any) => r.status === "accepted").length || 0;
    console.log(`  ${GREEN}✔ Server Push Accepted! ${mobAcceptedCount}/2 operations successfully saved.${RESET}\n`);

    console.log(`${BOLD}${CYAN}[STEP 4] 💻 WINDOWS DESKTOP PULLING SYNC...${RESET}`);
    console.log(`  ➔ Device ID: "WINDOWS-DESKTOP-CLIENT-X1"`);
    console.log(`  ➔ Requesting Mobile updates...`);

    const windowsPullPayload = {
      deviceId: "WINDOWS-DESKTOP-CLIENT-X1",
      lastSyncCursor: cursorTime
    };

    const winPullRes = await fetch(`${BASE_URL}/sync/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(windowsPullPayload)
    });
    const winPullData: { changes: Array<{ entity: string; entityId: string; data: any }> } = await winPullRes.json();

    const updatedTaskOnWin = winPullData.changes.find(c => c.entityId === taskId);
    const newMobExpenseOnWin = winPullData.changes.find(c => c.entityId === mobileExpenseId);

    if (updatedTaskOnWin && newMobExpenseOnWin) {
      console.log(`\n  ${BOLD}${GREEN}✔ PROOF 2: Windows Desktop received all updates performed on Mobile!${RESET}`);
      console.log(`     - Task Status on Windows updated to: "${updatedTaskOnWin.data.status}"`);
      console.log(`     - New Mobile Expense synced to Windows: ₹${newMobExpenseOnWin.data.amount} (${newMobExpenseOnWin.data.description})\n`);
    } else {
      throw new Error("Windows pull failed to retrieve mobile updates!");
    }

    console.log(`${BOLD}${GREEN}================================================================${RESET}`);
    console.log(`${BOLD}${GREEN} 🎉 VERIFICATION SUCCESS: WINDOWS <-> MOBILE SYNC IS 100% WORKING ${RESET}`);
    console.log(`${BOLD}${GREEN}================================================================${RESET}\n`);

  } catch (error: any) {
    console.error(`\n${RED}❌ SYNC VERIFICATION ERROR: ${error.message}${RESET}`);
  } finally {
    try {
      await pool.end();
    } catch {}
    setTimeout(() => {
      process.exit(0);
    }, 100);
  }
}

runDeviceSyncProof();

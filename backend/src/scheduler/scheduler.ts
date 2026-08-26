import { runHabitReminderCheck } from "./habitReminderJob.js";

const TICK_INTERVAL_MS = 60_000;

let schedulerTimer: NodeJS.Timeout | null = null;

async function tick() {
  try {
    await runHabitReminderCheck(new Date());
  } catch (error) {
    console.error("[scheduler] tick failed:", error);
  }
}

export function startScheduler() {
  if (schedulerTimer) {
    return;
  }

  console.log("[scheduler] started (habit reminders enabled)");

  schedulerTimer = setInterval(tick, TICK_INTERVAL_MS);

  if (typeof schedulerTimer.unref === "function") {
    schedulerTimer.unref();
  }

  void tick();
}

export function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[scheduler] stopped");
  }
}

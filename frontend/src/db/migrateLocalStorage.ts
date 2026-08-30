import { taskRepository } from "./repositories/taskRepository";
import { habitRepository } from "./repositories/habitRepository";
import { goalRepository } from "./repositories/goalRepository";
import { expenseRepository } from "./repositories/expenseRepository";
import { diaryRepository } from "./repositories/diaryRepository";
import { notificationRepository } from "./repositories/notificationRepository";
import { syncRepository } from "./repositories/syncRepository";

const MIGRATED_FLAG = "lifeos_indexeddb_migrated";

export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  if (typeof window === "undefined" || !window.localStorage) return;

  const isMigrated = localStorage.getItem(MIGRATED_FLAG);
  if (isMigrated === "true") return;

  console.log("[MIGRATION] Starting one-time localStorage -> IndexedDB migration...");

  try {
    const rawData = localStorage.getItem("lifeos_data");
    if (rawData) {
      const parsed = JSON.parse(rawData);

      if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
        await taskRepository.saveAll(parsed.tasks, true);
      }
      if (Array.isArray(parsed.habits) && parsed.habits.length > 0) {
        await habitRepository.saveAll(parsed.habits, true);
      }
      if (Array.isArray(parsed.goals) && parsed.goals.length > 0) {
        await goalRepository.saveAll(parsed.goals, true);
      }
      if (Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
        await expenseRepository.saveAll(parsed.expenses, true);
      }
      if (Array.isArray(parsed.diaryEntries) && parsed.diaryEntries.length > 0) {
        await diaryRepository.saveAll(parsed.diaryEntries, true);
      }
      if (Array.isArray(parsed.notifications) && parsed.notifications.length > 0) {
        await notificationRepository.saveAll(parsed.notifications, true);
      }
    }

    const rawHabits = localStorage.getItem("lifeos_habits_cache");
    if (rawHabits) {
      const habits = JSON.parse(rawHabits);
      if (Array.isArray(habits)) {
        await habitRepository.saveAll(habits, true);
      }
    }

    localStorage.setItem(MIGRATED_FLAG, "true");
    console.log("[MIGRATION] One-time IndexedDB migration completed successfully.");
  } catch (err) {
    console.error("[MIGRATION] Error during localStorage migration:", err);
  }
}

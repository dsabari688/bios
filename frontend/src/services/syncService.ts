import { syncApi } from "../api/sync.api";
import { habitRepository } from "../db/repositories/habitRepository";
import type { FullOSData, Habit } from "../types";

const OS_DATA_KEY = "lifeos_data";

function readLocalHabits(): Array<Partial<Habit>> {
  try {
    const raw = localStorage.getItem(OS_DATA_KEY);

    if (!raw) {
      return [];
    }

    const data: FullOSData = JSON.parse(raw);

    return Array.isArray(data.habits)
      ? data.habits
      : [];
  } catch {
    return [];
  }
}

function writeMergedHabits(habits: Habit[]) {
  try {
    const raw = localStorage.getItem(OS_DATA_KEY);

    if (!raw) return;

    const data: FullOSData = JSON.parse(raw);

    data.habits = habits;

    localStorage.setItem(
      OS_DATA_KEY,
      JSON.stringify(data),
    );

    habitRepository.saveAll(habits);
  } catch (error) {
    console.error(
      "Failed to persist synced habits:",
      error,
    );
  }
}

export const syncService = {
  async syncHabits(): Promise<Habit[]> {
    const localHabits = readLocalHabits();

    if (localHabits.length === 0) {
      return habitRepository.getAll();
    }

    const result =
      await syncApi.pushHabits(localHabits);

    writeMergedHabits(result.habits);

    return result.habits;
  },

  async getStatus() {
    return syncApi.getStatus();
  },
};


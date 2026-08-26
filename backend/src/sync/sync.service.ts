import { habitRepository } from "../modules/habits/habit.repository.js";
import { isValidDateStr } from "../modules/habits/habit.streak.js";
import { syncRepository } from "./sync.repository.js";
import { resolveHabitConflict } from "./conflictResolver.js";
import type {
  HabitSyncItem,
  HabitSyncResult,
} from "./sync.types.js";

const FREQUENCIES = new Set(["daily", "weekly"]);

function sanitizeSyncItem(raw: unknown): HabitSyncItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Record<string, unknown>;

  if (
    typeof item.id !== "string" ||
    item.id.trim().length === 0 ||
    typeof item.name !== "string" ||
    item.name.trim().length === 0
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name.trim(),
    frequency:
      typeof item.frequency === "string" &&
      FREQUENCIES.has(item.frequency)
        ? item.frequency
        : "daily",
    streak: Number(item.streak) || 0,
    logs: Array.isArray(item.logs)
      ? (item.logs.filter((log) =>
          isValidDateStr(log),
        ) as string[])
      : [],
    skippedDaysCount: Number(item.skippedDaysCount) || 0,
    icon: typeof item.icon === "string" ? item.icon : null,
    category:
      typeof item.category === "string"
        ? item.category
        : "general",
    targetValue:
      typeof item.targetValue === "number"
        ? item.targetValue
        : null,
    unit: typeof item.unit === "string" ? item.unit : null,
    stepIncrement:
      typeof item.stepIncrement === "number"
        ? item.stepIncrement
        : null,
    dailyProgress:
      item.dailyProgress &&
      typeof item.dailyProgress === "object"
        ? (item.dailyProgress as Record<string, number>)
        : {},
    notes: typeof item.notes === "string" ? item.notes : null,
    updatedAt:
      typeof item.updatedAt === "string"
        ? item.updatedAt
        : undefined,
  };
}

export const syncService = {
  async syncHabits(
    rawItems: unknown,
  ): Promise<HabitSyncResult> {
    if (!Array.isArray(rawItems)) {
      throw new Error("habits must be an array");
    }

    let appliedClientChanges = 0;
    let serverWins = 0;
    const conflicts: HabitSyncResult["conflicts"] = [];

    for (const raw of rawItems) {
      const item = sanitizeSyncItem(raw);

      if (!item) {
        continue;
      }

      const serverRow =
        await habitRepository.findById(item.id);

      if (!serverRow) {
        await syncRepository.upsertHabit(item);
        appliedClientChanges += 1;
        conflicts.push({
          id: item.id,
          resolution: "client_won",
          reason: "inserted_from_client",
        });
        continue;
      }

      const decision = resolveHabitConflict(
        item as { updatedAt?: string },
        serverRow as unknown as Record<string, unknown>,
      );

      if (decision.applyClient) {
        await syncRepository.upsertHabit(item);
        appliedClientChanges += 1;
      } else {
        serverWins += 1;
      }

      conflicts.push(decision.conflict as HabitSyncResult["conflicts"][number]);
    }

    const habits = await habitRepository.findAll();

    return {
      habits,
      appliedClientChanges,
      serverWins,
      conflicts,
      syncedAt: new Date().toISOString(),
    };
  },

  async getStatus() {
    const count = await syncRepository.countHabits();

    return {
      status: "ok",
      habitsOnServer: count,
      strategies: ["last-write-wins"],
      entities: ["habit"],
    };
  },
};

import { habitRepository } from "../modules/habits/habit.repository.js";
import { isValidDateStr } from "../modules/habits/habit.streak.js";
import { syncRepository } from "./sync.repository.js";
import { resolveHabitConflict } from "./conflictResolver.js";
import type { HabitSyncItem, HabitSyncResult } from "./sync.types.js";

const FREQUENCIES = new Set(["daily", "weekly"]);

function sanitizeSyncItem(raw: unknown): HabitSyncItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  if (typeof item.id !== "string" || item.id.trim().length === 0 || typeof item.name !== "string" || item.name.trim().length === 0) {
    return null;
  }

  return {
    id: item.id,
    name: item.name.trim(),
    frequency: typeof item.frequency === "string" && FREQUENCIES.has(item.frequency) ? item.frequency : "daily",
    streak: Number(item.streak) || 0,
    logs: Array.isArray(item.logs) ? (item.logs.filter((log) => isValidDateStr(log)) as string[]) : [],
    skippedDaysCount: Number(item.skippedDaysCount) || 0,
    icon: typeof item.icon === "string" ? item.icon : null,
    category: typeof item.category === "string" ? item.category : "general",
    targetValue: typeof item.targetValue === "number" ? item.targetValue : null,
    unit: typeof item.unit === "string" ? item.unit : null,
    stepIncrement: typeof item.stepIncrement === "number" ? item.stepIncrement : null,
    dailyProgress: item.dailyProgress && typeof item.dailyProgress === "object" ? (item.dailyProgress as Record<string, number>) : {},
    notes: typeof item.notes === "string" ? item.notes : null,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : undefined,
  };
}

export const syncService = {
  async processPush(payload: any) {
    const { deviceId, operations } = payload || {};
    if (!Array.isArray(operations)) {
      return { results: [], processedAt: new Date().toISOString() };
    }

    const results = [];

    for (const op of operations) {
      try {
        if (op.operation === "delete") {
          const dbTable = op.entity === "diary" ? "diaryEntry" : op.entity;
          await syncRepository.deleteEntity(dbTable, op.entityId);
          results.push({
            operationId: op.id,
            entity: op.entity,
            entityId: op.entityId,
            status: "accepted",
            serverVersion: 1,
          });
          continue;
        }

        let serverItem: any = null;
        switch (op.entity) {
          case "task":
            serverItem = await syncRepository.upsertTask(op.payload);
            break;
          case "habit":
            serverItem = await syncRepository.upsertHabit(op.payload);
            break;
          case "goal":
            serverItem = await syncRepository.upsertGoal(op.payload);
            break;
          case "expense":
            serverItem = await syncRepository.upsertExpense(op.payload);
            break;
          case "diary":
            serverItem = await syncRepository.upsertDiary(op.payload);
            break;
          case "mood":
            serverItem = await syncRepository.upsertMood(op.payload);
            break;
          case "notification":
            serverItem = await syncRepository.upsertNotification(op.payload);
            break;
        }

        results.push({
          operationId: op.id,
          entity: op.entity,
          entityId: op.entityId,
          status: "accepted",
          serverVersion: 1,
          serverItem,
        });
      } catch (err: any) {
        results.push({
          operationId: op.id,
          entity: op.entity,
          entityId: op.entityId,
          status: "rejected",
          reason: err.message,
        });
      }
    }

    return {
      results,
      processedAt: new Date().toISOString(),
    };
  },

  async processPull(payload: any) {
    const { lastSyncCursor } = payload || {};
    const changes = await syncRepository.getChangesSince(lastSyncCursor);

    return {
      changes,
      newCursor: new Date().toISOString(),
      hasMore: false,
    };
  },

  async syncHabits(rawItems: unknown): Promise<HabitSyncResult> {
    if (!Array.isArray(rawItems)) throw new Error("habits must be an array");

    let appliedClientChanges = 0;
    let serverWins = 0;
    const conflicts: HabitSyncResult["conflicts"] = [];

    for (const raw of rawItems) {
      const item = sanitizeSyncItem(raw);
      if (!item) continue;

      const serverRow = await habitRepository.findById(item.id);

      if (!serverRow) {
        await syncRepository.upsertHabit(item);
        appliedClientChanges += 1;
        conflicts.push({ id: item.id, resolution: "client_won", reason: "inserted_from_client" });
        continue;
      }

      const decision = resolveHabitConflict(item as { updatedAt?: string }, serverRow as unknown as Record<string, unknown>);

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
      entities: ["task", "habit", "goal", "expense", "diary", "notification"],
    };
  },
};

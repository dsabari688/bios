import { db } from "../database";
import type { LocalGoal } from "../schema";
import { syncQueue } from "../../sync/syncQueue";

export const goalRepository = {
  async getAll(): Promise<LocalGoal[]> {
    return db.goals
      .filter((goal) => !goal._deletedAt)
      .toArray();
  },

  async getById(id: string): Promise<LocalGoal | undefined> {
    const goal = await db.goals.get(id);
    return goal && !goal._deletedAt ? goal : undefined;
  },

  async save(goal: LocalGoal, isRemote: boolean = false): Promise<LocalGoal> {
    const now = new Date().toISOString();
    const isNew = !(await db.goals.get(goal.id));

    const localGoal: LocalGoal = {
      ...goal,
      _updatedAt: goal._updatedAt || now,
      _syncStatus: isRemote ? "synced" : "pending",
      _version: (goal._version || 0) + 1,
    };

    await db.goals.put(localGoal);

    if (!isRemote) {
      await syncQueue.enqueue(
        "goal",
        localGoal.id,
        isNew ? "create" : "update",
        localGoal
      );
    }

    return localGoal;
  },

  async saveAll(goals: LocalGoal[], isRemote: boolean = false): Promise<void> {
    const now = new Date().toISOString();
    const prepared: LocalGoal[] = goals.map((g) => ({
      ...g,
      _updatedAt: g._updatedAt || now,
      _syncStatus: isRemote ? "synced" : "pending",
    }));
    await db.goals.bulkPut(prepared);
  },

  async remove(id: string, isRemote: boolean = false): Promise<void> {
    const now = new Date().toISOString();
    const existing = await db.goals.get(id);
    if (!existing) return;

    if (isRemote) {
      await db.goals.delete(id);
    } else {
      const tombstoned: LocalGoal = {
        ...existing,
        _deletedAt: now,
        _syncStatus: "pending",
        _updatedAt: now,
      };
      await db.goals.put(tombstoned);
      await syncQueue.enqueue("goal", id, "delete", { id, deletedAt: now });
    }
  },

  async markSynced(id: string, serverData?: Partial<LocalGoal>): Promise<void> {
    const existing = await db.goals.get(id);
    if (!existing) return;
    await db.goals.update(id, {
      ...serverData,
      _syncStatus: "synced",
      _updatedAt: new Date().toISOString(),
    });
  },

  async clear(): Promise<void> {
    await db.goals.clear();
  },
};

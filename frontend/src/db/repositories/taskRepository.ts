import { db } from "../database";
import type { LocalTask } from "../schema";

export const taskRepository = {
  async getAll(): Promise<LocalTask[]> {
    return db.tasks
      .filter((task) => !task._deletedAt)
      .toArray();
  },

  async getById(id: string): Promise<LocalTask | undefined> {
    const task = await db.tasks.get(id);
    return task && !task._deletedAt ? task : undefined;
  },

  async save(task: LocalTask, isRemote: boolean = false): Promise<LocalTask> {
    const now = new Date().toISOString();

    const localTask: LocalTask = {
      ...task,
      _updatedAt: now,
      _syncStatus: isRemote ? "synced" : "pending",
      _version: (task._version || 0) + 1,
    };

    await db.tasks.put(localTask);
    return localTask;
  },

  async saveAll(tasks: LocalTask[], isRemote: boolean = false): Promise<void> {
    const now = new Date().toISOString();
    const prepared: LocalTask[] = tasks.map((t) => ({
      ...t,
      _updatedAt: t._updatedAt || now,
      _syncStatus: isRemote ? "synced" : "pending",
    }));
    await db.tasks.bulkPut(prepared);
  },

  async remove(id: string, isRemote: boolean = false): Promise<void> {
    const existing = await db.tasks.get(id);
    if (!existing) return;
    await db.tasks.delete(id);
  },

  async markSynced(id: string, serverData?: Partial<LocalTask>): Promise<void> {
    const existing = await db.tasks.get(id);
    if (!existing) return;
    await db.tasks.update(id, {
      ...serverData,
      _syncStatus: "synced",
      _updatedAt: new Date().toISOString(),
    });
  },

  async clear(): Promise<void> {
    await db.tasks.clear();
  },
};

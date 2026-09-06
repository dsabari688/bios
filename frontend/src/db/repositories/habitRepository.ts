import { db } from "../database";
import type { LocalHabit } from "../schema";

export const habitRepository = {
  async getAll(): Promise<LocalHabit[]> {
    return db.habits
      .filter((habit) => !habit._deletedAt)
      .toArray();
  },

  async getById(id: string): Promise<LocalHabit | undefined> {
    const habit = await db.habits.get(id);
    return habit && !habit._deletedAt ? habit : undefined;
  },

  async save(habit: LocalHabit, isRemote: boolean = false): Promise<LocalHabit> {
    const now = new Date().toISOString();

    const localHabit: LocalHabit = {
      ...habit,
      _updatedAt: habit._updatedAt || now,
      _syncStatus: isRemote ? "synced" : "pending",
      _version: (habit._version || 0) + 1,
    };

    await db.habits.put(localHabit);
    return localHabit;
  },

  async saveAll(habits: LocalHabit[], isRemote: boolean = false): Promise<void> {
    const now = new Date().toISOString();
    const prepared: LocalHabit[] = habits.map((h) => ({
      ...h,
      _updatedAt: h._updatedAt || now,
      _syncStatus: isRemote ? "synced" : "pending",
    }));
    await db.habits.bulkPut(prepared);
  },

  async remove(id: string, isRemote: boolean = false): Promise<void> {
    const existing = await db.habits.get(id);
    if (!existing) return;
    await db.habits.delete(id);
  },

  async markSynced(id: string, serverData?: Partial<LocalHabit>): Promise<void> {
    const existing = await db.habits.get(id);
    if (!existing) return;
    await db.habits.update(id, {
      ...serverData,
      _syncStatus: "synced",
      _updatedAt: new Date().toISOString(),
    });
  },

  async clear(): Promise<void> {
    await db.habits.clear();
  },
};

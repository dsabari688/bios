import { db } from "../database";
import type { LocalDiaryEntry } from "../schema";
import { syncQueue } from "../../sync/syncQueue";

export const diaryRepository = {
  async getAll(): Promise<LocalDiaryEntry[]> {
    return db.diary
      .filter((entry) => !entry._deletedAt)
      .toArray();
  },

  async getById(id: string): Promise<LocalDiaryEntry | undefined> {
    const entry = await db.diary.get(id);
    return entry && !entry._deletedAt ? entry : undefined;
  },

  async save(entry: LocalDiaryEntry, isRemote: boolean = false): Promise<LocalDiaryEntry> {
    const now = new Date().toISOString();
    const isNew = !(await db.diary.get(entry.id));

    // Remove any existing local entry for the exact same calendar date to avoid duplicate records
    if (entry.date) {
      const dateStr = entry.date.slice(0, 10);
      const sameDateEntries = await db.diary.filter((d) => d.date && d.date.slice(0, 10) === dateStr && d.id !== entry.id).toArray();
      for (const old of sameDateEntries) {
        await db.diary.delete(old.id);
      }
    }

    const localEntry: LocalDiaryEntry = {
      ...entry,
      _updatedAt: entry._updatedAt || now,
      _syncStatus: isRemote ? "synced" : "pending",
      _version: (entry._version || 0) + 1,
    };

    await db.diary.put(localEntry);

    if (!isRemote) {
      await syncQueue.enqueue(
        "diary",
        localEntry.id,
        isNew ? "create" : "update",
        localEntry
      );
    }

    return localEntry;
  },

  async saveAll(entries: LocalDiaryEntry[], isRemote: boolean = false): Promise<void> {
    const now = new Date().toISOString();
    const prepared: LocalDiaryEntry[] = entries.map((e) => ({
      ...e,
      _updatedAt: e._updatedAt || now,
      _syncStatus: isRemote ? "synced" : "pending",
    }));
    await db.diary.bulkPut(prepared);
  },

  async remove(id: string, isRemote: boolean = false): Promise<void> {
    const now = new Date().toISOString();
    const existing = await db.diary.get(id);
    if (!existing) return;

    if (isRemote) {
      await db.diary.delete(id);
    } else {
      const tombstoned: LocalDiaryEntry = {
        ...existing,
        _deletedAt: now,
        _syncStatus: "pending",
        _updatedAt: now,
      };
      await db.diary.put(tombstoned);
      await syncQueue.enqueue("diary", id, "delete", { id, deletedAt: now });
    }
  },

  async markSynced(id: string, serverData?: Partial<LocalDiaryEntry>): Promise<void> {
    const existing = await db.diary.get(id);
    if (!existing) return;
    await db.diary.update(id, {
      ...serverData,
      _syncStatus: "synced",
      _updatedAt: new Date().toISOString(),
    });
  },

  async clear(): Promise<void> {
    await db.diary.clear();
  },
};

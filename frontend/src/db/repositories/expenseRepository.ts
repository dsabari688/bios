import { db } from "../database";
import type { LocalExpense } from "../schema";
import { syncQueue } from "../../sync/syncQueue";

export const expenseRepository = {
  async getAll(): Promise<LocalExpense[]> {
    return db.expenses
      .filter((exp) => !exp._deletedAt)
      .toArray();
  },

  async getById(id: string): Promise<LocalExpense | undefined> {
    const exp = await db.expenses.get(id);
    return exp && !exp._deletedAt ? exp : undefined;
  },

  async save(exp: LocalExpense, isRemote: boolean = false): Promise<LocalExpense> {
    const now = new Date().toISOString();
    const isNew = !(await db.expenses.get(exp.id));

    const localExp: LocalExpense = {
      ...exp,
      _updatedAt: exp._updatedAt || now,
      _syncStatus: isRemote ? "synced" : "pending",
      _version: (exp._version || 0) + 1,
    };

    await db.expenses.put(localExp);

    if (!isRemote) {
      await syncQueue.enqueue(
        "expense",
        localExp.id,
        isNew ? "create" : "update",
        localExp
      );
    }

    return localExp;
  },

  async saveAll(expenses: LocalExpense[], isRemote: boolean = false): Promise<void> {
    const now = new Date().toISOString();
    const prepared: LocalExpense[] = expenses.map((e) => ({
      ...e,
      _updatedAt: e._updatedAt || now,
      _syncStatus: isRemote ? "synced" : "pending",
    }));
    await db.expenses.bulkPut(prepared);
  },

  async remove(id: string, isRemote: boolean = false): Promise<void> {
    const now = new Date().toISOString();
    const existing = await db.expenses.get(id);
    if (!existing) return;

    if (isRemote) {
      await db.expenses.delete(id);
    } else {
      const tombstoned: LocalExpense = {
        ...existing,
        _deletedAt: now,
        _syncStatus: "pending",
        _updatedAt: now,
      };
      await db.expenses.put(tombstoned);
      await syncQueue.enqueue("expense", id, "delete", { id, deletedAt: now });
    }
  },

  async markSynced(id: string, serverData?: Partial<LocalExpense>): Promise<void> {
    const existing = await db.expenses.get(id);
    if (!existing) return;
    await db.expenses.update(id, {
      ...serverData,
      _syncStatus: "synced",
      _updatedAt: new Date().toISOString(),
    });
  },

  async clear(): Promise<void> {
    await db.expenses.clear();
  },
};

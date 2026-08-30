import { expenseRepository } from "../db/repositories/expenseRepository";
import { syncManager } from "../sync/syncManager";
import type { Expense, ExpenseCategory } from "../types";

export const expenseService = {
  async getAll(): Promise<Expense[]> {
    return expenseRepository.getAll() as Promise<Expense[]>;
  },

  async getById(id: string): Promise<Expense | undefined> {
    return expenseRepository.getById(id);
  },

  async create(input: {
    amount: number;
    category: ExpenseCategory;
    note: string;
    date: string;
    isImpulsive?: boolean;
  }): Promise<Expense> {
    const newExpense: Expense = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`,
      amount: input.amount,
      category: input.category,
      note: input.note,
      date: input.date || new Date().toISOString().split("T")[0],
      isImpulsive: Boolean(input.isImpulsive),
    };

    const saved = await expenseRepository.save(newExpense);
    syncManager.triggerSync();
    return saved;
  },

  async update(id: string, data: Partial<Expense>): Promise<Expense | undefined> {
    const existing = await expenseRepository.getById(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data };
    const saved = await expenseRepository.save(updated);
    syncManager.triggerSync();
    return saved;
  },

  async delete(id: string): Promise<{ id: string }> {
    await expenseRepository.remove(id);
    syncManager.triggerSync();
    return { id };
  },
};

import { expenseRepository } from "../db/repositories/expenseRepository";
import { expensesApi } from "../api/expenses.api";
import { useStore } from "../store/useStore";
import type { Expense, ExpenseCategory } from "../types";

export const expenseService = {
  async getAll(): Promise<Expense[]> {
    try {
      const remote = await expensesApi.getAll();
      if (Array.isArray(remote) && remote.length > 0) {
        for (const e of remote) {
          await expenseRepository.save(e as any, true).catch(() => {});
        }
      }
    } catch {}
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
    try {
      const remote = await expensesApi.create({
        amount: newExpense.amount,
        category: newExpense.category,
        note: newExpense.note,
        date: newExpense.date,
        isImpulsive: newExpense.isImpulsive,
      });
      if (remote && remote.id && remote.id !== newExpense.id) {
        await expenseRepository.remove(newExpense.id);
        const updatedLocal = { ...newExpense, id: remote.id };
        await expenseRepository.save(updatedLocal as any, true);
        useStore.getState().hydrateSystemData();
        return updatedLocal;
      }
    } catch (e) {
      console.warn("Direct expense create deferred:", e);
    }
    useStore.getState().hydrateSystemData();
    return saved;
  },

  async update(id: string, data: Partial<Expense>): Promise<Expense | undefined> {
    const existing = await expenseRepository.getById(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data };
    const saved = await expenseRepository.save(updated);
    try {
      await expensesApi.update(id, data);
    } catch (e) {
      console.warn("Direct expense update deferred:", e);
    }
    useStore.getState().hydrateSystemData();
    return saved;
  },

  async delete(id: string): Promise<{ id: string }> {
    await expenseRepository.remove(id);
    try {
      await expensesApi.delete(id);
    } catch (e) {
      console.warn("Direct expense delete deferred:", e);
    }
    useStore.getState().hydrateSystemData();
    return { id };
  },
};

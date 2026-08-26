import { expensesApi } from "../api/expenses.api";
import type { Expense } from "../types";

export const expenseService = {
  async getAll() {
    return expensesApi.getAll();
  },

  async getById(id: string) {
    return expensesApi.getById(id);
  },

  async create(input: {
    amount: number;
    category: string;
    note: string;
    date: string;
    isImpulsive?: boolean;
  }) {
    return expensesApi.create(input);
  },

  async update(id: string, data: Partial<Expense>) {
    return expensesApi.update(id, data);
  },

  async delete(id: string) {
    return expensesApi.delete(id);
  },
};

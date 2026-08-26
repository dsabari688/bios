import { apiRequest } from "./client";
import type { Expense } from "../types";

interface BackendExpense {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  transactionDate: string;
  paymentMethod: string | null;
  isImpulsive?: boolean;
  explanation?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function backendToExpense(row: BackendExpense): Expense {
  const d = new Date(row.transactionDate);
  const localDate =
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");

  return {
    id: row.id,
    amount: Number(row.amount),
    category: row.category as Expense["category"],
    note: row.description ?? "",
    date: localDate,
    isImpulsive: !!row.isImpulsive,
    explanation: row.explanation ?? undefined
  };
}

export const expensesApi = {
  async getAll(): Promise<Expense[]> {
    const rows = await apiRequest<BackendExpense[]>("/expenses");
    return (rows || []).map(backendToExpense);
  },

  async getById(id: string): Promise<Expense> {
    const row = await apiRequest<BackendExpense>(`/expenses/${id}`);
    return backendToExpense(row);
  },

  async create(input: {
    amount: number;
    category: string;
    note: string;
    date: string;
    isImpulsive?: boolean;
  }): Promise<Expense> {
    const row = await apiRequest<BackendExpense>("/expenses", {
      method: "POST",
      body: JSON.stringify({
        amount: input.amount,
        category: input.category,
        description: input.note || null,
        transactionDate: `${input.date}T00:00:00`,
        isImpulsive: input.isImpulsive || false,
      }),
    });
    return backendToExpense(row);
  },

  async update(
    id: string,
    input: Partial<Pick<Expense, "amount" | "category" | "note" | "date" | "isImpulsive" | "explanation">>,
  ): Promise<Expense> {
    const payload: Record<string, unknown> = {};

    if (input.amount !== undefined) payload.amount = input.amount;
    if (input.category !== undefined) payload.category = input.category;
    if (input.note !== undefined) payload.description = input.note || null;
    if (input.date !== undefined) payload.transactionDate = `${input.date}T00:00:00`;
    if (input.isImpulsive !== undefined) payload.isImpulsive = input.isImpulsive;
    if (input.explanation !== undefined) payload.explanation = input.explanation;

    const row = await apiRequest<BackendExpense>(`/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return backendToExpense(row);
  },

  async delete(id: string): Promise<{ id: string; deleted: boolean }> {
    return apiRequest<{ id: string; deleted: boolean }>(`/expenses/${id}`, {
      method: "DELETE",
    });
  },
};

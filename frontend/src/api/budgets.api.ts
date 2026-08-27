import { apiRequest } from "./client";

export interface BackendBudgetRow {
  id: string;
  category: string;
  limitAmount: number;
  period: string;
  createdAt?: string;
  updatedAt?: string;
}

export function getAll(): Promise<BackendBudgetRow[]> {
  return apiRequest<BackendBudgetRow[]>("/budgets");
}

export function getById(id: string): Promise<BackendBudgetRow> {
  return apiRequest<BackendBudgetRow>(`/budgets/${id}`);
}

export function create(input: {
  category: string;
  limitAmount: number;
  period: "weekly" | "monthly";
}): Promise<BackendBudgetRow> {
  return apiRequest<BackendBudgetRow>("/budgets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function update(
  id: string,
  input: {
    category?: string;
    limitAmount?: number;
    period?: "weekly" | "monthly";
  },
): Promise<BackendBudgetRow> {
  return apiRequest<BackendBudgetRow>(`/budgets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function remove(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/budgets/${id}`, {
    method: "DELETE",
  });
}

export const budgetsApi = { getAll, getById, create, update, remove };


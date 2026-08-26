import { budgetsApi, type BackendBudgetRow } from "../api/budgets.api";
import type { CategoryBudget } from "../types";

export const budgetService = {
  async getAll(): Promise<CategoryBudget[]> {
    const rows = await budgetsApi.getAll();
    return rows.map((row) => ({
      category: row.category,
      limit: Number(row.limitAmount),
    }));
  },

  async getById(id: string): Promise<BackendBudgetRow> {
    return budgetsApi.getById(id);
  },

  /**
   * Creates the category allowance if it does not exist yet, otherwise
   * updates the existing row's limit (keeping its period).
   */
  async upsert(
    category: string,
    limit: number,
  ): Promise<CategoryBudget> {
    const rows = await budgetsApi.getAll();
    const existing = rows.find(
      (row) => row.category.toLowerCase() === category.toLowerCase(),
    );

    if (existing) {
      const updated = await budgetsApi.update(existing.id, { limitAmount: limit });
      return {
        category: updated.category,
        limit: Number(updated.limitAmount),
      };
    }

    const created = await budgetsApi.create({
      category,
      limitAmount: limit,
      period: "monthly",
    });
    return {
      category: created.category,
      limit: Number(created.limitAmount),
    };
  },

  async remove(id: string): Promise<{ id: string }> {
    return budgetsApi.remove(id);
  },
};

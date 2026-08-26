import { budgetRepository } from "./budget.repository.js";
import type {
  CreateBudgetInput,
  UpdateBudgetInput,
} from "./budget.types.js";

export const budgetService = {
  async create(input: CreateBudgetInput) {
    return budgetRepository.create(input);
  },

  async findAll() {
    return budgetRepository.findAll();
  },

  async findById(id: string) {
    return budgetRepository.findById(id);
  },

  async update(id: string, input: UpdateBudgetInput) {
    const existing = await budgetRepository.findById(id);

    if (!existing) {
      throw new Error("Budget not found");
    }

    const updated = await budgetRepository.update(id, input);

    if (!updated) {
      throw new Error("Failed to update budget");
    }

    return updated;
  },

  async delete(id: string) {
    const existing = await budgetRepository.findById(id);

    if (!existing) {
      throw new Error("Budget not found");
    }

    return budgetRepository.delete(id);
  },
};

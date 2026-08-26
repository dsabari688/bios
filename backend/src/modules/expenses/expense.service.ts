import { expenseRepository } from "./expense.repository.js";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from "./expense.types.js";

export const expenseService = {
  async create(input: CreateExpenseInput) {
    return expenseRepository.create(input);
  },

  async findAll() {
    return expenseRepository.findAll();
  },

  async findById(id: string) {
    return expenseRepository.findById(id);
  },

  async update(id: string, input: UpdateExpenseInput) {
    const existing = await expenseRepository.findById(id);

    if (!existing) {
      throw new Error("Expense not found");
    }

    const updated = await expenseRepository.update(id, input);

    if (!updated) {
      throw new Error("Failed to update expense");
    }

    return updated;
  },

  async delete(id: string) {
    const existing = await expenseRepository.findById(id);

    if (!existing) {
      throw new Error("Expense not found");
    }

    return expenseRepository.delete(id);
  },
};

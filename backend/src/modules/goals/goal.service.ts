import { goalRepository } from "./goal.repository.js";
import type {
  CreateGoalInput,
  UpdateGoalInput,
} from "./goal.types.js";

export const goalService = {
  async create(input: CreateGoalInput) {
    return goalRepository.create(input);
  },

  async findAll() {
    return goalRepository.findAll();
  },

  async findById(id: string) {
    return goalRepository.findById(id);
  },

  async update(id: string, input: UpdateGoalInput) {
    const existing = await goalRepository.findById(id);

    if (!existing) {
      throw new Error("Goal not found");
    }

    const updated = await goalRepository.update(id, input);

    if (!updated) {
      throw new Error("Failed to update goal");
    }

    return updated;
  },

  async delete(id: string) {
    const existing = await goalRepository.findById(id);

    if (!existing) {
      throw new Error("Goal not found");
    }

    return goalRepository.delete(id);
  },
};

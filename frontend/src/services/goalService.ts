import {
  createGoal,
  deleteGoal,
  fetchGoals,
  updateGoal
} from "../api/goals.api";

import type { Goal } from "../types";

export const goalService = {
  async getAll(token?: string | null): Promise<Goal[]> {
    return fetchGoals(token);
  },

  async create(
    title: string,
    targetDate: string,
    token?: string | null
  ): Promise<Goal> {
    return createGoal(
      {
        title,
        targetDate: targetDate || null,
        description: "Tactical milestone recorded in the strategic vault.",
        progress: 0,
        status: "active"
      },
      token
    );
  },

  async updateProgress(
    id: string,
    progress: number,
    token?: string | null
  ): Promise<Goal> {
    return updateGoal(
      id,
      {
        progress,
        status: progress >= 100 ? "completed" : "active"
      },
      token
    );
  },

  async remove(
    id: string,
    token?: string | null
  ): Promise<void> {
    await deleteGoal(id, token);
  }
};
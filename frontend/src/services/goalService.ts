import { goalRepository } from "../db/repositories/goalRepository";
import { syncManager } from "../sync/syncManager";
import type { Goal } from "../types";

export const goalService = {
  async getAll(): Promise<Goal[]> {
    return goalRepository.getAll() as Promise<Goal[]>;
  },

  async create(title: string, targetDate: string): Promise<Goal> {
    const newGoal: Goal = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `goal-${Date.now()}`,
      title,
      description: "Tactical milestone recorded in the strategic vault.",
      targetDate: targetDate || new Date().toISOString().split("T")[0],
      progress: 0,
      status: "active",
    };

    const saved = await goalRepository.save(newGoal);
    syncManager.triggerSync();
    return saved;
  },

  async updateProgress(id: string, progress: number): Promise<Goal | undefined> {
    const existing = await goalRepository.getById(id);
    if (!existing) return undefined;

    const updated: Goal = {
      ...existing,
      progress,
      status: progress >= 100 ? "completed" : "active",
    };

    const saved = await goalRepository.save(updated);
    syncManager.triggerSync();
    return saved;
  },

  async remove(id: string): Promise<{ id: string }> {
    await goalRepository.remove(id);
    syncManager.triggerSync();
    return { id };
  },
};

import { goalRepository } from "../db/repositories/goalRepository";
import { fetchGoals, createGoal, updateGoal, deleteGoal } from "../api/goals.api";
import { useStore } from "../store/useStore";
import type { Goal } from "../types";

export const goalService = {
  async getAll(): Promise<Goal[]> {
    try {
      const remote = await fetchGoals();
      if (Array.isArray(remote) && remote.length > 0) {
        for (const g of remote) {
          await goalRepository.save(g as any, true).catch(() => {});
        }
      }
    } catch {}
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
    try {
      const remote = await createGoal({
        title: newGoal.title,
        description: newGoal.description,
        targetDate: newGoal.targetDate,
        progress: newGoal.progress,
        status: newGoal.status,
      });
      if (remote && remote.id && remote.id !== newGoal.id) {
        await goalRepository.remove(newGoal.id);
        const updatedLocal = { ...newGoal, id: remote.id };
        await goalRepository.save(updatedLocal as any, true);
        useStore.getState().hydrateSystemData();
        return updatedLocal;
      }
    } catch (e) {
      console.warn("Direct goal create deferred:", e);
    }
    useStore.getState().hydrateSystemData();
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
    try {
      await updateGoal(id, {
        progress,
        status: updated.status,
      });
    } catch (e) {
      console.warn("Direct goal update deferred:", e);
    }
    useStore.getState().hydrateSystemData();
    return saved;
  },

  async remove(id: string): Promise<{ id: string }> {
    await goalRepository.remove(id);
    try {
      await deleteGoal(id);
    } catch (e) {
      console.warn("Direct goal delete deferred:", e);
    }
    useStore.getState().hydrateSystemData();
    return { id };
  },
};

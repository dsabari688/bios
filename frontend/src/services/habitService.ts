import { habitRepository } from "../db/repositories/habitRepository";
import { habitsApi } from "../api/habits.api";
import { syncManager } from "../sync/syncManager";
import type { Habit } from "../types";

export const habitService = {
  async getAll(): Promise<Habit[]> {
    try {
      const remote = await habitsApi.getAll();
      if (Array.isArray(remote) && remote.length > 0) {
        for (const h of remote) {
          await habitRepository.save(h as any, true).catch(() => {});
        }
      }
    } catch {}
    return habitRepository.getAll() as Promise<Habit[]>;
  },

  async getById(id: string): Promise<Habit | undefined> {
    return habitRepository.getById(id);
  },

  async create(
    name: string,
    frequency: Habit["frequency"],
    icon?: string,
    options?: {
      category?: Habit["category"];
      targetValue?: number;
      unit?: string;
      stepIncrement?: number;
      notes?: string;
    }
  ): Promise<Habit> {
    const newHabit: Habit = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `habit-${Date.now()}`,
      name,
      frequency,
      streak: 0,
      logs: [],
      skippedDaysCount: 0,
      icon: icon || "Zap",
      category: options?.category || "general",
      targetValue: options?.targetValue,
      unit: options?.unit,
      stepIncrement: options?.stepIncrement,
      dailyProgress: {},
      notes: options?.notes,
    };

    const saved = await habitRepository.save(newHabit);
    try {
      await habitsApi.create({ ...newHabit } as any);
    } catch (e) {
      console.warn("Direct habit create deferred:", e);
    }
    syncManager.triggerSync();
    return saved;
  },

  async update(id: string, data: Partial<Habit>): Promise<Habit | undefined> {
    const existing = await habitRepository.getById(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data };
    const saved = await habitRepository.save(updated);
    try {
      await habitsApi.update(id, data);
    } catch (e) {
      console.warn("Direct habit update deferred:", e);
    }
    syncManager.triggerSync();
    return saved;
  },

  async toggle(id: string, date: string): Promise<Habit | undefined> {
    const habit = await habitRepository.getById(id);
    if (!habit) return undefined;

    const hasLog = habit.logs.includes(date);
    const newLogs = hasLog ? habit.logs.filter((d) => d !== date) : [...habit.logs, date];
    const newStreak = newLogs.length;

    return this.update(id, {
      logs: newLogs,
      streak: newStreak,
    });
  },

  async updateProgress(id: string, date: string, delta: number): Promise<Habit | undefined> {
    const habit = await habitRepository.getById(id);
    if (!habit) return undefined;

    const currentProg = habit.dailyProgress?.[date] || 0;
    const nextProg = Math.max(0, currentProg + delta);
    const newDailyProgress = { ...habit.dailyProgress, [date]: nextProg };

    return this.update(id, { dailyProgress: newDailyProgress });
  },

  async delete(id: string): Promise<{ id: string }> {
    await habitRepository.remove(id);
    try {
      await habitsApi.delete(id);
    } catch (e) {
      console.warn("Direct habit delete deferred:", e);
    }
    syncManager.triggerSync();
    return { id };
  },
};

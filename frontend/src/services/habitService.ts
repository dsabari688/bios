import { habitRepository } from "../db/repositories/habitRepository";
import { habitsApi } from "../api/habits.api";
import { useStore } from "../store/useStore";
import { Habit, safeLogs } from "../types";

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
    useStore.getState().hydrateSystemData();
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
    useStore.getState().hydrateSystemData();
    return saved;
  },

  async toggle(id: string, date: string): Promise<Habit | undefined> {
    // 1. Try remote API toggle first
    try {
      const remote = await habitsApi.toggle(id, date);
      if (remote && remote.id) {
        await habitRepository.save(remote as any, true);
        return remote;
      }
    } catch (e) {
      console.warn("Direct habit toggle deferred/offline:", e);
    }

    // 2. Local fallback if offline or remote fails
    const habit = await habitRepository.getById(id);
    if (!habit) return undefined;

    const logsArr = safeLogs(habit?.logs);
    const hasLog = logsArr.includes(date);
    const target = habit.targetValue !== null && habit.targetValue !== undefined ? Number(habit.targetValue) : 1;
    const newDailyProgress: Record<string, number> = { ...(habit.dailyProgress || {}) };
    let newLogs: string[];

    if (hasLog) {
      newLogs = logsArr.filter((d) => d !== date);
      delete newDailyProgress[date];
    } else {
      newLogs = [...logsArr, date];
      newDailyProgress[date] = target > 0 ? target : 1;
    }

    const updated: Habit = {
      ...habit,
      logs: newLogs,
      streak: newLogs.length,
      dailyProgress: newDailyProgress,
    };

    const saved = await habitRepository.save(updated as any);
    return saved;
  },

  async updateProgress(id: string, date: string, delta: number): Promise<Habit | undefined> {
    // 1. Try remote API progress first
    try {
      const remote = await habitsApi.updateProgress(id, date, delta);
      if (remote && remote.id) {
        await habitRepository.save(remote as any, true);
        return remote;
      }
    } catch (e) {
      console.warn("Direct habit progress update deferred/offline:", e);
    }

    // 2. Local fallback if offline or remote fails
    const habit = await habitRepository.getById(id);
    if (!habit) return undefined;

    const currentProg = habit.dailyProgress?.[date] || 0;
    const nextProg = Math.max(0, currentProg + delta);
    const newDailyProgress: Record<string, number> = { ...(habit.dailyProgress || {}) };

    if (nextProg > 0) {
      newDailyProgress[date] = nextProg;
    } else {
      delete newDailyProgress[date];
    }

    const logsArr = safeLogs(habit?.logs);
    const target = habit.targetValue !== null && habit.targetValue !== undefined ? Number(habit.targetValue) : null;
    let newLogs = [...logsArr];

    if (target !== null && target > 0) {
      if (nextProg >= target) {
        if (!newLogs.includes(date)) newLogs.push(date);
      } else {
        newLogs = newLogs.filter((d) => d !== date);
      }
    } else if (nextProg > 0) {
      if (!newLogs.includes(date)) newLogs.push(date);
    } else {
      newLogs = newLogs.filter((d) => d !== date);
    }

    const updated: Habit = {
      ...habit,
      logs: newLogs,
      streak: newLogs.length,
      dailyProgress: newDailyProgress,
    };

    const saved = await habitRepository.save(updated as any);
    return saved;
  },

  async delete(id: string): Promise<{ id: string }> {
    await habitRepository.remove(id);
    try {
      await habitsApi.delete(id);
    } catch (e) {
      console.warn("Direct habit delete deferred:", e);
    }
    useStore.getState().hydrateSystemData();
    return { id };
  },
};

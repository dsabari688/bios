import { apiRequest } from "./client";
import type { Habit } from "../types";

function normalizeHabit(h: any): Habit {
  let logs: string[] = [];
  if (Array.isArray(h?.logs)) {
    logs = h.logs;
  } else if (typeof h?.logs === "string") {
    try {
      const parsed = JSON.parse(h.logs);
      if (Array.isArray(parsed)) logs = parsed;
    } catch {}
  }
  return {
    ...h,
    logs,
  };
}

export const habitsApi = {
  async getAll(): Promise<Habit[]> {
    const raw = await apiRequest<Habit[]>("/habits");
    return Array.isArray(raw) ? raw.map(normalizeHabit) : [];
  },

  async getById(id: string): Promise<Habit> {
    const raw = await apiRequest<Habit>(`/habits/${id}`);
    return normalizeHabit(raw);
  },

  async create(
    input: Omit<
      Habit,
      | "id"
      | "streak"
      | "logs"
      | "skippedDaysCount"
      | "dailyProgress"
      | "createdAt"
      | "updatedAt"
    >,
  ): Promise<Habit> {
    return apiRequest<Habit>("/habits", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async update(
    id: string,
    input: Partial<Habit>,
  ): Promise<Habit> {
    return apiRequest<Habit>(`/habits/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async toggle(
    id: string,
    date: string,
  ): Promise<Habit> {
    return apiRequest<Habit>(`/habits/${id}/toggle`, {
      method: "POST",
      body: JSON.stringify({ date }),
    });
  },

  async updateProgress(
    id: string,
    date: string,
    delta: number,
  ): Promise<Habit> {
    return apiRequest<Habit>(`/habits/${id}/progress`, {
      method: "POST",
      body: JSON.stringify({ date, delta }),
    });
  },

  async delete(id: string) {
    return apiRequest<{ id: string; deleted: boolean }>(
      `/habits/${id}`,
      {
        method: "DELETE",
      },
    );
  },
};


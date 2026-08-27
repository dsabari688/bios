import { habitsApi } from "../api/habits.api";
import type { Habit } from "../types";

export const habitService = {
  async getAll() {
    return habitsApi.getAll();
  },

  async getById(id: string) {
    return habitsApi.getById(id);
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
    },
  ) {
    return habitsApi.create({
      name,
      frequency,
      icon,
      category: options?.category || "general",
      targetValue: options?.targetValue,
      unit: options?.unit,
      stepIncrement: options?.stepIncrement,
      notes: options?.notes,
    });
  },

  async update(
    id: string,
    data: Partial<Habit>,
  ) {
    return habitsApi.update(id, data);
  },

  async toggle(
    id: string,
    date: string,
  ) {
    return habitsApi.toggle(id, date);
  },

  async updateProgress(
    id: string,
    date: string,
    delta: number,
  ) {
    return habitsApi.updateProgress(
      id,
      date,
      delta,
    );
  },

  async delete(id: string) {
    return habitsApi.delete(id);
  },
};

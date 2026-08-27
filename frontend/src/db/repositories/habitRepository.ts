import type { Habit } from "../../types";

const STORAGE_KEY = "lifeos_habits_cache";

export const habitRepository = {
  getAll(): Habit[] {
    const raw =
      localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveAll(habits: Habit[]) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(habits),
    );
  },

  save(habit: Habit) {
    const habits = this.getAll();

    const index = habits.findIndex(
      (item) => item.id === habit.id,
    );

    if (index === -1) {
      habits.push(habit);
    } else {
      habits[index] = habit;
    }

    this.saveAll(habits);

    return habit;
  },

  remove(id: string) {
    const habits = this
      .getAll()
      .filter((habit) => habit.id !== id);

    this.saveAll(habits);
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};

import { habitRepository } from "./habit.repository.js";
import type {
  CreateHabitInput,
  UpdateHabitInput,
  UpdateHabitProgressInput,
} from "./habit.types.js";
function calculateStreak(
  logs: string[],
  frequency: string,
): number {
  const uniqueLogs = [...new Set(logs)]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort()
    .reverse();

  if (uniqueLogs.length === 0) {
    return 0;
  }

  const completedDates = new Set(uniqueLogs);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  if (frequency === "daily") {
    while (true) {
      const year = currentDate.getFullYear();
      const month = String(
        currentDate.getMonth() + 1,
      ).padStart(2, "0");
      const day = String(
        currentDate.getDate(),
      ).padStart(2, "0");

      const dateKey = `${year}-${month}-${day}`;

      if (!completedDates.has(dateKey)) {
        break;
      }

      streak++;

      currentDate.setDate(
        currentDate.getDate() - 1,
      );
    }

    return streak;
  }

  if (frequency === "weekly") {
    // Count completed weeks.
    const completedWeeks = new Set(
      uniqueLogs.map((date) => {
        const d = new Date(`${date}T00:00:00`);
        const year = d.getFullYear();

        const firstDay = new Date(year, 0, 1);
        const diff =
          (d.getTime() - firstDay.getTime()) /
          86400000;

        const week = Math.floor(diff / 7);

        return `${year}-${week}`;
      }),
    );

    let weekDate = new Date(today);

    while (true) {
      const year = weekDate.getFullYear();
      const firstDay = new Date(year, 0, 1);
      const diff =
        (weekDate.getTime() - firstDay.getTime()) /
        86400000;

      const week = Math.floor(diff / 7);
      const key = `${year}-${week}`;

      if (!completedWeeks.has(key)) {
        break;
      }

      streak++;

      weekDate.setDate(
        weekDate.getDate() - 7,
      );
    }

    return streak;
  }

  return 0;
}

function normalizeDailyProgress(
  value: unknown,
): Record<string, number> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (acc, [date, progress]) => {
      const numericValue = Number(progress);
      if (Number.isFinite(numericValue)) {
        acc[date] = numericValue;
      }
      return acc;
    },
    {} as Record<string, number>,
  );
}

export class DuplicateHabitError extends Error {
  readonly code = "DUPLICATE_HABIT";
  constructor(name: string) {
    super(`A habit named "${name}" already exists.`);
    this.name = "DuplicateHabitError";
  }
}

export const habitService = {
  async createHabit(input: CreateHabitInput) {
    const trimmedName = input.name.trim();

    return habitRepository.create({
      ...input,
      name: trimmedName,
    });
  },

  async getHabits() {
    return habitRepository.findAll();
  },

  async getHabit(id: string) {
    const habit = await habitRepository.findById(id);

    if (!habit) {
      throw new Error("Habit not found");
    }

    return habit;
  },

  async update(
    id: string,
    input: UpdateHabitInput,
  ) {
    return this.updateHabit(id, input);
  },

  async updateHabit(
    id: string,
    input: UpdateHabitInput,
  ) {
    const habit = await habitRepository.findById(id);

    if (!habit) {
      throw new Error("Habit not found");
    }

    const targetChanged =
      input.targetValue !== undefined &&
      Number(input.targetValue) !==
        Number(habit.targetValue);

    const updatedHabit =
      await habitRepository.update(id, input);

    if (!updatedHabit) {
      throw new Error("Habit update failed");
    }

    if (targetChanged) {
      const target =
        updatedHabit.targetValue !== null &&
        updatedHabit.targetValue !== undefined
          ? Number(updatedHabit.targetValue)
          : null;

      const dailyProgress = normalizeDailyProgress(
        updatedHabit.dailyProgress,
      );

      let logs = Array.isArray(updatedHabit.logs)
        ? [...updatedHabit.logs]
        : [];

      if (target !== null && target > 0) {
        for (const [date, progress] of Object.entries(
          dailyProgress,
        )) {
          const value = Number(progress);

          if (value >= target) {
            if (!logs.includes(date)) {
              logs.push(date);
            }
          } else {
            logs = logs.filter(
              (loggedDate) => loggedDate !== date,
            );
          }
        }
      } else {
        for (const date of Object.keys(dailyProgress)) {
          logs = logs.filter(
            (loggedDate) => loggedDate !== date,
          );
        }
      }

      const streak = calculateStreak(
        logs,
        updatedHabit.frequency,
      );

      return habitRepository.updateProgress(
        id,
        logs,
        streak,
        dailyProgress,
      );
    }

    return updatedHabit;
  },

  async toggleHabit(id: string, date: string) {
    const habit = await habitRepository.findById(id);

    if (!habit) {
      throw new Error("Habit not found");
    }

    const logs = Array.isArray(habit.logs)
      ? [...habit.logs]
      : [];
    const dailyProgress = normalizeDailyProgress(
      habit.dailyProgress,
    );

    const hasDate = logs.includes(date);

    if (hasDate) {
      const nextLogs = logs.filter(
        (loggedDate) => loggedDate !== date,
      );
      delete dailyProgress[date];

      const streak = calculateStreak(
        nextLogs,
        habit.frequency,
      );

      const updatedHabit =
        await habitRepository.updateProgress(
          id,
          nextLogs,
          streak,
          dailyProgress,
        );

      if (!updatedHabit) {
        throw new Error("Habit toggle failed");
      }

      return updatedHabit;
    }

    const target =
      habit.targetValue !== null &&
      habit.targetValue !== undefined
        ? Number(habit.targetValue)
        : 1;

    dailyProgress[date] = target > 0 ? target : 1;
    logs.push(date);

    const streak = calculateStreak(logs, habit.frequency);

    const updatedHabit = await habitRepository.updateProgress(
      id,
      logs,
      streak,
      dailyProgress,
    );

    if (!updatedHabit) {
      throw new Error("Habit toggle failed");
    }

    return updatedHabit;
  },

  async updateProgress(
    id: string,
    input: UpdateHabitProgressInput,
  ) {
    const habit = await habitRepository.findById(id);

    if (!habit) {
      throw new Error("Habit not found");
    }

    const logs = Array.isArray(habit.logs)
      ? [...habit.logs]
      : [];
    const dailyProgress = normalizeDailyProgress(
      habit.dailyProgress,
    );

    const currentValue = Number(dailyProgress[input.date] ?? 0);
    const nextValue = currentValue + Number(input.delta);

    if (Number.isFinite(nextValue) && nextValue !== 0) {
      dailyProgress[input.date] = nextValue;
    } else {
      delete dailyProgress[input.date];
    }

    const target =
      habit.targetValue !== null &&
      habit.targetValue !== undefined
        ? Number(habit.targetValue)
        : null;

    if (target !== null && target > 0) {
      if (nextValue >= target) {
        if (!logs.includes(input.date)) {
          logs.push(input.date);
        }
      } else {
        const filteredLogs = logs.filter(
          (loggedDate) => loggedDate !== input.date,
        );
        logs.splice(0, logs.length, ...filteredLogs);
      }
    } else if (nextValue > 0) {
      if (!logs.includes(input.date)) {
        logs.push(input.date);
      }
    } else {
      const filteredLogs = logs.filter(
        (loggedDate) => loggedDate !== input.date,
      );
      logs.splice(0, logs.length, ...filteredLogs);
    }

    const streak = calculateStreak(logs, habit.frequency);

    const updatedHabit = await habitRepository.updateProgress(
      id,
      logs,
      streak,
      dailyProgress,
    );

    if (!updatedHabit) {
      throw new Error("Habit progress update failed");
    }

    return updatedHabit;
  },

  async deleteHabit(id: string) {
    await habitRepository.delete(id);

    return {
      id,
      deleted: true,
    };
  },
};
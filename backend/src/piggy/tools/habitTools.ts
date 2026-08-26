import { habitService } from "../../modules/habits/habit.service.js";
import { validateCreateHabit } from "../../modules/habits/habit.schema.js";
import { isValidDateStr } from "../../modules/habits/habit.streak.js";

export interface PiggyToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message: string;
}

export interface PiggyToolDefinition {
  name: string;
  description: string;
  category:
    | "habits"
    | "tasks"
    | "goals"
    | "expenses"
    | "analytics";
  inputSchema: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
        default?: unknown;
      }
    >;
    required?: string[];
  };
}

export const habitToolDefinitions: PiggyToolDefinition[] = [
  {
    name: "piggy_habits_list",
    description:
      "List all habits with their streaks, logs and today's progress.",
    category: "habits",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "piggy_habit_create",
    description:
      "Create a new habit. Optionally define a measurable target (e.g. 2500 ml water with +250 steps).",
    category: "habits",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Habit name" },
        frequency: {
          type: "string",
          description: "How often the habit repeats",
          enum: ["daily", "weekly"],
          default: "daily",
        },
        icon: { type: "string", description: "Icon identifier", default: "book-open" },
        category: {
          type: "string",
          description: "Habit category",
          enum: [
            "water",
            "nutrition",
            "fitness",
            "reading",
            "mindfulness",
            "productivity",
            "general",
          ],
          default: "general",
        },
        targetValue: { type: "number", description: "Daily/weekly target amount (e.g. 2500)" },
        unit: { type: "string", description: "Unit label (e.g. ml, pages, mins)" },
        stepIncrement: { type: "number", description: "Amount added per progress tap (e.g. 250)" },
      },
      required: ["name"],
    },
  },
  {
    name: "piggy_habit_toggle",
    description:
      "Mark or unmark a habit as completed for a given date (defaults to today). Recalculates the streak server-side.",
    category: "habits",
    inputSchema: {
      type: "object",
      properties: {
        habitId: { type: "string", description: "ID of the habit" },
        date: {
          type: "string",
          description: "Date to toggle in YYYY-MM-DD format",
          default: "today",
        },
      },
      required: ["habitId"],
    },
  },
  {
    name: "piggy_habit_progress",
    description:
      "Add (or subtract with negative delta) progress towards a habit target, e.g. +250 ml of water. Auto-completes when the target is reached.",
    category: "habits",
    inputSchema: {
      type: "object",
      properties: {
        habitId: { type: "string", description: "ID of the habit" },
        delta: { type: "number", description: "Amount to add (negative to subtract)" },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format",
          default: "today",
        },
      },
      required: ["habitId", "delta"],
    },
  },
  {
    name: "piggy_habit_delete",
    description: "Permanently delete a habit by id.",
    category: "habits",
    inputSchema: {
      type: "object",
      properties: {
        habitId: { type: "string", description: "ID of the habit" },
      },
      required: ["habitId"],
    },
  },
];

function resolveDate(value: unknown): string | null {
  if (value === undefined || value === null || value === "today") {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  return isValidDateStr(value) ? value : null;
}

export const habitTools = {
  async piggy_habits_list(): Promise<PiggyToolResult> {
    const habits = await habitService.getHabits();

    return {
      success: true,
      data: habits,
      message: `Retrieved ${habits.length} habits.`,
    };
  },

  async piggy_habit_create(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    try {
      const input = validateCreateHabit({
        frequency: "daily",
        ...args,
      });

      const habit = await habitService.createHabit(input);

      return {
        success: true,
        data: habit,
        message: `Created habit "${habit.name}".`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const code = (error as any)?.code;

      if (code === "DUPLICATE_HABIT" || code === "23505" || msg.includes("already exists")) {
        const habitName = String(args.name ?? "this").trim();
        return {
          success: false,
          error: "duplicate_habit",
          message: `A habit named "${habitName}" already exists.`,
        };
      }

      throw error;
    }
  },

  async piggy_habit_toggle(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.habitId !== "string") {
      return {
        success: false,
        error: "habitId is required",
        message: "Failed to toggle habit.",
      };
    }

    const date = resolveDate(args.date);

    if (!date) {
      return {
        success: false,
        error: "date must be YYYY-MM-DD",
        message: "Failed to toggle habit.",
      };
    }

    const habit = await habitService.toggleHabit(
      args.habitId,
      date,
    );

    return {
      success: true,
      data: habit,
      message: `"${habit.name}" is now ${
        (habit.logs as string[]).includes(date)
          ? `completed for ${date} (streak ${habit.streak})`
          : `unmarked for ${date} (streak ${habit.streak})`
      }.`,
    };
  },

  async piggy_habit_progress(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.habitId !== "string") {
      return {
        success: false,
        error: "habitId is required",
        message: "Failed to update habit progress.",
      };
    }

    const delta = Number(args.delta);

    if (!Number.isFinite(delta)) {
      return {
        success: false,
        error: "delta must be a number",
        message: "Failed to update habit progress.",
      };
    }

    const date = resolveDate(args.date);

    if (!date) {
      return {
        success: false,
        error: "date must be YYYY-MM-DD",
        message: "Failed to update habit progress.",
      };
    }

    const habit = await habitService.updateProgress(
      args.habitId,
      { date, delta },
    );

    return {
      success: true,
      data: habit,
      message: `Progress updated for "${habit.name}".`,
    };
  },

  async piggy_habit_delete(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.habitId !== "string") {
      return {
        success: false,
        error: "habitId is required",
        message: "Failed to delete habit.",
      };
    }

    const result =
      await habitService.deleteHabit(args.habitId);

    return {
      success: true,
      data: result,
      message: "Habit deleted.",
    };
  },
};

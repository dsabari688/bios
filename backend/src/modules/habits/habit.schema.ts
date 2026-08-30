import type {
  CreateHabitInput,
  UpdateHabitInput,
  UpdateHabitProgressInput,
} from "./habit.types.js";

const FREQUENCIES = ["daily", "weekly"] as const;

const CATEGORIES = [
  "water",
  "nutrition",
  "fitness",
  "reading",
  "mindfulness",
  "productivity",
  "general",
] as const;

export function validateCreateHabit(
  body: unknown,
): CreateHabitInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const input = body as Record<string, unknown>;

  if (
    typeof input.name !== "string" ||
    input.name.trim().length === 0
  ) {
    throw new Error("Habit name is required");
  }

  if (
    typeof input.frequency !== "string" ||
    !FREQUENCIES.includes(
      input.frequency as (typeof FREQUENCIES)[number],
    )
  ) {
    throw new Error("Invalid habit frequency");
  }

  if (
    input.targetValue !== undefined &&
    (typeof input.targetValue !== "number" ||
      input.targetValue <= 0)
  ) {
    throw new Error("targetValue must be greater than 0");
  }

  if (
    input.stepIncrement !== undefined &&
    (typeof input.stepIncrement !== "number" ||
      input.stepIncrement <= 0)
  ) {
    throw new Error("stepIncrement must be greater than 0");
  }

  if (
    input.category !== undefined &&
    !CATEGORIES.includes(
      input.category as (typeof CATEGORIES)[number],
    )
  ) {
    throw new Error("Invalid habit category");
  }

  return {
    id:
      typeof input.id === "string" && input.id.trim().length > 0
        ? input.id.trim()
        : undefined,
    name: input.name.trim(),
    frequency: input.frequency as CreateHabitInput["frequency"],
    icon:
      typeof input.icon === "string"
        ? input.icon
        : undefined,
    category:
      typeof input.category === "string"
        ? input.category as CreateHabitInput["category"]
        : "general",
    targetValue:
      typeof input.targetValue === "number"
        ? input.targetValue
        : undefined,
    unit:
      typeof input.unit === "string"
        ? input.unit
        : undefined,
    stepIncrement:
      typeof input.stepIncrement === "number"
        ? input.stepIncrement
        : undefined,
    notes:
      typeof input.notes === "string"
        ? input.notes
        : undefined,
  };
}

export function validateUpdateHabit(
  body: unknown,
): UpdateHabitInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const input = body as Record<string, unknown>;

  const result: UpdateHabitInput = {};

  if (input.name !== undefined) {
    if (
      typeof input.name !== "string" ||
      input.name.trim().length === 0
    ) {
      throw new Error("Invalid habit name");
    }

    result.name = input.name.trim();
  }

  if (input.frequency !== undefined) {
    if (
      typeof input.frequency !== "string" ||
      !FREQUENCIES.includes(
        input.frequency as (typeof FREQUENCIES)[number],
      )
    ) {
      throw new Error("Invalid habit frequency");
    }

    result.frequency =
      input.frequency as UpdateHabitInput["frequency"];
  }

  if (input.icon !== undefined) {
    result.icon = String(input.icon);
  }

  if (input.category !== undefined) {
    if (
      !CATEGORIES.includes(
        input.category as (typeof CATEGORIES)[number],
      )
    ) {
      throw new Error("Invalid habit category");
    }

    result.category =
      input.category as UpdateHabitInput["category"];
  }

  if (input.targetValue !== undefined) {
    if (
      typeof input.targetValue !== "number" ||
      input.targetValue <= 0
    ) {
      throw new Error("Invalid targetValue");
    }

    result.targetValue = input.targetValue;
  }

  if (input.unit !== undefined) {
    result.unit = String(input.unit);
  }

  if (input.stepIncrement !== undefined) {
    if (
      typeof input.stepIncrement !== "number" ||
      input.stepIncrement <= 0
    ) {
      throw new Error("Invalid stepIncrement");
    }

    result.stepIncrement = input.stepIncrement;
  }

  if (input.notes !== undefined) {
    result.notes = String(input.notes);
  }

  return result;
}

export function validateHabitProgress(
  body: unknown,
): UpdateHabitProgressInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const input = body as Record<string, unknown>;

  if (
    typeof input.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
  ) {
    throw new Error("Invalid date");
  }

  if (
    typeof input.delta !== "number" ||
    !Number.isFinite(input.delta)
  ) {
    throw new Error("Invalid progress delta");
  }

  return {
    date: input.date,
    delta: input.delta,
  };
}
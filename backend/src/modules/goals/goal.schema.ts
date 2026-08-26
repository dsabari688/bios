import {
  GOAL_STATUSES,
  type CreateGoalInput,
  type UpdateGoalInput,
} from "./goal.types.js";

function validateProgress(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new Error("Progress must be an integer between 0 and 100");
  }

  return value;
}

export function validateCreateGoal(input: unknown): CreateGoalInput {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;

  if (typeof body.title !== "string" || !body.title.trim()) {
    throw new Error("Title is required");
  }

  if (
    body.description !== undefined &&
    body.description !== null &&
    typeof body.description !== "string"
  ) {
    throw new Error("Description must be a string");
  }

  if (
    body.targetDate !== undefined &&
    body.targetDate !== null &&
    typeof body.targetDate !== "string"
  ) {
    throw new Error("Target date must be a string");
  }

  if (body.progress !== undefined) {
    validateProgress(body.progress);
  }

  if (
    body.status !== undefined &&
    !GOAL_STATUSES.includes(body.status as any)
  ) {
    throw new Error("Invalid goal status");
  }

  return {
    title: body.title.trim(),
    description:
      body.description === null
        ? undefined
        : (body.description as string | undefined),
    targetDate:
      body.targetDate === null
        ? undefined
        : (body.targetDate as string | undefined),
    progress:
      body.progress === undefined
        ? 0
        : validateProgress(body.progress),
    status:
      (body.status as CreateGoalInput["status"]) ?? "active",
  };
}

export function validateUpdateGoal(input: unknown): UpdateGoalInput {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;
  const result: UpdateGoalInput = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new Error("Title must be a non-empty string");
    }

    result.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (
      body.description !== null &&
      typeof body.description !== "string"
    ) {
      throw new Error("Description must be a string or null");
    }

    result.description = body.description as string | null;
  }

  if (body.targetDate !== undefined) {
    if (
      body.targetDate !== null &&
      typeof body.targetDate !== "string"
    ) {
      throw new Error("Target date must be a string or null");
    }

    result.targetDate = body.targetDate as string | null;
  }

  if (body.progress !== undefined) {
    result.progress = validateProgress(body.progress);
  }

  if (body.status !== undefined) {
    if (!GOAL_STATUSES.includes(body.status as any)) {
      throw new Error("Invalid goal status");
    }

    result.status = body.status as UpdateGoalInput["status"];
  }

  return result;
}

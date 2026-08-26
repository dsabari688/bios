import {
  TASK_CATEGORIES,
  TASK_STATUSES,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "./task.types.js";

export function validateCreateTask(input: unknown): CreateTaskInput {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;

  if (typeof body.title !== "string" || !body.title.trim()) {
    throw new Error("Title is required");
  }

  if (body.title.length > 500) {
    throw new Error("Title cannot exceed 500 characters");
  }

  if (body.description !== undefined && typeof body.description !== "string") {
    throw new Error("Description must be a string");
  }

  if (typeof body.date !== "string" || !body.date.trim()) {
    throw new Error("Date is required");
  }

  if (body.endTime !== undefined && typeof body.endTime !== "string") {
    throw new Error("End time must be a string");
  }

  if (
    body.status !== undefined &&
    !TASK_STATUSES.includes(body.status as any)
  ) {
    throw new Error("Invalid task status");
  }

  if (
    body.category !== undefined &&
    !TASK_CATEGORIES.includes(body.category as any)
  ) {
    throw new Error("Invalid task category");
  }

  return {
    title: body.title.trim(),
    ...(body.description !== undefined
      ? { description: body.description }
      : {}),
    date: body.date,
    ...(body.endTime !== undefined ? { endTime: body.endTime } : {}),
    status: (body.status as CreateTaskInput["status"]) ?? "pending",
    category:
      (body.category as CreateTaskInput["category"]) ??
      "important-not-urgent",
  };
}

export function validateUpdateTask(input: unknown): UpdateTaskInput {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;

  const result: UpdateTaskInput = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new Error("Title must be a non-empty string");
    }

    result.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      throw new Error("Description must be a string");
    }

    result.description = body.description;
  }

  if (body.date !== undefined) {
    if (typeof body.date !== "string") {
      throw new Error("Date must be a string");
    }

    result.date = body.date;
  }

  if (body.endTime !== undefined) {
    if (typeof body.endTime !== "string") {
      throw new Error("End time must be a string");
    }

    result.endTime = body.endTime;
  }

  if (body.status !== undefined) {
    if (!TASK_STATUSES.includes(body.status as any)) {
      throw new Error("Invalid task status");
    }

    result.status = body.status as UpdateTaskInput["status"];
  }

  if (body.category !== undefined) {
    if (!TASK_CATEGORIES.includes(body.category as any)) {
      throw new Error("Invalid task category");
    }

    result.category = body.category as UpdateTaskInput["category"];
  }

  return result;
}
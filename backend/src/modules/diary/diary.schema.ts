import type {
  CreateDiaryEntryInput,
  UpdateDiaryEntryInput,
} from "./diary.types.js";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(value: unknown): string {
  if (typeof value !== "string" || !DATE_ONLY_RE.test(value.trim())) {
    throw new Error("Date must be a valid date string in YYYY-MM-DD format");
  }

  const dateStr = value.trim();
  const [year, month, day] = dateStr.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error("Date must be a valid calendar date");
  }

  return dateStr;
}

function validateTimestamp(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    throw new Error("Timestamp must be a valid ISO date-time string");
  }

  return value;
}

function validateContent(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Content is required");
  }

  return value.trim();
}

function validateReview(value: unknown): string {
  if (value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error("Review must be a string");
  }

  return value.trim();
}

function validateMood(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Mood is required");
  }

  return value.trim();
}

function validateProductivityScore(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new Error(
      "Productivity score must be an integer between 0 and 100",
    );
  }

  return value;
}

export function validateCreateDiaryEntry(
  input: unknown,
): CreateDiaryEntryInput {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;

  return {
    date: validateDate(body.date),
    timestamp: validateTimestamp(body.timestamp),
    content: validateContent(body.content),
    review: validateReview(body.review),
    mood: validateMood(body.mood),
    productivityScore: validateProductivityScore(body.productivityScore),
  };
}

export function validateUpdateDiaryEntry(
  input: unknown,
): UpdateDiaryEntryInput {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;
  const result: UpdateDiaryEntryInput = {};

  if (body.timestamp !== undefined) {
    result.timestamp = validateTimestamp(body.timestamp);
  }

  if (body.content !== undefined) {
    result.content = validateContent(body.content);
  }

  if (body.review !== undefined) {
    result.review = validateReview(body.review);
  }

  if (body.mood !== undefined) {
    result.mood = validateMood(body.mood);
  }

  if (body.productivityScore !== undefined) {
    result.productivityScore = validateProductivityScore(
      body.productivityScore,
    );
  }

  return result;
}

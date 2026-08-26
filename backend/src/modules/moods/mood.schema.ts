import type { MoodValue } from "./mood.types.js";

const VALID_MOODS = ["Great", "Good", "Normal", "Low", "Bad"] as const;

export function validateCreateMood(input: unknown): {
  mood: MoodValue;
  note?: string;
} {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;

  if (!VALID_MOODS.includes(body.mood as MoodValue)) {
    throw new Error("Mood must be Great, Good, Normal, Low, or Bad");
  }

  if (body.note !== undefined && typeof body.note !== "string") {
    throw new Error("Note must be a string");
  }

  if (typeof body.note === "string" && body.note.length > 2000) {
    throw new Error("Note cannot exceed 2000 characters");
  }

  return {
    mood: body.mood as MoodValue,
    ...(body.note !== undefined ? { note: body.note as string } : {}),
  };
}

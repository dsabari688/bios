export const MOOD_VALUES = ["Great", "Good", "Normal", "Low", "Bad"] as const;

export type MoodValue = (typeof MOOD_VALUES)[number];

export interface CreateMoodInput {
  mood: MoodValue;
  note?: string;
}

export interface MoodResponse {
  id: string;
  mood: MoodValue;
  score: number;
  note: string | null;
  loggedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

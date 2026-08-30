export type HabitFrequency = "daily" | "weekly";

export type HabitCategory =
  | "water"
  | "nutrition"
  | "fitness"
  | "reading"
  | "mindfulness"
  | "productivity"
  | "general";

export interface CreateHabitInput {
  id?: string;
  name: string;
  frequency: HabitFrequency;
  icon?: string;
  category?: HabitCategory;
  targetValue?: number;
  unit?: string;
  stepIncrement?: number;
  notes?: string;
}

export interface UpdateHabitInput {
  name?: string;
  frequency?: HabitFrequency;
  icon?: string;
  category?: HabitCategory;
  targetValue?: number;
  unit?: string;
  stepIncrement?: number;
  notes?: string;
}

export interface UpdateHabitProgressInput {
  date: string;
  delta: number;
}

export interface Habit {
  id: string;
  name: string;
  frequency: HabitFrequency;
  streak: number;
  logs: string[];
  skippedDaysCount: number;
  icon?: string;
  category?: HabitCategory;
  targetValue?: number;
  unit?: string;
  stepIncrement?: number;
  dailyProgress: Record<string, number>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
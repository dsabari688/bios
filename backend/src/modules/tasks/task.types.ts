export const TASK_STATUSES = [
  "pending",
  "completed",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_CATEGORIES = [
  "important-urgent",
  "important-not-urgent",
  "not-important-urgent",
  "not-important-not-urgent",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export interface CreateTaskInput {
  title: string;
  description?: string;
  date: string;
  endTime?: string;
  status?: TaskStatus;
  category?: TaskCategory;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  date?: string;
  endTime?: string;
  status?: TaskStatus;
  category?: TaskCategory;
  rescheduledCount?: number;
}

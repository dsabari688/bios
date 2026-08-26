export const GOAL_STATUSES = [
  "active",
  "completed",
  "archived",
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export interface CreateGoalInput {
  title: string;
  description?: string;
  targetDate?: string;
  progress?: number;
  status?: GoalStatus;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  targetDate?: string | null;
  progress?: number;
  status?: GoalStatus;
}

import { apiRequest, authHeader } from "./client";
import type { Goal } from "../types";

interface CreateGoalInput {
  title: string;
  description?: string | null;
  targetDate?: string | null;
  progress?: number;
  status?: "active" | "completed" | "paused";
}

interface UpdateGoalInput extends Partial<CreateGoalInput> {}

export async function fetchGoals(
  token?: string | null
): Promise<Goal[]> {
  return apiRequest<Goal[]>("/goals", {
    method: "GET",
    headers: authHeader(token),
  });
}

export async function createGoal(
  input: CreateGoalInput,
  token?: string | null
): Promise<Goal> {
  return apiRequest<Goal>("/goals", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(input),
  });
}

export async function updateGoal(
  id: string,
  input: UpdateGoalInput,
  token?: string | null
): Promise<Goal> {
  return apiRequest<Goal>(`/goals/${id}`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify(input),
  });
}

export async function deleteGoal(
  id: string,
  token?: string | null
): Promise<void> {
  await apiRequest<{ id: string }>(`/goals/${id}`, {
    method: "DELETE",
    headers: authHeader(token),
  });
}


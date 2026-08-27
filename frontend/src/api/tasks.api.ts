import { apiRequest } from "./client";
import type { Task, TaskPriority } from "../types";

const CATEGORY_FRONT_TO_BACK: Record<TaskPriority, string> = {
  "urgent-important": "important-urgent",
  "important-not-urgent": "important-not-urgent",
  "urgent-not-important": "not-important-urgent",
  "not-urgent-not-important": "not-important-not-urgent",
};

const CATEGORY_BACK_TO_FRONT: Record<string, TaskPriority> = {
  "important-urgent": "urgent-important",
  "important-not-urgent": "important-not-urgent",
  "not-important-urgent": "urgent-not-important",
  "not-important-not-urgent": "not-urgent-not-important",
};

export interface BackendTaskRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  endTime: string | null;
  status: string;
  category: string;
  rescheduledCount: number | null;
}

export interface CreateTaskPayload {
  title: string;
  date: string; // ISO datetime
  description?: string | null;
  endTime?: string | null;
  status?: string;
  category?: string;
}

export function taskCategoryToFront(category: string): TaskPriority {
  return CATEGORY_BACK_TO_FRONT[category] ?? "important-not-urgent";
}

export function getAll(): Promise<BackendTaskRow[]> {
  return apiRequest<BackendTaskRow[]>("/tasks");
}

export function getToday(): Promise<BackendTaskRow[]> {
  return apiRequest<BackendTaskRow[]>("/tasks/today");
}

export function getById(id: string): Promise<BackendTaskRow> {
  return apiRequest<BackendTaskRow>(`/tasks/${id}`);
}

export function create(payload: CreateTaskPayload): Promise<BackendTaskRow> {
  return apiRequest<BackendTaskRow>("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function update(
  id: string,
  payload: Partial<CreateTaskPayload> & { rescheduledCount?: number },
): Promise<BackendTaskRow> {
  return apiRequest<BackendTaskRow>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function complete(id: string): Promise<BackendTaskRow> {
  return apiRequest<BackendTaskRow>(`/tasks/${id}/complete`, {
    method: "PATCH",
  });
}

export function remove(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/tasks/${id}`, {
    method: "DELETE",
  });
}

export const tasksApi = {
  getAll,
  getToday,
  getById,
  create,
  update,
  complete,
  remove,
  CATEGORY_FRONT_TO_BACK,
};


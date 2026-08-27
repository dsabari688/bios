import {
  tasksApi,
  taskCategoryToFront,
  type BackendTaskRow,
  type CreateTaskPayload,
} from "../api/tasks.api";
import type { Task } from "../types";

export function backendRowToTask(row: BackendTaskRow): Task {
  const scheduled = new Date(row.date);
  const pad = (n: number) => String(n).padStart(2, "0");
  const endTime = row.endTime ? new Date(row.endTime) : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    date: `${scheduled.getFullYear()}-${pad(scheduled.getMonth() + 1)}-${pad(scheduled.getDate())}`,
    time: `${pad(scheduled.getHours())}:${pad(scheduled.getMinutes())}`,
    endTime: endTime
      ? `${pad(endTime.getHours())}:${pad(endTime.getMinutes())}`
      : undefined,
    category: taskCategoryToFront(row.category),
    recurType: "none",
    status: row.status === "completed" ? "completed" : "pending",
    rescheduledCount: row.rescheduledCount ?? 0,
  };
}

export const taskService = {
  async getAll(): Promise<Task[]> {
    const rows = await tasksApi.getAll();
    return rows.map(backendRowToTask);
  },

  async getToday(): Promise<Task[]> {
    const rows = await tasksApi.getToday();
    return rows.map(backendRowToTask);
  },

  async getById(id: string): Promise<BackendTaskRow> {
    return tasksApi.getById(id);
  },

  async create(payload: CreateTaskPayload): Promise<BackendTaskRow> {
    return tasksApi.create(payload);
  },

  async update(
    id: string,
    payload: Partial<CreateTaskPayload> & { rescheduledCount?: number },
  ): Promise<BackendTaskRow> {
    return tasksApi.update(id, payload);
  },

  async complete(id: string): Promise<BackendTaskRow> {
    return tasksApi.complete(id);
  },

  async remove(id: string): Promise<{ id: string }> {
    return tasksApi.remove(id);
  },
};


import type { Task, TaskPriority } from "../types";
import {
  tasksApi,
  taskCategoryToFront,
  type CreateTaskPayload,
} from "../api/tasks.api";
import { apiRequest } from "../api/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pad = (n: number) => String(n).padStart(2, "0");

export const isUuid = (id: string | undefined | null): boolean =>
  !!id && UUID_RE.test(id);

export const isBackendTaskId = isUuid;

export function combineDateTime(date: string, time?: string): string | null {
  if (!date) return null;
  const timePart = time && /^\d{2}:\d{2}$/.test(time) ? time : "00:00";
  const d = new Date(`${date}T${timePart}:00`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function splitDateTime(iso: string): { date: string; time: string } {
  if (!iso) {
    const today = new Date();
    return {
      date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
      time: "09:00",
    };
  }

  // Extract clean YYYY-MM-DD directly from ISO string to prevent timezone offset shifts
  const dateMatch = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
  const dateStr = dateMatch
    ? dateMatch[1]
    : `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  let timeStr = "09:00";
  if (iso.includes("T")) {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }

  return {
    date: dateStr,
    time: timeStr,
  };
}

interface BackendTaskRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  endTime: string | null;
  status: string;
  category: string;
  rescheduledCount: number | null;
}

export function backendToTask(row: BackendTaskRow): Task {
  const { date, time } = splitDateTime(row.date);
  const endTime = row.endTime ? splitDateTime(row.endTime).time : undefined;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    date,
    time,
    endTime,
    category: taskCategoryToFront(row.category),
    recurType: "none",
    status: row.status === "completed" ? "completed" : "pending",
    rescheduledCount: row.rescheduledCount ?? 0
  };
}

const CATEGORY_FRONT_TO_BACK: Record<TaskPriority, string> = {
  "urgent-important": "important-urgent",
  "important-not-urgent": "important-not-urgent",
  "urgent-not-important": "not-important-urgent",
  "not-urgent-not-important": "not-important-not-urgent"
};

export function taskToBackendPayload(task: Partial<Task>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (task.title !== undefined) payload.title = task.title;
  if (task.description !== undefined) {
    // Backend validators reject explicit nulls — persist an empty string
    // when the user clears the description.
    payload.description =
      typeof task.description === "string" ? task.description : "";
  }
  if (task.status !== undefined) payload.status = task.status;
  if (task.rescheduledCount !== undefined) payload.rescheduledCount = task.rescheduledCount;

  if (task.category !== undefined && typeof task.category === "string") {
    payload.category =
      CATEGORY_FRONT_TO_BACK[task.category as TaskPriority] ??
      "important-not-urgent";
  }

  if (task.date !== undefined) {
    const iso = combineDateTime(task.date, task.time);
    if (iso) payload.date = iso;
  }

  if (task.endTime !== undefined) {
    const iso =
      task.endTime && task.date ? combineDateTime(task.date, task.endTime) : null;
    if (iso) payload.endTime = iso;
  }

  return payload;
}

async function api<T = unknown>(path: string, method: string, body?: unknown): Promise<T | null> {
  try {
    return await apiRequest<T>(path, {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    return null;
  }
}

export async function fetchBackendTasks(): Promise<BackendTaskRow[] | null> {
  try {
    const rows = await tasksApi.getAll();
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

export async function syncCreateTask(task: Task): Promise<string | null> {
  const payload = taskToBackendPayload(task) as Partial<CreateTaskPayload>;
  if (!payload.title || !payload.date) return null;
  try {
    const row = await tasksApi.create({
      title: payload.title,
      date: payload.date,
      // Backend validators reject explicit nulls — omit empty optionals.
      ...(payload.description ? { description: payload.description } : {}),
      ...(payload.endTime ? { endTime: payload.endTime } : {}),
      status: payload.status,
      category: typeof payload.category === "string" ? payload.category : undefined
    });
    return row?.id ?? null;
  } catch {
    return null;
  }
}

export function syncUpdateTask(taskId: string, task: Partial<Task>): void {
  if (!taskId) return;
  void tasksApi
    .update(taskId, taskToBackendPayload(task))
    .catch(() => undefined);
}

export function syncCompleteTask(taskId: string): void {
  if (!taskId) return;
  void tasksApi.complete(taskId).catch(() => undefined);
}

export function syncSetTaskStatus(taskId: string, status: string): void {
  if (!taskId) return;
  void tasksApi.update(taskId, { status }).catch(() => undefined);
}

export function syncDeleteTask(taskId: string): void {
  if (!taskId) return;
  void tasksApi.remove(taskId).catch(() => undefined);
}


import { taskRepository } from "../db/repositories/taskRepository";
import { useStore } from "../store/useStore";
import { tasksApi, type CreateTaskPayload } from "../api/tasks.api";
import { isUuid, syncCreateTask, syncUpdateTask, syncCompleteTask, syncDeleteTask } from "../lib/taskSync";
import type { Task } from "../types";

export const taskService = {
  async getAll(): Promise<Task[]> {
    return taskRepository.getAll();
  },

  async getToday(): Promise<Task[]> {
    const todayStr = new Date().toISOString().split("T")[0];
    const all = await taskRepository.getAll();
    return all.filter((t) => t.date === todayStr);
  },

  async getById(id: string): Promise<Task | undefined> {
    return taskRepository.getById(id);
  },

  async create(input: {
    title: string;
    description?: string;
    date?: string;
    time?: string;
    category?: Task["category"];
    recurType?: Task["recurType"];
  }): Promise<Task> {
    const todayStr = new Date().toISOString().split("T")[0];
    const newTask: Task = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`,
      title: input.title,
      description: input.description,
      date: input.date || todayStr,
      time: input.time || "09:00",
      category: input.category || "important-not-urgent",
      recurType: input.recurType || "none",
      status: "pending",
      rescheduledCount: 0,
    };

    const saved = await taskRepository.save(newTask);
    
    // Direct sync to cloud backend immediately
    syncCreateTask(newTask).then(async (serverId) => {
      if (serverId && serverId !== newTask.id) {
        await taskRepository.remove(newTask.id, true).catch(() => {});
        saved.id = serverId;
        await taskRepository.save(saved as any, true).catch(() => {});
      }
      useStore.getState().hydrateSystemData();
    }).catch(() => {
      useStore.getState().hydrateSystemData();
    });

    useStore.getState().hydrateSystemData();
    return saved;
  },

  async update(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const existing = await taskRepository.getById(id);
    if (!existing) return undefined;

    const updated: Task = {
      ...existing,
      ...updates,
    };

    const saved = await taskRepository.save(updated);
    
    if (isUuid(id)) {
      syncUpdateTask(id, updates);
    }
    useStore.getState().hydrateSystemData();
    return saved;
  },

  async complete(id: string): Promise<Task | undefined> {
    if (isUuid(id)) {
      syncCompleteTask(id);
    }
    return this.update(id, { status: "completed" });
  },

  async remove(id: string): Promise<{ id: string }> {
    await taskRepository.remove(id);
    if (isUuid(id)) {
      syncDeleteTask(id);
    }
    useStore.getState().hydrateSystemData();
    return { id };
  },
};

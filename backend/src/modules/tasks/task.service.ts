import { taskRepository } from "./task.repository.js";
import type {
  CreateTaskInput,
  UpdateTaskInput,
} from "./task.types.js";

export const taskService = {
  async createTask(input: CreateTaskInput) {
    return taskRepository.create(input);
  },

  async getTasks() {
    return taskRepository.findAll();
  },

  async getTodayTasks() {
    const now = new Date();

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return taskRepository.findToday(start, end);
  },

  async getTask(id: string) {
    const task = await taskRepository.findById(id);

    if (!task) {
      throw new Error("Task not found");
    }

    return task;
  },

  async updateTask(id: string, input: UpdateTaskInput) {
    const task = await taskRepository.update(id, input);

    if (!task) {
      throw new Error("Task not found");
    }

    return task;
  },

  async deleteTask(id: string) {
    const task = await taskRepository.delete(id);

    if (!task) {
      throw new Error("Task not found");
    }

    return task;
  },

  async completeTask(id: string) {
    const task = await taskRepository.complete(id);

    if (!task) {
      throw new Error("Task not found");
    }

    return task;
  },
};
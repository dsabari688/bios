import type { Request, Response, NextFunction } from "express";
import {
  validateCreateTask,
  validateUpdateTask,
} from "./task.schema.js";
import { taskService } from "./task.service.js";

export const taskController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = validateCreateTask(req.body);
      const task = await taskService.createTask(input);

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tasks = await taskService.getTasks();

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  },

  async getToday(req: Request, res: Response, next: NextFunction) {
    try {
      const tasks = await taskService.getTodayTasks();

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.getTask(req.params.id);

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = validateUpdateTask(req.body);
      const task = await taskService.updateTask(req.params.id, input);

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.deleteTask(req.params.id);

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  },

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.completeTask(req.params.id);

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  },
};
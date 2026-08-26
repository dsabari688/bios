import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  validateCreateHabit,
  validateUpdateHabit,
  validateHabitProgress,
} from "./habit.schema.js";

import { habitService } from "./habit.service.js";

export const habitController = {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const input = validateCreateHabit(req.body);

      const habit =
        await habitService.createHabit(input);

      res.status(201).json({
        success: true,
        data: habit,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAll(
    _req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const habits =
        await habitService.getHabits();

      res.json({
        success: true,
        data: habits,
      });
    } catch (error) {
      next(error);
    }
  },

  async getOne(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const habit =
        await habitService.getHabit(req.params.id);

      res.json({
        success: true,
        data: habit,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const input =
        validateUpdateHabit(req.body);

      const habit =
        await habitService.updateHabit(
          req.params.id,
          input,
        );

      res.json({
        success: true,
        data: habit,
      });
    } catch (error) {
      next(error);
    }
  },

 async toggle(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const date = req.body?.date;

    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      throw new Error(
        "date is required and must be in YYYY-MM-DD format",
      );
    }

    const habit =
      await habitService.toggleHabit(
        req.params.id,
        date,
      );

    res.json({
      success: true,
      data: habit,
    });
  } catch (error) {
    next(error);
  }
},

  async progress(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const input =
        validateHabitProgress(req.body);

      const habit =
        await habitService.updateProgress(
          req.params.id,
          input,
        );

      res.json({
        success: true,
        data: habit,
      });
    } catch (error) {
      next(error);
    }
  },

  async delete(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result =
        await habitService.deleteHabit(
          req.params.id,
        );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
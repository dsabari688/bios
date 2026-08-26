import type { Request, Response, NextFunction } from "express";
import { validateCreateMood } from "./mood.schema.js";
import { moodService } from "./mood.service.js";

export const moodController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = validateCreateMood(req.body);
      const mood = await moodService.createMood(input);

      res.status(201).json({
        success: true,
        data: mood,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const moods = await moodService.getMoods();

      res.json({
        success: true,
        data: moods,
      });
    } catch (error) {
      next(error);
    }
  },

  async getTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit ?? 7);
      const moods = await moodService.getTrend(
        Number.isFinite(limit) ? limit : 7,
      );

      res.json({
        success: true,
        data: moods,
      });
    } catch (error) {
      next(error);
    }
  },
};

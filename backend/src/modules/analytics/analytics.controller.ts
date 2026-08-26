import type {
  Request,
  Response,
  NextFunction,
} from "express";
import { analyticsService } from "./analytics.service.js";
import { parseDaysParam } from "./analytics.schema.js";

export const analyticsController = {
  async habitSummary(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const days = parseDaysParam(req.query.days);

      const summary =
        await analyticsService.getHabitSummary(days);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },

  async weeklyReview(
    _req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const review =
        await analyticsService.getWeeklyReview();

      res.json(review);
    } catch (error) {
      next(error);
    }
  },

  async diagnosticMetrics(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const days = parseDaysParam(req.query.days);

      const metrics =
        await analyticsService.getDiagnosticMetrics(days);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  },
};

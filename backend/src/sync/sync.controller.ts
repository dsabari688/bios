import type {
  Request,
  Response,
  NextFunction,
} from "express";
import { syncService } from "./sync.service.js";

export const syncController = {
  async syncHabits(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result =
        await syncService.syncHabits(
          req.body?.habits,
        );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async status(
    _req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const status =
        await syncService.getStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  },
};

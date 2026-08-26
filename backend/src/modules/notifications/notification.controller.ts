import type {
  Request,
  Response,
  NextFunction,
} from "express";
import { notificationService } from "./notification.service.js";

export const notificationController = {
  async getAll(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const limit = Number(req.query.limit);

      const notifications =
        await notificationService.getNotifications(
          Number.isFinite(limit) ? limit : undefined,
        );

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  },

  async markRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const notification =
        await notificationService.markAsRead(
          req.params.id,
        );

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  },
};

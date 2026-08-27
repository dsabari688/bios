import type {
  Request,
  Response,
  NextFunction,
} from "express";
import { systemConfigService } from "./system-config.service.js";

export const systemConfigController = {
  async getConfig(
    _req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const config = await systemConfigService.getConfig();
      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  },

  async updateConfig(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const config = await systemConfigService.updateConfig(
        req.body,
      );
      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  },
};

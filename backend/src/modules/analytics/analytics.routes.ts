import { Router } from "express";
import { analyticsController } from "./analytics.controller.js";

const router = Router();

router.get(
  "/habits/summary",
  analyticsController.habitSummary,
);

router.get(
  "/weekly-review",
  analyticsController.weeklyReview,
);

router.get(
  "/metrics",
  analyticsController.diagnosticMetrics,
);

export default router;

import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../middleware/error.middleware.js";
import { executePiggyTool, listPiggyTools } from "./toolExecutor.js";
import { piggyIntelligence } from "./PiggyIntelligence.js";
import { piggyDashboard } from "./dashboard.service.js";
import { piggyMemory } from "./memory.js";
import { getAIProvider } from "./providers/index.js";
import { piggyStore, ensurePiggyTables } from "./piggyStore.js";
import { todayStr } from "../modules/habits/habit.streak.js";

const router = Router();

router.get("/tools", (_req, res) => {
  res.json({
    success: true,
    data: listPiggyTools(),
  });
});

router.post("/tools/:toolName", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await executePiggyTool(
      req.params.toolName,
      (req.body?.args as Record<string, unknown>) ?? {},
    );

    res.status(result.success ? 200 : 400).json({
      success: result.success,
      data: result.data,
      error: result.error,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/chat",
  asyncHandler(async (req: Request, res: Response) => {
    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      res.status(400).json({
        success: false,
        error: "message is required",
      });
      return;
    }

    const conversationId =
      typeof req.body?.conversationId === "string"
        ? req.body.conversationId
        : null;

    const result = await piggyIntelligence.handleChat({
      message,
      conversationId,
    });

    if (
      !result.success &&
      (result.errorCategory === "invalid_request")
    ) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  }),
);

router.get(
  "/chat/:conversationId",
  asyncHandler(async (req: Request, res: Response) => {
    const messages = await piggyIntelligence.getConversation(
      req.params.conversationId,
    );
    res.json({ success: true, data: messages });
  }),
);

router.get(
  "/ai-status",
  asyncHandler(async (_req: Request, res: Response) => {
    const ai = getAIProvider();
    const available = await ai.isAvailable();
    res.json({
      success: true,
      data: {
        available,
        provider: ai.provider,
        model: ai.model,
        baseUrl: ai.baseUrl,
        isGrokEnabled: true,
      },
    });
  }),
);

router.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    await ensurePiggyTables();
    const data = await piggyDashboard.getCockpitData();
    res.json({ success: true, ...data });
  }),
);

router.get(
  "/coaching",
  asyncHandler(async (_req, res) => {
    const data = await piggyDashboard.getCoachingData();
    res.json({ success: true, ...data });
  }),
);

router.get(
  "/reflections",
  asyncHandler(async (_req, res) => {
    const reflections = await piggyDashboard.getReflections();
    res.json({ success: true, reflections });
  }),
);

router.post(
  "/reflection/generate",
  asyncHandler(async (_req, res) => {
    const reflection =
      await piggyDashboard.generateTodayReflection();
    res.json({ success: true, reflection });
  }),
);

router.get(
  "/memory",
  asyncHandler(async (_req, res) => {
    const facts = await piggyMemory.list();
    res.json({ success: true, aiMemory: facts });
  }),
);

router.post(
  "/memory",
  asyncHandler(async (req: Request, res: Response) => {
    const fact = req.body?.fact;
    const category = req.body?.category ?? "preference";
    const importance = Number(req.body?.importance ?? 5);

    if (typeof fact !== "string" || !fact.trim()) {
      res.status(400).json({
        success: false,
        error: "fact is required",
      });
      return;
    }

    const saved = await piggyMemory.save(
      fact,
      String(category),
      Number.isFinite(importance)
        ? Math.min(Math.max(Math.round(importance), 1), 10)
        : 5,
    );

    res.status(201).json({ success: true, fact: saved });
  }),
);

router.delete(
  "/memory/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await piggyMemory.remove(req.params.id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: "Memory fact not found",
      });
      return;
    }

    res.json({ success: true });
  }),
);

router.post(
  "/feedback",
  asyncHandler(async (req: Request, res: Response) => {
    const text = req.body?.text;
    const type = String(req.body?.type ?? "habit_timing");
    const status = req.body?.status;
    const habitId =
      typeof req.body?.habitId === "string"
        ? req.body.habitId
        : null;

    if (typeof text !== "string" || !text.trim()) {
      res.status(400).json({
        success: false,
        error: "text is required",
      });
      return;
    }

    if (status !== "accepted" && status !== "ignored") {
      res.status(400).json({
        success: false,
        error: "status must be accepted or ignored",
      });
      return;
    }

    let baselineRateBefore = Number(
      req.body?.baselineRateBefore ?? 0,
    );

    if (!Number.isFinite(baselineRateBefore)) {
      baselineRateBefore = 0;
    }

    const id = piggyStore.newId();

    await piggyStore.run(
      `INSERT INTO piggy_suggestion_feedback
         (id, text, type, status, habit_id, baseline_rate_before)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, text.trim(), type, status, habitId, baselineRateBefore],
    );

    res.status(201).json({
      success: true,
      feedback: {
        id,
        text,
        type,
        status,
        habitId,
        baselineRateBefore,
      },
    });
  }),
);

router.patch(
  "/feedback/:id/outcome",
  asyncHandler(async (req: Request, res: Response) => {
    const targetMetricAfter = Number(
      req.body?.targetMetricAfter,
    );

    if (!Number.isFinite(targetMetricAfter)) {
      res.status(400).json({
        success: false,
        error: "targetMetricAfter must be a number",
      });
      return;
    }

    await piggyStore.run(
      "UPDATE piggy_suggestion_feedback SET target_metric_after = $1 WHERE id = $2",
      [targetMetricAfter, req.params.id],
    );

    res.json({ success: true });
  }),
);

router.post(
  "/focus-log",
  asyncHandler(async (req: Request, res: Response) => {
    const minutes = Number(req.body?.minutes ?? req.body?.durationMinutes);
    const score = req.body?.score;
    const date = String(req.body?.date ?? todayStr());
    const hourOfDay = new Date().getHours();

    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) {
      res.status(400).json({
        success: false,
        error: "minutes must be a number between 1 and 600",
      });
      return;
    }

    const id = piggyStore.newId();

    await piggyStore.run(
      `INSERT INTO piggy_focus_log (id, date, minutes, score, hour_of_day)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        date,
        Math.round(minutes),
        Number.isFinite(Number(score)) ? Math.round(Number(score)) : null,
        hourOfDay,
      ],
    );

    const todayRows = await piggyStore.all<{ count: string; total_minutes: string }>(
      `SELECT count(*)::text AS count, coalesce(sum(minutes), 0)::text AS total_minutes
       FROM piggy_focus_log
       WHERE date = $1`,
      [date],
    );

    const todayCompletedBlocks = Number(todayRows[0]?.count ?? 1);
    const todayTotalMinutes = Number(todayRows[0]?.total_minutes ?? minutes);

    res.status(201).json({
      success: true,
      focusLog: {
        id,
        date,
        minutes: Math.round(minutes),
        score: score ?? null,
        hourOfDay,
      },
      summary: {
        todayCompletedBlocks,
        todayTotalMinutes,
      },
    });
  }),
);

export default router;

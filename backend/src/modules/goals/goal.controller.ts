import type { Request, Response } from "express";
import { validateCreateGoal, validateUpdateGoal } from "./goal.schema.js";
import { goalService } from "./goal.service.js";

export const goalController = {
  async create(req: Request, res: Response) {
    try {
      const input = validateCreateGoal(req.body);
      const goal = await goalService.create(input);

      return res.status(201).json({
        success: true,
        data: goal,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to create goal",
      });
    }
  },

  async findAll(_req: Request, res: Response) {
    try {
      const goals = await goalService.findAll();

      return res.json({
        success: true,
        data: goals,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to fetch goals",
      });
    }
  },

  async findById(req: Request, res: Response) {
    try {
      const goal = await goalService.findById(req.params.id);

      if (!goal) {
        return res.status(404).json({
          success: false,
          error: "Goal not found",
        });
      }

      return res.json({
        success: true,
        data: goal,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to fetch goal",
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const input = validateUpdateGoal(req.body);

      if (Object.keys(input).length === 0) {
        return res.status(400).json({
          success: false,
          error: "No fields to update",
        });
      }

      const goal = await goalService.update(req.params.id, input);

      return res.json({
        success: true,
        data: goal,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update goal";

      return res.status(
        message === "Goal not found" ? 404 : 400,
      ).json({
        success: false,
        error: message,
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await goalService.delete(req.params.id);

      return res.json({
        success: true,
        data: {
          id: req.params.id,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete goal";

      return res.status(
        message === "Goal not found" ? 404 : 400,
      ).json({
        success: false,
        error: message,
      });
    }
  },
};

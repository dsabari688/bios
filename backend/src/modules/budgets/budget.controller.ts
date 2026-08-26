import type { Request, Response } from "express";
import {
  validateCreateBudget,
  validateUpdateBudget,
} from "./budget.schema.js";
import { budgetService } from "./budget.service.js";

export const budgetController = {
  async create(req: Request, res: Response) {
    try {
      const input = validateCreateBudget(req.body);
      const budget = await budgetService.create(input);

      return res.status(201).json({
        success: true,
        data: budget,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to create budget",
      });
    }
  },

  async findAll(_req: Request, res: Response) {
    try {
      const budgets = await budgetService.findAll();

      return res.json({
        success: true,
        data: budgets,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to fetch budgets",
      });
    }
  },

  async findById(req: Request, res: Response) {
    try {
      const budget = await budgetService.findById(req.params.id);

      if (!budget) {
        return res.status(404).json({
          success: false,
          error: "Budget not found",
        });
      }

      return res.json({
        success: true,
        data: budget,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to fetch budget",
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const input = validateUpdateBudget(req.body);

      if (Object.keys(input).length === 0) {
        return res.status(400).json({
          success: false,
          error: "No fields to update",
        });
      }

      const budget = await budgetService.update(req.params.id, input);

      return res.json({
        success: true,
        data: budget,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update budget";

      return res.status(
        message === "Budget not found" ? 404 : 400,
      ).json({
        success: false,
        error: message,
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await budgetService.delete(req.params.id);

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
          : "Failed to delete budget";

      return res.status(
        message === "Budget not found" ? 404 : 400,
      ).json({
        success: false,
        error: message,
      });
    }
  },
};

import type { Request, Response } from "express";
import {
  validateCreateExpense,
  validateUpdateExpense,
} from "./expense.schema.js";
import { expenseService } from "./expense.service.js";

export const expenseController = {
  async create(req: Request, res: Response) {
    try {
      const input = validateCreateExpense(req.body);
      const expense = await expenseService.create(input);

      return res.status(201).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to create expense",
      });
    }
  },

  async findAll(_req: Request, res: Response) {
    try {
      const expenses = await expenseService.findAll();

      return res.json({
        success: true,
        data: expenses,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to fetch expenses",
      });
    }
  },

  async findById(req: Request, res: Response) {
    try {
      const expense = await expenseService.findById(req.params.id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          error: "Expense not found",
        });
      }

      return res.json({
        success: true,
        data: expense,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to fetch expense",
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const input = validateUpdateExpense(req.body);

      if (Object.keys(input).length === 0) {
        return res.status(400).json({
          success: false,
          error: "No fields to update",
        });
      }

      const expense = await expenseService.update(req.params.id, input);

      return res.json({
        success: true,
        data: expense,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update expense";

      return res.status(
        message === "Expense not found" ? 404 : 400,
      ).json({
        success: false,
        error: message,
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await expenseService.delete(req.params.id);

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
          : "Failed to delete expense";

      return res.status(
        message === "Expense not found" ? 404 : 400,
      ).json({
        success: false,
        error: message,
      });
    }
  },
};

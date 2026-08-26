import type { Request, Response } from "express";
import {
  validateCreateDiaryEntry,
  validateUpdateDiaryEntry,
} from "./diary.schema.js";
import { diaryService } from "./diary.service.js";

export const diaryController = {
  async save(req: Request, res: Response) {
    try {
      const input = validateCreateDiaryEntry(req.body);
      const { inserted, ...entry } = await diaryService.save(input);

      return res.status(inserted ? 201 : 200).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to save diary entry",
      });
    }
  },

  async findAll(_req: Request, res: Response) {
    try {
      const entries = await diaryService.findAll();

      return res.json({
        success: true,
        data: entries,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to fetch diary entries",
      });
    }
  },

  async findById(req: Request, res: Response) {
    try {
      const entry = await diaryService.findById(req.params.id);

      if (!entry) {
        return res.status(404).json({
          success: false,
          error: "Diary entry not found",
        });
      }

      return res.json({
        success: true,
        data: entry,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to fetch diary entry",
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const input = validateUpdateDiaryEntry(req.body);

      if (Object.keys(input).length === 0) {
        return res.status(400).json({
          success: false,
          error: "No fields to update",
        });
      }

      const entry = await diaryService.update(req.params.id, input);

      return res.json({
        success: true,
        data: entry,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update diary entry";

      return res.status(
        message === "Diary entry not found" ? 404 : 400,
      ).json({
        success: false,
        error: message,
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await diaryService.delete(req.params.id);

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
          : "Failed to delete diary entry";

      return res.status(
        message === "Diary entry not found" ? 404 : 400,
      ).json({
        success: false,
        error: message,
      });
    }
  },
};

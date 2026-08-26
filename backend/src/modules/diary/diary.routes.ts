import { Router } from "express";
import { diaryController } from "./diary.controller.js";

const router = Router();

router.post("/", diaryController.save);
router.get("/", diaryController.findAll);
router.get("/:id", diaryController.findById);
router.patch("/:id", diaryController.update);
router.delete("/:id", diaryController.delete);

export default router;

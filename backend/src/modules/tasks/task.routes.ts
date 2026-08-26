import { Router } from "express";
import { taskController } from "./task.controller.js";

const router = Router();

router.post("/", taskController.create);
router.get("/", taskController.getAll);
router.get("/today", taskController.getToday);
router.get("/:id", taskController.getOne);
router.patch("/:id", taskController.update);
router.delete("/:id", taskController.remove);
router.patch("/:id/complete", taskController.complete);

export default router;
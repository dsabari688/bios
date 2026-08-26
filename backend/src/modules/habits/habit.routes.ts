import { Router } from "express";
import { habitController } from "./habit.controller.js";

const router = Router();

router.post("/", habitController.create);

router.get("/", habitController.getAll);

router.get("/:id", habitController.getOne);

router.patch("/:id", habitController.update);

router.post("/:id/toggle", habitController.toggle);

router.post("/:id/progress", habitController.progress);

router.delete("/:id", habitController.delete);

export default router;

import { Router } from "express";
import { moodController } from "./mood.controller.js";

const router = Router();

router.post("/", moodController.create);
router.get("/", moodController.getAll);
router.get("/trend", moodController.getTrend);

export default router;

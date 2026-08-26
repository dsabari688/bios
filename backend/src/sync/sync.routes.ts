import { Router } from "express";
import { syncController } from "./sync.controller.js";

const router = Router();

router.get("/status", syncController.status);

router.post("/habits", syncController.syncHabits);

export default router;

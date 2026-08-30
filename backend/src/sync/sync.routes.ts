import { Router } from "express";
import { syncController } from "./sync.controller.js";

const router = Router();

router.get("/status", syncController.status);
router.post("/habits", syncController.syncHabits);
router.post("/push", syncController.push);
router.post("/pull", syncController.pull);

export default router;

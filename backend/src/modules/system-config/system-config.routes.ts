import { Router } from "express";
import { systemConfigController } from "./system-config.controller.js";

const router = Router();

router.get("/", systemConfigController.getConfig);
router.patch("/", systemConfigController.updateConfig);

export default router;

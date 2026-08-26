import { Router } from "express";
import { notificationController } from "./notification.controller.js";

const router = Router();

router.get("/", notificationController.getAll);

router.patch("/:id/read", notificationController.markRead);

export default router;

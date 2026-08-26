import { Router } from "express";
import { goalController } from "./goal.controller.js";

const router = Router();

router.post("/", goalController.create);
router.get("/", goalController.findAll);
router.get("/:id", goalController.findById);
router.patch("/:id", goalController.update);
router.delete("/:id", goalController.delete);

export default router;

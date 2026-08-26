import { Router } from "express";
import { budgetController } from "./budget.controller.js";

const router = Router();

router.post("/", budgetController.create);
router.get("/", budgetController.findAll);
router.get("/:id", budgetController.findById);
router.patch("/:id", budgetController.update);
router.delete("/:id", budgetController.delete);

export default router;

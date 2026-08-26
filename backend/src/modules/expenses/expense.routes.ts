import { Router } from "express";
import { expenseController } from "./expense.controller.js";

const router = Router();

router.post("/", expenseController.create);
router.get("/", expenseController.findAll);
router.get("/:id", expenseController.findById);
router.patch("/:id", expenseController.update);
router.delete("/:id", expenseController.delete);

export default router;

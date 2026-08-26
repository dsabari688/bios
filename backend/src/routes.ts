import { Router } from "express";
import moodRoutes from "./modules/moods/mood.routes.js";
import taskRoutes from "./modules/tasks/task.routes.js";
import goalRoutes from "./modules/goals/goal.routes.js";
import habitRoutes from "./modules/habits/habit.routes.js";
import expenseRoutes from "./modules/expenses/expense.routes.js";
import diaryRoutes from "./modules/diary/diary.routes.js";
import budgetRoutes from "./modules/budgets/budget.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import syncRoutes from "./sync/sync.routes.js";
import piggyRoutes from "./piggy/piggy.routes.js";

const router = Router();

router.use("/moods", moodRoutes);
router.use("/tasks", taskRoutes);
router.use("/goals", goalRoutes);
router.use("/habits", habitRoutes);
router.use("/expenses", expenseRoutes);
router.use("/diary", diaryRoutes);
router.use("/budgets", budgetRoutes);
router.use("/notifications", notificationRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/sync", syncRoutes);
router.use("/piggy", piggyRoutes);

export default router;

import { analyticsService } from "../../modules/analytics/analytics.service.js";
import type {
  PiggyToolDefinition,
  PiggyToolResult,
} from "./habitTools.js";

export const analyticsToolDefinitions: PiggyToolDefinition[] = [
  {
    name: "piggy_analytics_habit_summary",
    description:
      "Summarize habit completion over a period: streaks, completion rates and daily counts.",
    category: "analytics",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Period length in days (1-365)",
          default: 30,
        },
      },
    },
  },
  {
    name: "piggy_analytics_weekly_review",
    description:
      "Weekly review: task completion, habit consistency, spending vs budgets and goal progress.",
    category: "analytics",
    inputSchema: { type: "object", properties: {} },
  },
];

export const analyticsTools = {
  async piggy_analytics_habit_summary(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    let days = Number(args.days);

    if (!Number.isFinite(days)) {
      days = 30;
    }

    days = Math.min(Math.max(Math.round(days), 1), 365);

    const summary =
      await analyticsService.getHabitSummary(days);

    return {
      success: true,
      data: summary,
      message: `Habit summary for the last ${days} day(s): ${summary.totalHabits} habits, ${(summary.overallCompletionRate * 100).toFixed(1)}% overall completion.`,
    };
  },

  async piggy_analytics_weekly_review(): Promise<PiggyToolResult> {
    const review =
      await analyticsService.getWeeklyReview();

    return {
      success: true,
      data: review,
      message: `Weekly review: ${review.tasksCompleted} tasks completed, habit consistency ${review.habitConsistency}%, ${review.budgetStatus}.`,
    };
  },
};

import { goalService } from "../../modules/goals/goal.service.js";
import { validateUpdateGoal } from "../../modules/goals/goal.schema.js";
import type {
  PiggyToolDefinition,
  PiggyToolResult,
} from "./habitTools.js";

export const goalToolDefinitions: PiggyToolDefinition[] = [
  {
    name: "piggy_goals_list",
    description:
      "List all strategic goals with progress and status.",
    category: "goals",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "piggy_goal_create",
    description:
      "Create a new goal with an optional description and target date (YYYY-MM-DD).",
    category: "goals",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Goal title" },
        description: { type: "string", description: "Optional description" },
        targetDate: {
          type: "string",
          description: "Target date in YYYY-MM-DD format",
        },
        progress: {
          type: "number",
          description: "Initial progress percentage (0-100)",
          default: 0,
        },
      },
      required: ["title"],
    },
  },
  {
    name: "piggy_goal_progress",
    description:
      "Update a goal's progress percentage (0-100). Automatically marks the goal completed at 100%.",
    category: "goals",
    inputSchema: {
      type: "object",
      properties: {
        goalId: { type: "string", description: "ID of the goal" },
        progress: {
          type: "number",
          description: "New progress percentage (0-100)",
        },
      },
      required: ["goalId", "progress"],
    },
  },
  {
    name: "piggy_goal_delete",
    description:
      "Permanently delete a goal by id.",
    category: "goals",
    inputSchema: {
      type: "object",
      properties: {
        goalId: { type: "string", description: "ID of the goal" },
      },
      required: ["goalId"],
    },
  },
];

export const goalTools = {
  async piggy_goals_list(): Promise<PiggyToolResult> {
    const goals = await goalService.findAll();

    return {
      success: true,
      data: goals,
      message: `Retrieved ${goals.length} goals.`,
    };
  },

  async piggy_goal_create(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.title !== "string" || !args.title.trim()) {
      return {
        success: false,
        error: "title is required",
        message: "Failed to create goal.",
      };
    }

    if (
      args.progress !== undefined &&
      (!Number.isInteger(args.progress) ||
        (args.progress as number) < 0 ||
        (args.progress as number) > 100)
    ) {
      return {
        success: false,
        error: "progress must be an integer between 0 and 100",
        message: "Failed to create goal.",
      };
    }

    const goal = await goalService.create({
      title: args.title,
      ...(typeof args.description === "string"
        ? { description: args.description }
        : {}),
      ...(typeof args.targetDate === "string"
        ? { targetDate: args.targetDate }
        : {}),
      ...(args.progress !== undefined
        ? { progress: args.progress as number }
        : {}),
    });

    return {
      success: true,
      data: goal,
      message: `Created goal "${goal.title}".`,
    };
  },

  async piggy_goal_progress(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.goalId !== "string") {
      return {
        success: false,
        error: "goalId is required",
        message: "Failed to update goal progress.",
      };
    }

    const progress = Number(args.progress);

    if (
      !Number.isInteger(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      return {
        success: false,
        error: "progress must be an integer between 0 and 100",
        message: "Failed to update goal progress.",
      };
    }

    const goal = await goalService.update(
      args.goalId,
      validateUpdateGoal({
        progress,
        status: progress >= 100 ? "completed" : "active",
      }),
    );

    return {
      success: true,
      data: goal,
      message: `"${goal.title}" is now ${progress}% complete.`,
    };
  },

  async piggy_goal_delete(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.goalId !== "string") {
      return {
        success: false,
        error: "goalId is required",
        message: "Failed to delete goal.",
      };
    }

    await goalService.delete(args.goalId);

    return {
      success: true,
      message: "Goal deleted.",
    };
  },
};

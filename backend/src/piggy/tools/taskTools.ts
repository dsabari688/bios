import { taskService } from "../../modules/tasks/task.service.js";
import { TASK_CATEGORIES } from "../../modules/tasks/task.types.js";
import type {
  PiggyToolDefinition,
  PiggyToolResult,
} from "./habitTools.js";

export const taskToolDefinitions: PiggyToolDefinition[] = [
  {
    name: "piggy_tasks_list",
    description:
      "List all tasks with their status, quadrant category and scheduled date.",
    category: "tasks",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "piggy_task_create",
    description:
      "Create a new task. Defaults to today, pending status and the important-not-urgent quadrant.",
    category: "tasks",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        date: {
          type: "string",
          description:
            "Date of the task as YYYY-MM-DD or full ISO datetime",
        },
        time: {
          type: "string",
          description:
            "Optional time of day as HH:MM (24h). Use only if the user specified one.",
        },
        category: {
          type: "string",
          description: "Eisenhower quadrant",
          enum: [...TASK_CATEGORIES],
          default: "important-not-urgent",
        },
        description: { type: "string", description: "Optional details" },
        endTime: {
          type: "string",
          description:
            "Optional end time as HH:MM (24h) on the same date, or full ISO datetime",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "piggy_task_complete",
    description:
      "Mark a task as completed by id.",
    category: "tasks",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "piggy_task_update",
    description:
      "Update an existing task by id. Only send fields that should change.",
    category: "tasks",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task" },
        title: { type: "string", description: "New title" },
        date: {
          type: "string",
          description:
            "New date as YYYY-MM-DD or full ISO datetime",
        },
        time: {
          type: "string",
          description: "Optional new time of day as HH:MM (24h)",
        },
        category: {
          type: "string",
          description: "Eisenhower quadrant",
          enum: [...TASK_CATEGORIES],
        },
        description: { type: "string", description: "New details" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "piggy_task_delete",
    description:
      "Permanently delete a task by id.",
    category: "tasks",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task" },
      },
      required: ["taskId"],
    },
  },
];

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function toTimestamp(
  dateValue: unknown,
  timeValue?: unknown,
): string | null {
  const now = new Date();

  if (dateValue === undefined || dateValue === null || dateValue === "") {
    if (
      typeof timeValue === "string" &&
      TIME_ONLY.test(timeValue.trim())
    ) {
      const [hour, minute] = timeValue.split(":");
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        Number(hour),
        Number(minute),
      ).toISOString();
    }
    return new Date().toISOString();
  }

  const raw = String(dateValue).trim();

  if (DATE_ONLY.test(raw)) {
    let hour = 9;
    let minute = 0;

    if (
      typeof timeValue === "string" &&
      TIME_ONLY.test(timeValue.trim())
    ) {
      const [h, m] = timeValue.split(":");
      hour = Number(h);
      minute = Number(m);
    }

    const [year, month, day] = raw.split("-").map(Number);
    return new Date(year, month - 1, day, hour, minute).toISOString();
  }

  if (TIME_ONLY.test(raw)) {
    const [hour, minute] = raw.split(":").map(Number);
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
    ).toISOString();
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export const taskTools = {
  async piggy_tasks_list(): Promise<PiggyToolResult> {
    const tasks = await taskService.getTasks();

    return {
      success: true,
      data: tasks,
      message: `Retrieved ${tasks.length} tasks.`,
    };
  },

  async piggy_task_create(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.title !== "string" || !args.title.trim()) {
      return {
        success: false,
        error: "title is required",
        message: "Failed to create task.",
      };
    }

    const date = toTimestamp(args.date, args.time);

    if (!date) {
      return {
        success: false,
        error:
          "date must be YYYY-MM-DD or a valid datetime (got an unparseable value)",
        message: "Failed to create task.",
      };
    }

    let endTime: string | undefined;

    if (args.endTime !== undefined && args.endTime !== null) {
      endTime = toTimestamp(date.slice(0, 10), args.endTime) ?? undefined;

      if (!endTime) {
        return {
          success: false,
          error: "endTime must be HH:MM or a valid datetime",
          message: "Failed to create task.",
        };
      }
    }

    try {
      const task = await taskService.createTask({
        title: args.title,
        date,
        ...(endTime ? { endTime } : {}),
        ...(typeof args.description === "string"
          ? { description: args.description }
          : {}),
        ...(typeof args.category === "string" &&
        TASK_CATEGORIES.includes(
          args.category as (typeof TASK_CATEGORIES)[number],
        )
          ? { category: args.category as never }
          : {}),
      });

      return {
        success: true,
        data: task,
        message: `Created task "${task.title}" scheduled for ${date}.`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : String(error),
        message: "Failed to create task.",
      };
    }
  },

  async piggy_task_complete(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.taskId !== "string") {
      return {
        success: false,
        error: "taskId is required",
        message: "Failed to complete task.",
      };
    }

    try {
      const task = await taskService.completeTask(args.taskId);

      return {
        success: true,
        data: task,
        message: `"${task.title}" marked as completed.`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : String(error),
        message: "Failed to complete task.",
      };
    }
  },

  async piggy_task_update(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.taskId !== "string") {
      return {
        success: false,
        error: "taskId is required",
        message: "Failed to update task.",
      };
    }

    let date: string | undefined;
    let endTime: string | undefined;

    if (args.date !== undefined || args.time !== undefined) {
      const existing = await taskService.getTask(args.taskId);
      const baseDate =
        args.date !== undefined ? args.date : new Date(existing.date).toISOString().slice(0, 10);

      const resolved = toTimestamp(baseDate, args.time);

      if (!resolved) {
        return {
          success: false,
          error:
            "date must be YYYY-MM-DD or a valid datetime (got an unparseable value)",
          message: "Failed to update task.",
        };
      }

      date = resolved;
    }

    if (args.endTime !== undefined && args.endTime !== null) {
      endTime =
        toTimestamp(
          date ?? new Date().toISOString().slice(0, 10),
          args.endTime,
        ) ?? undefined;

      if (!endTime) {
        return {
          success: false,
          error: "endTime must be HH:MM or a valid datetime",
          message: "Failed to update task.",
        };
      }
    }

    try {
      const task = await taskService.updateTask(args.taskId, {
        ...(typeof args.title === "string" && args.title.trim()
          ? { title: args.title.trim() }
          : {}),
        ...(date ? { date } : {}),
        ...(endTime ? { endTime } : {}),
        ...(typeof args.description === "string"
          ? { description: args.description }
          : {}),
        ...(typeof args.category === "string" &&
        TASK_CATEGORIES.includes(
          args.category as (typeof TASK_CATEGORIES)[number],
        )
          ? { category: args.category as never }
          : {}),
      });

      return {
        success: true,
        data: task,
        message: `Updated "${task.title}" — now scheduled for ${new Date(task.date).toISOString()}.`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : String(error),
        message: "Failed to update task.",
      };
    }
  },

  async piggy_task_delete(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.taskId !== "string") {
      return {
        success: false,
        error: "taskId is required",
        message: "Failed to delete task.",
      };
    }

    try {
      const result = await taskService.deleteTask(args.taskId);

      return {
        success: true,
        data: result,
        message: "Task deleted.",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : String(error),
        message: "Failed to delete task.",
      };
    }
  },
};

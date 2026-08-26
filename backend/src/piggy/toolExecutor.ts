import type {
  PiggyToolDefinition,
  PiggyToolResult,
} from "./tools/habitTools.js";
import {
  habitToolDefinitions,
  habitTools,
} from "./tools/habitTools.js";
import {
  taskToolDefinitions,
  taskTools,
} from "./tools/taskTools.js";
import {
  goalToolDefinitions,
  goalTools,
} from "./tools/goalTools.js";
import {
  expenseToolDefinitions,
  expenseTools,
} from "./tools/expenseTools.js";
import {
  analyticsToolDefinitions,
  analyticsTools,
} from "./tools/analyticsTools.js";
import {
  memoryToolDefinitions,
  memoryTools,
} from "./tools/memoryTools.js";
import {
  moodToolDefinitions,
  moodTools,
} from "./tools/moodTools.js";

type ToolHandler = (
  args: Record<string, unknown>,
) => Promise<PiggyToolResult>;

const toolRegistry = new Map<string, ToolHandler>();
const allDefinitions: PiggyToolDefinition[] = [];

for (const toolset of [
  { definitions: habitToolDefinitions, handlers: habitTools },
  { definitions: taskToolDefinitions, handlers: taskTools },
  { definitions: goalToolDefinitions, handlers: goalTools },
  { definitions: expenseToolDefinitions, handlers: expenseTools },
  {
    definitions: analyticsToolDefinitions,
    handlers: analyticsTools,
  },
  {
    definitions: memoryToolDefinitions,
    handlers: memoryTools,
  },
  {
    definitions: moodToolDefinitions,
    handlers: moodTools,
  },
]) {
  for (const definition of toolset.definitions) {
    const handler = (
      toolset.handlers as Record<string, ToolHandler | undefined>
    )[definition.name];

    if (!handler) {
      continue;
    }

    toolRegistry.set(definition.name, handler);
    allDefinitions.push(definition);
  }
}

export function listPiggyTools() {
  return allDefinitions.map((tool) => ({
    name: tool.name,
    description: tool.description,
    category: tool.category,
    inputSchema: tool.inputSchema,
  }));
}

export async function executePiggyTool(
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<PiggyToolResult> {
  const handler = toolRegistry.get(toolName);

  if (!handler) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
      message: "Tool not found.",
    };
  }

  const startedAt = Date.now();

  try {
    const result = await handler(args);

    console.log(
      `[piggy] ${toolName} -> ${
        result.success ? "ok" : "error"
      } (${Date.now() - startedAt}ms)`,
    );

    return result;
  } catch (error) {
    console.error(`[piggy] ${toolName} failed:`, error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
      message: "Tool execution failed.",
    };
  }
}

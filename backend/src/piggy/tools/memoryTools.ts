import { piggyMemory } from "../memory.js";
import type {
  PiggyToolDefinition,
  PiggyToolResult,
} from "./habitTools.js";

export const memoryToolDefinitions: PiggyToolDefinition[] = [
  {
    name: "piggy_memory_save",
    description:
      "Save an important long-term fact, preference, goal or constraint about the user to memory.",
    category: "analytics" as never,
    inputSchema: {
      type: "object",
      properties: {
        fact: { type: "string", description: "The statement or fact to remember" },
        category: {
          type: "string",
          description: "Category of fact",
          enum: ["preference", "deadline", "exam", "constraint", "goal", "fact"],
          default: "preference",
        },
        importance: {
          type: "number",
          description: "Importance score from 1 to 10",
          default: 5,
        },
      },
      required: ["fact"],
    },
  },
  {
    name: "piggy_memory_delete",
    description: "Remove a memory fact by its ID.",
    category: "analytics" as never,
    inputSchema: {
      type: "object",
      properties: {
        memoryId: { type: "string", description: "ID of the memory fact to remove" },
      },
      required: ["memoryId"],
    },
  },
  {
    name: "piggy_memory_list",
    description: "List all persistent memory facts saved about the user.",
    category: "analytics" as never,
    inputSchema: { type: "object", properties: {} },
  },
];

export const memoryTools = {
  async piggy_memory_save(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.fact !== "string" || !args.fact.trim()) {
      return {
        success: false,
        error: "fact is required",
        message: "Failed to save memory.",
      };
    }

    const category = typeof args.category === "string" ? args.category : "preference";
    const importance = Number.isFinite(Number(args.importance))
      ? Number(args.importance)
      : 5;

    const saved = await piggyMemory.save(args.fact, category, importance);

    return {
      success: true,
      data: saved,
      message: `Saved to memory: "${saved.fact}".`,
    };
  },

  async piggy_memory_delete(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.memoryId !== "string" || !args.memoryId.trim()) {
      return {
        success: false,
        error: "memoryId is required",
        message: "Failed to delete memory.",
      };
    }

    const deleted = await piggyMemory.remove(args.memoryId);

    if (!deleted) {
      return {
        success: false,
        error: "Memory fact not found",
        message: "Failed to delete memory.",
      };
    }

    return {
      success: true,
      message: "Memory fact deleted.",
    };
  },

  async piggy_memory_list(): Promise<PiggyToolResult> {
    const facts = await piggyMemory.list();

    return {
      success: true,
      data: facts,
      message: `Retrieved ${facts.length} memory facts.`,
    };
  },
};

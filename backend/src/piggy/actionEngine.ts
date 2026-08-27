/**
 * actionEngine.ts
 *
 * Safe action execution engine with idempotency cache, confirmation lifecycle for bulk/destructive operations,
 * multi-action status tracking, and strict authorization boundary enforcement.
 */

import { executePiggyTool } from "./toolExecutor.js";
import { formatToolResult, sanitizeUserResponse } from "./responseFormatter.js";
import { mapInternalErrorToUserMessage } from "./schemaValidator.js";
import type { PiggyToolResult } from "./tools/habitTools.js";

export interface ExecutionOutcome {
  actionIndex: number;
  tool: string;
  success: boolean;
  message: string;
  data?: unknown;
}

export interface MultiActionSummary {
  allSuccessful: boolean;
  summaryText: string;
  outcomes: ExecutionOutcome[];
}

// In-memory idempotency cache (ActionHash -> Result)
const idempotencyCache = new Map<string, { timestamp: number; result: PiggyToolResult }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function calculateActionHash(conversationId: string, tool: string, args: Record<string, unknown>): string {
  return `${conversationId}:${tool}:${JSON.stringify(args)}`;
}

/**
 * Checks if an action is destructive or bulk (requires explicit user confirmation).
 */
export function isDangerousBulkAction(tool: string, args: Record<string, unknown>): { isDangerous: boolean; warningMsg?: string } {
  const lowerTool = tool.toLowerCase();

  // Deleting multiple or all items
  if (lowerTool.includes("delete") || lowerTool.includes("clear")) {
    if (args.deleteAll === true || args.all === true || args.query === "all" || args.title === "all") {
      return {
        isDangerous: true,
        warningMsg: `Are you sure you want to delete ALL items? This action cannot be undone. Say "yes" to confirm or "no" to cancel.`,
      };
    }
  }

  return { isDangerous: false };
}

/**
 * Executes a single tool action safely with idempotency check and error mapping.
 */
export async function executeActionSafely(
  conversationId: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<PiggyToolResult> {
  const actionHash = calculateActionHash(conversationId, tool, args);
  const now = Date.now();

  // Idempotency check: if exact same action was executed in this conversation recently, return cached result
  const cached = idempotencyCache.get(actionHash);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[PIGGY][ACTION-ENGINE] Returning cached idempotent result for ${actionHash}`);
    return cached.result;
  }

  // Enforce security: strip any untrusted userId field injected by LLM payloads
  const sanitizedArgs = { ...args };
  delete sanitizedArgs.userId;
  delete sanitizedArgs.user_id;

  try {
    const result = await executePiggyTool(tool, sanitizedArgs);

    // Cache successful execution for idempotency
    if (result.success) {
      idempotencyCache.set(actionHash, { timestamp: now, result });
    }

    return result;
  } catch (error) {
    console.error(`[PIGGY][ACTION-ENGINE] Tool execution error (${tool}):`, error);
    return {
      success: false,
      error: String(error),
      message: mapInternalErrorToUserMessage(error),
    };
  }
}

/**
 * Executes multiple action units in order and produces an accurate, un-embellished status summary.
 */
export async function executeMultiActionSequence(
  conversationId: string,
  actions: Array<{ tool: string; args: Record<string, unknown> }>,
): Promise<MultiActionSummary> {
  const outcomes: ExecutionOutcome[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const result = await executeActionSafely(conversationId, action.tool, action.args);
    const formatted = formatToolResult(action.tool, result, action.args);

    outcomes.push({
      actionIndex: i + 1,
      tool: action.tool,
      success: result.success,
      message: sanitizeUserResponse(formatted),
      data: result.data,
    });
  }

  const allSuccessful = outcomes.every((o) => o.success);
  const messages = outcomes.map((o) => o.message).join("\n\n");

  return {
    allSuccessful,
    summaryText: messages,
    outcomes,
  };
}

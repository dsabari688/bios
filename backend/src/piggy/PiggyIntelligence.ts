import { validateAnswer } from "./grounding/answerValidator.js";
import {
  executePiggyTool,
  listPiggyTools,
} from "./toolExecutor.js";
import {
  intentDetector,
  AiTimeoutError,
  AiUnavailableError,
  OllamaTimeoutError,
  OllamaUnavailableError,
  type DecisionContext,
} from "./intentDetector.js";
import { RateLimitError } from "./providers/index.js";
import { piggyRag, classifyQuery, type RetrievedContext, type RouteMode } from "./rag.js";
import { piggyMemory } from "./memory.js";
import { piggyStore } from "./piggyStore.js";
import { conversationState } from "./conversationState.js";
import { startSlotFilling, continueSlotFilling, formatConfirmation, SLOT_DEFINITIONS, parseDate } from "./slotFiller.js";
import { formatToolResult, sanitizeUserResponse } from "./responseFormatter.js";

export interface ChatRequest {
  message: string;
  conversationId?: string | null;
}

export interface ChatResult {
  success: boolean;
  conversationId: string;
  response: string;
  intent?: {
    name: string;
    confidence: number;
  };
  action?: {
    type: string;
    executed: boolean;
    error?: string;
  };
  data?: unknown;
  errorCategory?: string;
}

interface StoredMessage {
  role: string;
  content: string;
}

const MAX_HISTORY_MESSAGES = 12;

function newConversationId(): string {
  return piggyStore.newId();
}

async function loadHistory(
  conversationId: string,
): Promise<StoredMessage[]> {
  const rows = await piggyStore.all<{
    role: string;
    content: string;
  }>(
    `SELECT role, content
     FROM piggy_conversation_message
     WHERE conversation_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [conversationId, MAX_HISTORY_MESSAGES],
  );

  return rows.reverse();
}

async function persistMessage(input: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  intent?: string | null;
  confidence?: number | null;
  actionType?: string | null;
  actionExecuted?: boolean | null;
}): Promise<void> {
  await piggyStore.run(
    `INSERT INTO piggy_conversation_message
       (id, conversation_id, role, content, intent, confidence, action_type, action_executed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      piggyStore.newId(),
      input.conversationId,
      input.role,
      input.content,
      input.intent ?? null,
      input.confidence ?? null,
      input.actionType ?? null,
      input.actionExecuted ?? null,
    ],
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// ─── Memory auto-save detection ─────────────────────────────────────────────

// Patterns for memory-worthy personal statements
const MEMORY_WORTHY_PATTERNS = [
  { pattern: /\b(i prefer|i love|i hate|i like|i enjoy|i dislike)\b.{5,}/i, confidence: 1.0, category: "preference" },
  { pattern: /\b(my favorite|my favourite)\b.{3,}/i, confidence: 1.0, category: "preference" },
  { pattern: /\b(i('m| am) (learning|studying|working on|building))\b.{3,}/i, confidence: 0.8, category: "goal" },
  { pattern: /\b(i usually|i always|i often|i normally)\b.{5,}/i, confidence: 0.8, category: "preference" },
  { pattern: /\b(my goal is|i want to|i aim to|i plan to)\b.{5,}/i, confidence: 0.7, category: "goal" },
  { pattern: /\b(i might|i could|i may) (learn|try|start)\b.{3,}/i, confidence: 0.3, category: "preference" },
];

// Things that should NEVER be saved as memory
const NOT_MEMORY: RegExp[] = [
  /^(hi|hey|hello|ok|okay|sure|thanks|yes|no|yep|nope|great|cool|nice|got it|sounds good)[\s!.]*$/i,
  /\?$/,  // questions
  /^what is|^how do|^explain|^tell me about/i,  // general knowledge queries
];

function shouldSaveAsMemory(message: string): { save: boolean; confidence: number; category: string } {
  const trimmed = message.trim();
  if (trimmed.length < 8) return { save: false, confidence: 0, category: "preference" };
  if (NOT_MEMORY.some((p) => p.test(trimmed))) return { save: false, confidence: 0, category: "preference" };

  for (const { pattern, confidence, category } of MEMORY_WORTHY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { save: true, confidence, category };
    }
  }

  return { save: false, confidence: 0, category: "preference" };
}

// ─── Natural language task argument extraction ───────────────────────────────

function extractTaskArgs(message: string): Record<string, string> {
  const lower = message.toLowerCase();
  const args: Record<string, string> = {};

  // Extract title: "create task to study Java" → "study Java"
  const titleMatch =
    message.match(/(?:task|todo|to-do)(?:\s+called|\s+named|\s+titled|\s+to)?\s+(?:["']([^"']+)["']|(.+?)(?:\s+(?:today|tomorrow|tonight|next|on|at|for|by)\b|$))/i);
  if (titleMatch) {
    args.title = (titleMatch[1] ?? titleMatch[2] ?? "").trim();
  }

  // Extract date
  const datePatterns = [
    /\b(today|tomorrow|tonight|this evening|this morning|next \w+|on \w+|in \d+ (days?|hours?))\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  ];
  for (const p of datePatterns) {
    const m = message.match(p);
    if (m) {
      const dateStr = parseDate(m[1] ?? m[0]);
      if (dateStr) {
        args.date = dateStr;
        break;
      }
    }
  }

  // Extract time (inline parse to avoid ESM import issues)
  const timePatterns = [
    /\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    /\b(\d{1,2}:\d{2})\b/,
    /\b(morning|afternoon|evening|night|noon)\b/i,
  ];
  for (const p of timePatterns) {
    const m = message.match(p);
    if (m) {
      const timeRaw = (m[1] ?? m[0]).trim();
      const ampm = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(timeRaw);
      if (ampm) {
        let h = parseInt(ampm[1], 10);
        const mins = ampm[2] ? parseInt(ampm[2], 10) : 0;
        if (ampm[3].toLowerCase() === "pm" && h !== 12) h += 12;
        if (ampm[3].toLowerCase() === "am" && h === 12) h = 0;
        args.time = `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
      } else if (/^\d{1,2}:\d{2}$/.test(timeRaw)) {
        args.time = timeRaw;
      } else if (/^morning$/i.test(timeRaw)) {
        args.time = "09:00";
      } else if (/^afternoon$/i.test(timeRaw)) {
        args.time = "14:00";
      } else if (/^evening$/i.test(timeRaw)) {
        args.time = "18:00";
      } else if (/^night$/i.test(timeRaw)) {
        args.time = "21:00";
      } else if (/^noon$/i.test(timeRaw)) {
        args.time = "12:00";
      }
      if (args.time) break;
    }
  }

  return args;
}

// ─── Check if user is requesting a create-task action naturally ──────────────

function detectCreateTaskIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const patterns = [
    /\b(create|add|make|new|schedule|set up|remind me to)\b.*(task|todo|to-do)/i,
    /\b(create|add|make) task\b/i,
    /\bremind me to\b/i,
    /\bschedule\b.*\btask\b/i,
    /\bput\b.*(on my schedule|on my calendar|in my tasks)\b/i,
  ];
  return patterns.some((p) => p.test(lower));
}

// ─── Main orchestrator ──────────────────────────────────────────────────────

export const piggyIntelligence = {
  async handleChat(request: ChatRequest): Promise<ChatResult> {
    const startTime = Date.now();
    const message = request.message?.trim() ?? "";

    if (!message) {
      return {
        success: false,
        conversationId: request.conversationId ?? newConversationId(),
        response: "",
        errorCategory: "invalid_request",
      };
    }

    const conversationId = request.conversationId || newConversationId();

    try {
      // ─── STEP 1: Check for pending slot-filling state ─────────────────
      const state = conversationState.get(conversationId);
      if (state.pendingAction) {
        const pending = state.pendingAction;
        const slotResult = continueSlotFilling(pending, message);

        await persistMessage({ conversationId, role: "user", content: message });

        if ("cancelled" in slotResult && slotResult.cancelled) {
          conversationState.clearPendingAction(conversationId);
          const cancelMsg = slotResult.message || "No problem — I cancelled that.";
          await persistMessage({ conversationId, role: "assistant", content: cancelMsg });
          return {
            success: true,
            conversationId,
            response: cancelMsg,
          };
        }

        if (!slotResult.ready) {
          // Still collecting — ask next question
          conversationState.setPendingAction(conversationId, slotResult.updatedAction);
          const question = sanitizeUserResponse(slotResult.question);
          await persistMessage({ conversationId, role: "assistant", content: question });
          return {
            success: true,
            conversationId,
            response: question,
          };
        }

        // All slots collected — execute the tool
        conversationState.clearPendingAction(conversationId);

        console.log(`[PIGGY][SLOT] executing ${pending.tool} with args:`, slotResult.args);
        const result = await executePiggyTool(pending.tool, slotResult.args);

        const responseText = sanitizeUserResponse(formatToolResult(pending.tool, result, slotResult.args));
        await persistMessage({
          conversationId,
          role: "assistant",
          content: responseText,
          intent: pending.tool,
          actionType: pending.tool,
          actionExecuted: result.success,
        });

        console.log(`[PIGGY][SLOT] tool=${pending.tool} success=${result.success} (${Date.now() - startTime}ms)`);
        return {
          success: result.success,
          conversationId,
          response: responseText,
          action: { type: pending.tool, executed: result.success },
          data: result.data,
        };
      }

      // ─── STEP 2: Check for natural-language task creation ──────────────
      if (detectCreateTaskIntent(message)) {
        const prefilledArgs = extractTaskArgs(message);
        const slotResult = startSlotFilling("piggy_task_create", prefilledArgs);

        await persistMessage({ conversationId, role: "user", content: message });

        if (!slotResult.ready) {
          conversationState.setPendingAction(conversationId, slotResult.updatedAction);
          await persistMessage({ conversationId, role: "assistant", content: slotResult.question });
          console.log(`[ROUTER] type=ACTION (slot-fill started) (${Date.now() - startTime}ms)`);
          return {
            success: true,
            conversationId,
            response: slotResult.question,
          };
        }

        // All args already in the message — execute immediately
        const result = await executePiggyTool("piggy_task_create", slotResult.args);
        const responseText = formatToolResult("piggy_task_create", result, slotResult.args);

        await persistMessage({
          conversationId,
          role: "assistant",
          content: responseText,
          intent: "piggy_task_create",
          actionType: "piggy_task_create",
          actionExecuted: result.success,
        });

        console.log(`[ROUTER] type=ACTION (direct create) (${Date.now() - startTime}ms)`);
        return {
          success: result.success,
          conversationId,
          response: responseText,
          action: { type: "piggy_task_create", executed: result.success },
          data: result.data,
        };
      }

      // ─── STEP 3: Classify the query ────────────────────────────────────
      const { mode, liveSources } = classifyQuery(message);
      console.log(`[ROUTER] type=${mode}`);

      const isFastChat = mode === "FAST_CHAT" || mode === "NONE";

      // ─── STEP 4: Run retrieval only when needed ────────────────────────
      let memoryFactsPromise: Promise<string[]> = Promise.resolve([]);
      let ragContextPromise: Promise<RetrievedContext[]> = Promise.resolve([]);

      if (!isFastChat) {
        if (mode === "MEMORY" || mode === "HYBRID") {
          memoryFactsPromise = piggyMemory.retrieveRelevant(message);
        }
        if (mode === "LIVE_DATA" || mode === "HYBRID") {
          ragContextPromise = piggyRag.retrieve(message, mode, liveSources);
        }
      }

      const [history, memoryFacts, ragContext] = await Promise.all([
        loadHistory(conversationId),
        memoryFactsPromise,
        ragContextPromise,
      ]);

      if (!isFastChat) {
        console.log(
          `[PIGGY][RAG] mode=${mode} memory_count=${memoryFacts.length} live_sources=[${ragContext.map((r) => r.source).join(", ")}]`,
        );
      }

      // ─── STEP 5: Check if this is just a bare "create task" trigger ───
      const isBarCreateTask = /^(create|add|make|new)\s+task[\s!.]*$/i.test(message.trim());
      if (isBarCreateTask) {
        const slotResult = startSlotFilling("piggy_task_create", {});
        await persistMessage({ conversationId, role: "user", content: message });
        if (!slotResult.ready) {
          conversationState.setPendingAction(conversationId, slotResult.updatedAction);
          await persistMessage({ conversationId, role: "assistant", content: slotResult.question });
          return { success: true, conversationId, response: slotResult.question };
        }
      }

      // ─── STEP 6: Intent detection ─────────────────────────────────────
      const lastAssistantMsg = [...history].reverse().find((m) => m.role === "assistant")?.content;
      const pendingQuestion = lastAssistantMsg && lastAssistantMsg.includes("?") ? lastAssistantMsg : null;

      const decisionContext: DecisionContext = {
        message,
        history,
        ragContext: ragContext
          .map((entry) => `[${entry.source}]\n${entry.content}`)
          .join("\n\n")
          .slice(0, 1500),
        memoryFacts,
        pendingQuestion,
        fastChat: isFastChat,
      };

      const decision = await intentDetector.decide(decisionContext);

      console.log(
        `[PIGGY] decision kind=${decision.kind} tool=${decision.tool ?? "-"} confidence=${decision.confidence.toFixed(2)} (${Date.now() - startTime}ms)`,
      );

      // ─── STEP 7: Handle ANSWER ─────────────────────────────────────────
      if (decision.kind === "answer") {
        await persistMessage({ conversationId, role: "user", content: message });

        let reply = decision.reply || "Could you rephrase that?";

        // Grounding Validator — only for non-fast-chat with personal queries
        if (!isFastChat && memoryFacts.length > 0) {
          const validation = validateAnswer(message, reply, memoryFacts, ragContext);
          if (!validation.isValid && validation.sanitizedAnswer) {
            console.warn(`[PIGGY][GROUNDING] Answer validation failed: ${validation.reason}. Overriding answer.`);
            reply = validation.sanitizedAnswer;
          }
        }

        const sanitizedReply = sanitizeUserResponse(reply);

        await persistMessage({
          conversationId,
          role: "assistant",
          content: sanitizedReply,
          intent: "ANSWER",
          confidence: decision.confidence,
        });

        // ─── Auto-save memory if user stated a personal fact ──────────────
        const memCheck = shouldSaveAsMemory(message);
        if (memCheck.save && mode !== "LIVE_DATA") {
          // Save silently in background — don't await or add to response
          piggyMemory.save(message.trim(), memCheck.category, Math.round(memCheck.confidence * 10)).catch((err) => {
            console.error("[PIGGY][MEMORY-AUTO] Failed to auto-save:", err);
          });
          console.log(`[PIGGY][MEMORY-AUTO] Saving: "${message.slice(0, 60)}" (confidence=${memCheck.confidence})`);
        }

        return {
          success: true,
          conversationId,
          response: sanitizedReply,
          intent: { name: "ANSWER", confidence: decision.confidence },
        };
      }

      // ─── STEP 8: Handle ACTION ─────────────────────────────────────────
      const known = listPiggyTools().some((tool) => tool.name === decision.tool);

      if (!known || !decision.tool) {
        return {
          success: false,
          conversationId,
          response: "I understood the request but wasn't sure how to handle it. Could you try rephrasing?",
          intent: { name: decision.tool ?? "UNKNOWN", confidence: decision.confidence },
          errorCategory: "unknown_action",
        };
      }

      // Check if this action needs slot-filling
      const toolSlots = SLOT_DEFINITIONS[decision.tool];
      if (toolSlots) {
        const prefilledArgs = Object.fromEntries(
          Object.entries(decision.args ?? {}).map(([k, v]) => [k, String(v ?? "")])
        );
        const slotResult = startSlotFilling(decision.tool, prefilledArgs);

        await persistMessage({ conversationId, role: "user", content: message });

        if (!slotResult.ready) {
          conversationState.setPendingAction(conversationId, slotResult.updatedAction);
          const question = sanitizeUserResponse(slotResult.question);
          await persistMessage({ conversationId, role: "assistant", content: question });
          return { success: true, conversationId, response: question };
        }
        // All slots filled — continue with execution using slotResult.args
        decision.args = slotResult.args;
      }

      console.log(`[PIGGY] executing ${decision.tool}`);

      const result = await executePiggyTool(decision.tool, decision.args ?? {});

      console.log(
        `[PIGGY] ${decision.tool} -> ${result.success ? "ok" : "failed"} (${Date.now() - startTime}ms)`,
      );

      await persistMessage({ conversationId, role: "user", content: message });

      if (!result.success) {
        const errorMsg = "I couldn't do that right now. Want me to try again?";
        console.error(`[PIGGY] ${decision.tool} failed:`, result.error);
        await persistMessage({
          conversationId,
          role: "assistant",
          content: errorMsg,
          intent: decision.tool,
          confidence: decision.confidence,
          actionType: decision.tool,
          actionExecuted: false,
        });

        return {
          success: false,
          conversationId,
          response: errorMsg,
          intent: { name: decision.tool, confidence: decision.confidence },
          action: { type: decision.tool, executed: false, error: result.error || result.message },
          errorCategory: result.error || "action_failed",
        };
      }

      const responseText = sanitizeUserResponse(formatToolResult(decision.tool, result, decision.args ?? {}));

      await persistMessage({
        conversationId,
        role: "assistant",
        content: responseText,
        intent: decision.tool,
        confidence: decision.confidence,
        actionType: decision.tool,
        actionExecuted: true,
      });

      return {
        success: true,
        conversationId,
        response: responseText,
        intent: { name: decision.tool, confidence: decision.confidence },
        action: { type: decision.tool, executed: true },
        data: result.data,
      };

    } catch (error) {
      if (error instanceof RateLimitError) {
        return {
          success: true,
          conversationId,
          response: "I'm experiencing a brief AI slowdown right now — please try again in a moment.",
          errorCategory: "rate_limit",
        };
      }

      if (error instanceof AiUnavailableError || error instanceof OllamaUnavailableError) {
        return {
          success: true,
          conversationId,
          response: "I can't reach my AI service right now. Please try again in a moment.",
          errorCategory: "ai_unavailable",
        };
      }

      if (error instanceof AiTimeoutError || error instanceof OllamaTimeoutError) {
        return {
          success: true,
          conversationId,
          response: "That took a bit too long to process. Could you try again?",
          errorCategory: "ai_timeout",
        };
      }

      console.error("[PIGGY] unhandled error:", error);

      return {
        success: true,
        conversationId,
        response: "Something went wrong while processing that. Could you try again?",
        errorCategory: "internal_error",
      };
    }
  },

  async getConversation(conversationId: string) {
    return piggyStore.all(
      `SELECT id, role, content, intent, action_executed, created_at
       FROM piggy_conversation_message
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId],
    );
  },
};

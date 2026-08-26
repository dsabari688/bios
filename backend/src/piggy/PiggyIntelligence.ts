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
import { piggyRag } from "./rag.js";
import { piggyMemory } from "./memory.js";
import { piggyStore } from "./piggyStore.js";

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

export const piggyIntelligence = {
  async handleChat(request: ChatRequest): Promise<ChatResult> {
    const message = request.message?.trim() ?? "";

    if (!message) {
      return {
        success: false,
        conversationId:
          request.conversationId ?? newConversationId(),
        response: "",
        errorCategory: "invalid_request",
      };
    }

    const conversationId =
      request.conversationId || newConversationId();

    try {
      const [history, memoryFacts, ragContext] =
        await Promise.all([
          loadHistory(conversationId),
          piggyMemory.retrieveRelevant(message),
          piggyRag.retrieve(message),
        ]);

      const lastAssistantMsg = [...history].reverse().find((m) => m.role === "assistant")?.content;
      const pendingQuestion = lastAssistantMsg && lastAssistantMsg.includes("?") ? lastAssistantMsg : null;

      const decisionContext: DecisionContext = {
        message,
        history,
        ragContext: ragContext
          .map((entry) => `[${entry.source}]\n${entry.content}`)
          .join("\n\n")
          .slice(0, 4000),
        memoryFacts,
        pendingQuestion,
      };

      const decision = await intentDetector.decide(decisionContext);

      console.log(
        `[PIGGY] decision kind=${decision.kind} tool=${decision.tool ?? "-"} confidence=${decision.confidence.toFixed(2)}`,
      );

      if (decision.kind === "answer") {
        await persistMessage({
          conversationId,
          role: "user",
          content: message,
        });

        const reply = decision.reply || "Could you rephrase that?";

        await persistMessage({
          conversationId,
          role: "assistant",
          content: reply,
          intent: "ANSWER",
          confidence: decision.confidence,
        });

        return {
          success: true,
          conversationId,
          response: reply,
          intent: {
            name: "ANSWER",
            confidence: decision.confidence,
          },
        };
      }

      const known = listPiggyTools().some(
        (tool) => tool.name === decision.tool,
      );

      if (!known || !decision.tool) {
        return {
          success: false,
          conversationId,
          response:
            "I understood the request but could not map it to a valid operation safely.",
          intent: {
            name: decision.tool ?? "UNKNOWN",
            confidence: decision.confidence,
          },
          errorCategory: "unknown_action",
        };
      }

      console.log(`[PIGGY] executing ${decision.tool}`);

      const result = await executePiggyTool(
        decision.tool,
        decision.args ?? {},
      );

      console.log(
        `[PIGGY] ${decision.tool} -> ${result.success ? "ok" : "failed"}`,
      );

      await persistMessage({
        conversationId,
        role: "user",
        content: message,
      });

      if (!result.success) {
        const errorMsg = result.message || result.error || "Action failed.";
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
          intent: {
            name: decision.tool,
            confidence: decision.confidence,
          },
          action: {
            type: decision.tool,
            executed: false,
            error: result.error || result.message,
          },
          errorCategory: result.error || "action_failed",
        };
      }

      const responseText = truncate(result.message, 500);

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
        intent: {
          name: decision.tool,
          confidence: decision.confidence,
        },
        action: {
          type: decision.tool,
          executed: true,
        },
        data: result.data,
      };
    } catch (error) {
      if (error instanceof RateLimitError) {
        return {
          success: false,
          conversationId,
          response:
            "I'm receiving requests too quickly right now. Please try again in a few seconds.",
          errorCategory: "rate_limit",
        };
      }

      if (error instanceof AiUnavailableError || error instanceof OllamaUnavailableError) {
        return {
          success: false,
          conversationId,
          response:
            "I can't reach my AI service right now. Please try again in a moment.",
          errorCategory: "ai_unavailable",
        };
      }

      if (error instanceof AiTimeoutError || error instanceof OllamaTimeoutError) {
        return {
          success: false,
          conversationId,
          response:
            "The AI core took too long to respond. Please try again in a moment.",
          errorCategory: "ai_timeout",
        };
      }

      console.error("[PIGGY] unhandled error:", error);

      return {
        success: false,
        conversationId,
        response:
          "Something went wrong while processing that. Please try again.",
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

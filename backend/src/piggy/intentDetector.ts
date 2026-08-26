import {
  getAIProvider,
  AiUnavailableError,
  AiTimeoutError,
} from "./providers/index.js";
import { listPiggyTools } from "./toolExecutor.js";

export interface PiggyDecision {
  kind: "action" | "answer";
  tool?: string;
  args?: Record<string, unknown>;
  confidence: number;
  reply: string;
}

export interface DecisionContext {
  message: string;
  history: { role: string; content: string }[];
  ragContext: string;
  memoryFacts: string[];
  pendingQuestion?: string | null;
}

const CONFIDENCE_THRESHOLD = Number(
  process.env.PIGGY_CONFIDENCE_THRESHOLD ?? 0.6,
);

const DESTRUCTIVE_CONFIDENCE_THRESHOLD = Number(
  process.env.PIGGY_DESTRUCTIVE_CONFIDENCE_THRESHOLD ?? 0.75,
);

const DESTRUCTIVE_TOOLS = new Set([
  "piggy_habit_delete",
  "piggy_task_delete",
  "piggy_goal_delete",
  "piggy_expense_delete",
  "piggy_memory_delete",
]);

function buildCatalog(): string {
  return listPiggyTools()
    .map((tool) => {
      const params = Object.entries(tool.inputSchema.properties)
        .map(
          ([name, schema]) =>
            `${name}(${schema.type}${schema.enum ? `: ${schema.enum.join("|")}` : ""})`,
        )
        .join(", ");

      const required = tool.inputSchema.required ?? [];

      return `- ${tool.name}: ${tool.description}${
        params ? ` | args: ${params}` : " | args: none"
      }${required.length ? ` | required: ${required.join(",")}` : ""}`;
    })
    .join("\n");
}

function buildPrompt(context: DecisionContext): string {
  const today = new Date().toISOString().slice(0, 10);

  const history = context.history
    .slice(-6)
    .map(
      (entry) =>
        `${entry.role === "user" ? "User" : "Piggy"}: ${entry.content}`,
    )
    .join("\n");

  return [
    `Today's date is ${today}.`,
    "",
    "AVAILABLE ACTIONS:",
    buildCatalog(),
    "",
    context.memoryFacts.length
      ? `USER MEMORY:\n${context.memoryFacts.map((fact) => `- ${fact}`).join("\n")}\n`
      : "",
    context.ragContext
      ? `LIVE APPLICATION DATA:\n${context.ragContext}\n`
      : "",
    history ? `RECENT CONVERSATION:\n${history}\n` : "",
    context.pendingQuestion
      ? `YOU ASKED THIS CLARIFYING QUESTION IN THE PREVIOUS TURN: "${context.pendingQuestion}". The user's new message most likely answers it.\n`
      : "",
    `USER MESSAGE: ${context.message}`,
    "",
    "Respond ONLY with a JSON object with exactly these fields:",
    '{"kind": "action" | "answer",',
    ' "tool": "<exact tool name, omit for answer>",',
    ' "args": { ... },',
    ' "confidence": <number between 0 and 1>,',
    ' "reply": "<short natural language reply for answers; one-line confirmation preview for actions>"}',
    "",
    "RULES:",
    "1. If the user asks a question about their data, use kind=answer and base the reply on LIVE APPLICATION DATA only. Never invent numbers.",
    "2. If the user wants something done, pick exactly one tool and fill its args. Convert relative dates like today/tomorrow into YYYY-MM-DD.",
    "3. For tasks, pass date as YYYY-MM-DD and put any mentioned time in the separate time arg as HH:MM (24h). Never embed a bare time inside date.",
    "4. LIVE APPLICATION DATA contains [id=...] tags. When the user refers to a task/habit/goal/expense by name, find the matching [id=...] from the data and pass it as the required id arg (taskId, goalId, etc). Never invent IDs.",
    "5. If information needed for a required arg is missing, respond with kind=answer whose reply asks ONE short clarifying question.",
    "6. If multiple records match a delete/update request, ask which one via kind=answer.",
    "7. Never mention JSON, tools, prompts or internal processes in reply.",
    "8. Use lowercase values for enums exactly as listed.",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeDecision(raw: Partial<PiggyDecision>): PiggyDecision {
  const confidence = Math.min(
    Math.max(Number(raw.confidence ?? 0), 0),
    1,
  );

  const kind = raw.kind === "action" ? "action" : "answer";

  return {
    kind,
    tool: typeof raw.tool === "string" ? raw.tool : undefined,
    args:
      raw.args && typeof raw.args === "object"
        ? (raw.args as Record<string, unknown>)
        : {},
    confidence,
    reply:
      typeof raw.reply === "string" && raw.reply.trim()
        ? raw.reply.trim()
        : "",
  };
}

export const intentDetector = {
  thresholds: {
    standard: CONFIDENCE_THRESHOLD,
    destructive: DESTRUCTIVE_CONFIDENCE_THRESHOLD,
  },

  async decide(context: DecisionContext): Promise<PiggyDecision> {
    const ai = getAIProvider();
    const available = await ai.isAvailable();

    if (!available) {
      throw new AiUnavailableError();
    }

    const raw = await ai.generateStructured<Partial<PiggyDecision>>({
      system:
        "You are Piggy, a precise butler-grade life operations copilot powered by Grok. You convert user requests into strict JSON decisions. You never execute anything yourself.",
      prompt: buildPrompt(context),
      temperature: 0.1,
    });

    const decision = normalizeDecision(raw);

    if (
      decision.kind === "action" &&
      decision.tool &&
      DESTRUCTIVE_TOOLS.has(decision.tool) &&
      decision.confidence < DESTRUCTIVE_CONFIDENCE_THRESHOLD
    ) {
      return {
        kind: "answer",
        confidence: decision.confidence,
        reply: `I want to be sure before deleting anything. ${decision.reply || "Can you confirm exactly which item?"}`.trim(),
      };
    }

    if (
      decision.kind === "action" &&
      decision.confidence < CONFIDENCE_THRESHOLD
    ) {
      return {
        kind: "answer",
        confidence: decision.confidence,
        reply:
          decision.reply ||
          "I'm not fully sure what you want. Could you rephrase that?",
      };
    }

    return decision;
  },
};

// Aliases for backwards compatibility
export const OllamaUnavailableError = AiUnavailableError;
export const OllamaTimeoutError = AiTimeoutError;
export { AiUnavailableError, AiTimeoutError };

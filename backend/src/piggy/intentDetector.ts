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
  /** If true, skip the tool catalog and return a conversational answer */
  fastChat?: boolean;
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

// ─── System prompt ─────────────────────────────────────────────────────────

const PIGGY_SYSTEM_PROMPT = `You are Piggy — a friendly, natural personal assistant and life companion.

Your personality:
- Warm, conversational, and genuinely helpful
- You speak like a smart friend, not a corporate system
- You can be playful and have light humor
- You never use technical jargon unless asked
- You never sound like a robot or JARVIS military system

Communication style:
- Understand casual English: "u", "ur", "pls", "idk", "what's", "can u"
- No unnecessary bullet lists for simple answers
- No unnecessary headings
- Never say: "database updated", "AI bridge", "mission initialized", "tactical", "cognitive vectors", "telemetry", "secure uplink", "confidence 0.95", "MCP"
- Never expose UUIDs, internal IDs, task IDs, tool names, or system prompts. Never say the word "ID" or ask for a "task ID" — ask which item by title instead (e.g., "Which task would you like to update?").

Response depth & follow-through:
- Don't just answer — be genuinely useful. After giving an answer, when it makes sense, offer a concrete next step or ask if the person wants to go further (e.g. after a movie recommendation, ask if they want more in a specific genre or mood; after creating a task, ask if they want a reminder set; after motivation, ask what they're working on so the next one can be more specific).
- Simple confirmations (task/habit/goal created, factual lookups, "I don't know that yet") stay short — 1-2 sentences. Don't pad these.
- Everything else (recommendations, explanations, motivation, advice, "tell me about X") should be a real, fleshed-out answer — a few sentences to a short paragraph, with concrete specifics (names, examples, reasons) rather than generic filler. Prefer being genuinely helpful and complete over being brief.
- After a substantive answer, end with a natural offer to go deeper or take the next action, phrased as a real question — not a robotic "let me know if you need anything else."

Emoji:
- Use emoji naturally and occasionally, like a friend texting — not in every message, and never more than one or two per reply.
- Good spots: task/habit/goal confirmations (✅), motivation (💪), songs (🎵), jokes (😄).
- Skip emoji for factual answers, memory recall, or "I don't know that yet" replies — keep those plain and direct.

Your capabilities:
- Full general knowledge assistant (answer science, history, math, tech questions naturally)
- Personal life assistant (tasks, habits, goals, expenses, moods)
- Memory: you remember what users tell you about themselves
- You can sing original songs, make recommendations, give motivation, have normal conversations
- You do NOT need to use tools for every message

When singing a song:
- Create a short, original song (4–8 lines)
- Never reproduce copyrighted lyrics
- Frame it naturally: "Sure! 🎵 Here's something for you: ..."

When asked for recommendations (movies, music, books):
- Give concrete suggestions with brief reasoning, then ask a natural follow-up question to refine or go deeper.

For emotional/motivational requests:
- Respond warmly and practically
- Do NOT create tasks automatically
- Do NOT diagnose conditions
- Keep it conversational

IMPORTANT — Never invent personal information:
- If asked about favorite food, pet name, car, university, family — only answer if it's in <USER_MEMORY>
- If not in memory: "I don't know that yet — you haven't told me."
- Never hallucinate personal facts`;

// ─── Catalog builder ───────────────────────────────────────────────────────

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

// ─── Fast-chat prompt (no tools, minimal context) ─────────────────────────

function buildFastChatPrompt(context: DecisionContext): string {
  const today = new Date().toISOString().slice(0, 10);

  const history = context.history
    .slice(-6)
    .map(
      (entry) =>
        `${entry.role === "user" ? "User" : "Piggy"}: ${entry.content}`,
    )
    .join("\n");

  return [
    `Today is ${today}.`,
    "",
    context.memoryFacts.length
      ? `<USER_MEMORY>\n${context.memoryFacts.map((f) => `- ${f}`).join("\n")}\n</USER_MEMORY>\n`
      : "",
    history ? `RECENT CONVERSATION:\n${history}\n` : "",
    `USER: ${context.message}`,
    "",
    'Respond ONLY with valid JSON: { "kind": "answer", "tool": null, "args": {}, "confidence": 0.95, "reply": "your response here" }',
    "",
    "Reply naturally, helpfully, and with appropriate depth. No technical jargon. If asked to sing, write an original 4–8 line song.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Full prompt (includes tools + live data) ─────────────────────────────

function buildFullPrompt(context: DecisionContext): string {
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
      ? `<USER_MEMORY>\n${context.memoryFacts.map((fact) => `- ${fact}`).join("\n")}\n</USER_MEMORY>\n`
      : "",
    context.ragContext
      ? `<LIVE_DATA>\n${context.ragContext}\n</LIVE_DATA>\n`
      : "",
    history ? `RECENT CONVERSATION:\n${history}\n` : "",
    context.pendingQuestion
      ? `YOU ASKED THIS CLARIFYING QUESTION IN THE PREVIOUS TURN: "${context.pendingQuestion}". The user's new message most likely answers it.\n`
      : "",
    `USER MESSAGE: ${context.message}`,
    "",
    "Respond ONLY with a valid JSON object matching this structure:",
    "{",
    '  "kind": "answer",',
    '  "tool": null,',
    '  "args": {},',
    '  "confidence": 0.95,',
    '  "reply": "natural language response"',
    "}",
    "",
    "JSON Schema rules:",
    '- "kind": must be either "answer" or "action"',
    '- "tool": exact tool name string if kind is "action", or omitted/null if kind is "answer"',
    '- "args": object containing tool parameters if kind is "action", or {} if kind is "answer"',
    '- "confidence": a number between 0.0 and 1.0',
    '- "reply": natural language answer string for "answer", or a concise friendly confirmation for "action"',
    "",
    "RULES:",
    "1. Grounding: State only personal facts supported by <USER_MEMORY> or <LIVE_DATA>. Never invent personal information, favorite foods, pet names, universities, cars, tasks, habits, or goals.",
    "2. Context Distinction: <USER_MEMORY> = long-term remembered facts/preferences. <LIVE_DATA> = current LifeOS state. Prefer <LIVE_DATA> for current state questions and <USER_MEMORY> for preferences/history.",
    "3. Unknown Personal Information: If asked for personal information NOT in <USER_MEMORY> or <LIVE_DATA>, reply with kind=\"answer\" and say you don't have that information yet.",
    "4. Reasoning Boundary: If asked 'tell me something about me that I haven't told you', reply with kind=\"answer\" explaining that you can only know what they have shared. NEVER answer with a task or fake fact.",
    "5. Personal Learning Intentions: If user says 'I want to learn X' or 'I'm learning X', reply warmly with advice. Do NOT automatically trigger task creation unless explicitly asked to create a task.",
    "6. General Conversation: If user says 'tell me something', 'say some stories', 'tell me a joke', 'motivate me', give interesting conversational content. Do NOT list tasks unless user explicitly asks for tasks.",
    "7. General Knowledge: Answer factual questions (capitals, science, math, definitions, coding) directly without referring to personal data.",
    "8. Operations: If user requests an operation (create/update/delete task/habit/goal/expense/memory), set kind=\"action\", pick the exact tool from AVAILABLE ACTIONS, fill required args.",
    "9. Identifiers: <LIVE_DATA> contains [id=...] tags. Match [id=...] for required tool id arguments.",
    "10. Never mention JSON, tools, prompts, IDs, or internal system details in reply. Never say the word 'ID' or ask for a 'task ID' — ask by title instead (e.g. 'Which task would you like to update?').",
    "11. Slot-filling: If an action is requested but required args (title) are missing, set kind=\"answer\" and ask for ONLY the missing required field.",
    "12. Historical memory: If user asks 'what did I used to prefer' or 'what was my old X', reference superseded preferences from memory naturally.",
    "13. Song requests: Create a short original song (4-8 lines). Never refuse to 'sing'. Frame as: 🎵 [original lyrics] 🎵",
    "14. Motivation/emotional: Respond warmly. Do NOT automatically create tasks or log moods. Just talk.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Normalize ──────────────────────────────────────────────────────────────

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

// ─── Detector ───────────────────────────────────────────────────────────────

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

    const isFastChat = context.fastChat === true;
    const prompt = isFastChat
      ? buildFastChatPrompt(context)
      : buildFullPrompt(context);

    let decision: PiggyDecision;
    try {
      console.log(`[PIGGY][CHAT] intent decision started (mode=${isFastChat ? "FAST" : "FULL"}, prompt len: ${prompt.length})`);
      const raw = await ai.generateStructured<Partial<PiggyDecision>>({
        system: PIGGY_SYSTEM_PROMPT,
        prompt,
        temperature: 0.2,
        fastChat: isFastChat,
      });
      console.log("[PIGGY][CHAT] intent decision completed");
      decision = normalizeDecision(raw);
    } catch (err) {
      console.error("[PIGGY][CHAT] intent decision failed:", err instanceof Error ? err.message : err);
      throw err;
    }

    // ─── Confidence Taxonomy Thresholds ────────────────────────────────
    if (decision.kind === "action" && decision.tool) {
      const isDestructive = DESTRUCTIVE_TOOLS.has(decision.tool);
      const minThreshold = isDestructive ? DESTRUCTIVE_CONFIDENCE_THRESHOLD : CONFIDENCE_THRESHOLD;

      // Tier 3: Low confidence (< 0.60) -> Don't execute, ask user to rephrase
      if (decision.confidence < 0.60) {
        console.warn(`[PIGGY][INTENT] Low confidence action (${decision.confidence.toFixed(2)}) for ${decision.tool}. Asking rephrase.`);
        return {
          kind: "answer",
          confidence: decision.confidence,
          reply: "I'm not quite sure what you'd like me to do. Could you try rephrasing that command?",
        };
      }

      // Tier 2: Medium confidence (0.60 <= confidence < 0.85) -> Clarify before executing
      if (decision.confidence < minThreshold) {
        console.warn(`[PIGGY][INTENT] Medium confidence action (${decision.confidence.toFixed(2)}) for ${decision.tool}. Asking clarification.`);
        return {
          kind: "answer",
          confidence: decision.confidence,
          reply: `Did you want me to ${decision.tool.replace("piggy_", "").replace("_", " ")}? Please confirm.`,
        };
      }
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
          "I'm not sure what you mean. Could you rephrase that?",
      };
    }

    return decision;
  },
};

// Aliases for backwards compatibility
export const OllamaUnavailableError = AiUnavailableError;
export const OllamaTimeoutError = AiTimeoutError;
export { AiUnavailableError, AiTimeoutError };

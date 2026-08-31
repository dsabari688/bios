import type { SlotSpec, PendingAction } from "./conversationState.js";
import { parseNormalizedDate, parseNormalizedTime, resolveDateAndTime, formatLocalDate } from "./dateNormalizer.js";
import { listPiggyTools } from "./toolExecutor.js";

// ─── Typo & Speech-to-Text Normalizer ──────────────────────────────────────

function normalizeSpeechTypos(text: string): string {
  let s = text.trim();

  // Date typos
  s = s.replace(/\btosay\b/gi, "today");
  s = s.replace(/\btomorow\b|\btommorrow\b|\btomm\b|\btmrw\b|\btmr\b/gi, "tomorrow");
  s = s.replace(/\btonite\b/gi, "tonight");

  // Time typos ("10 pam" -> "10 pm", "10 p.m." -> "10 pm", "10 p m" -> "10 pm")
  s = s.replace(/(\d{1,2})\s*p\s*a\s*m\b/gi, "$1 pm");
  s = s.replace(/(\d{1,2})\s*a\s*a\s*m\b/gi, "$1 am");
  s = s.replace(/(\d{1,2})\s*p\.?m\.?/gi, "$1 pm");
  s = s.replace(/(\d{1,2})\s*a\.?m\.?/gi, "$1 am");
  s = s.replace(/(\d{1,2})\s*p\s+m\b/gi, "$1 pm");
  s = s.replace(/(\d{1,2})\s*a\s+m\b/gi, "$1 am");
  s = s.replace(/(\d{1,2})\.(\d{2})\s*(am|pm)/gi, "$1:$2 $3");

  return s;
}

export function parseTime(raw: string): string | null {
  return parseNormalizedTime(raw);
}

export function parseDate(raw: string): string | null {
  const res = parseNormalizedDate(raw);
  return res.valid ? (res.date ?? null) : null;
}

// ─── Default / Unsure Detection ────────────────────────────────────────────

export function isDefaultOrUnsureResponse(message: string): boolean {
  const lower = message.toLowerCase().trim();
  if (!lower) return false;

  if (/^\s*(make\s+)?default\s*$/i.test(lower)) return true;
  if (/\b(make default|use default|set default|default value|standard)\b/i.test(lower)) return true;
  if (/\b(you decide|u decide|neeyeh choose|neeye choose|choose for me|you pick|u pick|neeye|neeyeh)\b/i.test(lower)) return true;
  if (/\b(whatever|doesn't matter|doesnt matter|don't matter|dont matter|no matter)\b/i.test(lower)) return true;
  if (/\b(therla|onnum illa|onum illa|idk|don't know|dont know|no idea|up to you|anything|any|not sure|skip|no preference|whichever)\b/i.test(lower)) return true;

  return false;
}

export function getDefaultValueForSlot(tool: string, slotKey: string): string | null {
  const tools = listPiggyTools();
  const def = tools.find((t) => t.name === tool);
  const schemaDefault = def?.inputSchema?.properties?.[slotKey]?.default;
  if (typeof schemaDefault === "string") return schemaDefault;

  if (slotKey === "date") return formatLocalDate(new Date());
  if (slotKey === "category") return "important-not-urgent";
  if (slotKey === "title") return "New Task";
  return null;
}

// ─── Slot Definitions & Dynamic Schema Filter ─────────────────────────────

type SlotDef = Omit<SlotSpec, "transform"> & {
  transform?: (raw: string, args: Record<string, string>) => string | null;
};

const TASK_SLOTS: SlotDef[] = [
  {
    key: "title",
    question: "What should I call the task?",
  },
  {
    key: "date",
    question: "When do you want to do that?",
    transform: (raw) => parseDate(raw),
  },
  {
    key: "time",
    question: "What time?",
    transform: (raw) => parseTime(raw),
  },
];

export const SLOT_DEFINITIONS: Record<string, SlotDef[]> = {
  piggy_task_create: TASK_SLOTS,
};

export function getRequiredSlotDefs(tool: string): SlotDef[] {
  const allSlotDefs = SLOT_DEFINITIONS[tool] ?? [];
  const tools = listPiggyTools();
  const def = tools.find((t) => t.name === tool);
  const requiredFields = def?.inputSchema?.required ?? [];

  if (requiredFields.length === 0) return [];
  return allSlotDefs.filter((slot) => requiredFields.includes(slot.key));
}

// ─── Slot-Filler Types ─────────────────────────────────────────────────────

export interface SlotResult {
  ready: true;
  args: Record<string, string>;
  cancelled?: boolean;
  message?: string;
  interrupted?: boolean;
}

export interface SlotQuestion {
  ready: false;
  question: string;
  updatedAction: PendingAction;
}

export type SlotFillerResult = SlotResult | SlotQuestion;

// ─── Core Slot Filling Engine ──────────────────────────────────────────────

export function startSlotFilling(
  tool: string,
  prefilledArgs: Record<string, string> = {},
): SlotFillerResult {
  const slotDefs = getRequiredSlotDefs(tool);
  const collectedArgs: Record<string, string> = { ...prefilledArgs };

  // Apply transforms to prefilled values
  const allPossibleSlots = SLOT_DEFINITIONS[tool] ?? [];
  for (const slot of allPossibleSlots) {
    if (collectedArgs[slot.key] !== undefined && slot.transform) {
      const transformed = slot.transform(collectedArgs[slot.key], collectedArgs);
      if (transformed !== null) {
        collectedArgs[slot.key] = transformed;
      } else {
        delete collectedArgs[slot.key];
      }
    }
  }

  // Resolve date and time if date & time present
  if (collectedArgs.date && collectedArgs.time) {
    const resolved = resolveDateAndTime(collectedArgs.date, collectedArgs.time);
    if (resolved.valid && resolved.date) {
      collectedArgs.date = resolved.date;
      if (resolved.time) collectedArgs.time = resolved.time;
    }
  }

  const remainingSlots = slotDefs.filter((s) => !collectedArgs[s.key]);

  if (remainingSlots.length === 0) {
    return { ready: true, args: collectedArgs };
  }

  const nextSlot = remainingSlots[0];
  const slotRetryCounts: Record<string, number> = { [nextSlot.key]: 1 };
  const pendingAction: PendingAction = {
    tool,
    collectedArgs,
    remainingSlots: remainingSlots as SlotSpec[],
    lastQuestion: nextSlot.question,
    slotRetryCounts,
    updatedAt: Date.now(),
  };

  return { ready: false, question: nextSlot.question, updatedAction: pendingAction };
}

/**
 * Continue slot-filling with user's answer to the last question.
 * Multi-slot extraction: parses ALL available slots (title, date, time) simultaneously.
 */
export function continueSlotFilling(
  pending: PendingAction,
  userMessage: string,
): SlotFillerResult {
  const rawMsg = userMessage.trim();
  const normalized = normalizeSpeechTypos(rawMsg);
  const lower = normalized.toLowerCase();

  // 1. Check Cancellation
  if (/\b(cancel|never mind|nevermind|forget it|stop|abort|cancel this)\b/i.test(lower)) {
    return {
      ready: true,
      args: {},
      cancelled: true,
      message: "No problem — I cancelled that action.",
    };
  }

  // 2. Check Intent Interruption: User completely changed topic or issued a new command
  const isInterruption = /^(hi|hello|hey|yo|sup|create|add|make|schedule|set up|delete|remove|clear|complete|finish|what|how|who|why|recommend|sing|tell me|motivate|my friend)\b/i.test(lower) &&
    !/^(today|tomorrow|tonight|this evening|this morning|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/i.test(lower) &&
    !isDefaultOrUnsureResponse(userMessage);

  if (isInterruption) {
    return {
      ready: true,
      args: {},
      interrupted: true,
    };
  }

  // 3. Check Confirmation for ambiguous bare-hour time (e.g. "7" -> "7 PM?")
  if (pending.awaitingConfirmation && pending.lastQuestion?.endsWith("?")) {
    if (/\b(yes|yeah|yep|sure|correct|y|ok|okay|fine|that's right)\b/i.test(lower)) {
      const remaining = pending.remainingSlots.filter((s) => !pending.collectedArgs[s.key]);
      if (remaining.length === 0) {
        return { ready: true, args: pending.collectedArgs };
      }
      const nextSlot = remaining[0];
      const updated: PendingAction = {
        ...pending,
        remainingSlots: remaining as SlotSpec[],
        lastQuestion: nextSlot.question,
        awaitingConfirmation: false,
        updatedAt: Date.now(),
      };
      return { ready: false, question: nextSlot.question, updatedAction: updated };
    }

    // User said no to confirmation -> clear ambiguous time slot and re-ask time
    delete pending.collectedArgs.time;
    const remaining = pending.remainingSlots.filter((s) => !pending.collectedArgs[s.key]);
    const updated: PendingAction = {
      ...pending,
      remainingSlots: remaining as SlotSpec[],
      awaitingConfirmation: false,
      lastQuestion: "What time would you prefer? (e.g. 7 PM or 9:30 AM)",
      updatedAt: Date.now(),
    };
    return { ready: false, question: "What time would you prefer? (e.g. 7 PM or 9:30 AM)", updatedAction: updated };
  }

  // 4. Handle explicit field removal (e.g. "remove description")
  if (/\b(remove|clear|delete|omit)\s+(description|notes|date|time)\b/i.test(lower)) {
    const fieldMatch = /(?:description|notes|date|time)/i.exec(lower);
    if (fieldMatch) {
      const keyToClear = fieldMatch[0].toLowerCase();
      delete pending.collectedArgs[keyToClear];
    }
  }

  // 5. Multi-slot Extraction & Default Handling
  const collected = { ...pending.collectedArgs };
  const retryCounts: Record<string, number> = { ...(pending.slotRetryCounts ?? {}) };
  const currentSlot = pending.remainingSlots[0];
  const isDefaultUserResponse = isDefaultOrUnsureResponse(userMessage);

  if (currentSlot) {
    const slotKey = currentSlot.key;
    const currentAttemptCount = retryCounts[slotKey] ?? 1;

    // Check if user requested default OR if this is attempt 2 without a usable answer
    if (isDefaultUserResponse || currentAttemptCount >= 1) {
      const extractedDate = parseDate(normalized);
      const extractedTime = parseTime(normalized);

      let extractedValue: string | null = null;
      if (slotKey === "date" && extractedDate) extractedValue = extractedDate;
      else if (slotKey === "time" && extractedTime) extractedValue = extractedTime;
      else if (slotKey === "title" && !isDefaultUserResponse && rawMsg.length >= 2) extractedValue = rawMsg;

      if (extractedValue) {
        collected[slotKey] = extractedValue;
      } else {
        // Auto-apply default value
        const defaultValue = getDefaultValueForSlot(pending.tool, slotKey);
        if (defaultValue !== null) {
          collected[slotKey] = defaultValue;
        }
        console.log(`[PIGGY][SLOT] Default value applied for slot ${slotKey}: ${defaultValue ?? "(none)"}`);
      }
    }
  }

  // Try extracting any additional slots present in text
  const extractedDate = parseDate(normalized);
  if (extractedDate) {
    collected.date = extractedDate;
  }

  const extractedTime = parseTime(normalized);
  if (extractedTime) {
    const bareHourMatch = /^(\d{1,2})$/.exec(normalized.trim());
    if (bareHourMatch && !/am|pm|morning|afternoon|evening|night/i.test(normalized)) {
      const h = parseInt(bareHourMatch[1], 10);
      if (h > 0 && h <= 12) {
        const pmTime = h === 12 ? "12:00" : `${String(h + 12).padStart(2, "0")}:00`;
        collected.time = pmTime;

        const slotDefs = getRequiredSlotDefs(pending.tool);
        const remaining = slotDefs.filter((s) => !collected[s.key]);
        const confirmQuestion = `${h} PM?`;
        const updated: PendingAction = {
          tool: pending.tool,
          collectedArgs: collected,
          remainingSlots: remaining as SlotSpec[],
          lastQuestion: confirmQuestion,
          awaitingConfirmation: true,
          slotRetryCounts: retryCounts,
          updatedAt: Date.now(),
        };
        return { ready: false, question: confirmQuestion, updatedAction: updated };
      }
    }
    collected.time = extractedTime;
  }

  // If title was missing and user reply is not a date/time keyword or default expression, use it as title!
  if (!collected.title && !isDefaultUserResponse) {
    if (!extractedDate && !extractedTime) {
      collected.title = rawMsg;
    } else {
      const titleCleaned = rawMsg
        .replace(/\b(today|tomorrow|tonight|next \w+|on \w+|\d{1,2}(?::\d{2})?\s*(?:am|pm)?|at \d{1,2})\b/gi, "")
        .trim();
      if (titleCleaned.length >= 2) {
        collected.title = titleCleaned;
      }
    }
  }

  // Resolve past-time rollover if date & time present
  if (collected.date && collected.time) {
    const resolved = resolveDateAndTime(collected.date, collected.time);
    if (resolved.valid && resolved.date) {
      collected.date = resolved.date;
      if (resolved.time) collected.time = resolved.time;
    }
  }

  // 6. Recalculate missing required slots
  const slotDefs = getRequiredSlotDefs(pending.tool);
  const remainingSlots = slotDefs.filter((s) => !collected[s.key]);

  if (remainingSlots.length === 0) {
    return { ready: true, args: collected };
  }

  const nextSlot = remainingSlots[0];
  retryCounts[nextSlot.key] = (retryCounts[nextSlot.key] ?? 0) + 1;

  const updatedAction: PendingAction = {
    tool: pending.tool,
    collectedArgs: collected,
    remainingSlots: remainingSlots as SlotSpec[],
    lastQuestion: nextSlot.question,
    awaitingConfirmation: false,
    slotRetryCounts: retryCounts,
    updatedAt: Date.now(),
  };

  return { ready: false, question: nextSlot.question, updatedAction };
}

// ─── Confirmation Formatter ────────────────────────────────────────────────

export function formatConfirmation(tool: string, args: Record<string, string>): string {
  if (tool === "piggy_task_create") {
    const title = args.title ?? "the task";
    const date = args.date ? formatDateHuman(args.date) : "today";
    const time = args.time ? formatTimeHuman(args.time) : null;
    return time
      ? `Got it — I'll schedule "${title}" for ${date} at ${time}.`
      : `Got it — I'll add "${title}" for ${date}.`;
  }
  return "Got it — executing now.";
}

function formatDateHuman(dateStr: string): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayStr = formatLocalDate(today);
  const tomorrowStr = formatLocalDate(tomorrow);

  if (dateStr === todayStr) return "today";
  if (dateStr === tomorrowStr) return "tomorrow";

  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatTimeHuman(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

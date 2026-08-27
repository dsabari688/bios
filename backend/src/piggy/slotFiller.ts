/**
 * slotFiller.ts
 *
 * Robust multi-turn slot-filling for Piggy actions.
 * Features:
 * - Speech-to-text typo normalization ("10 pam" -> "10 pm", "tosay" -> "today")
 * - Multi-slot extraction (extracts date AND time from a single reply like "today 10 pm")
 * - Cancellation handling ("cancel", "never mind")
 * - Mid-flow corrections ("actually 8 PM")
 * - Explicit field clearing ("remove description")
 * - Bare-hour confirmation ("7" -> "7 PM?")
 * - Intent interruption detection (user switches topic during slot-fill)
 */

import type { SlotSpec, PendingAction } from "./conversationState.js";
import { parseNormalizedDate, parseNormalizedTime, resolveDateAndTime } from "./dateNormalizer.js";

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

// ─── Slot Definitions ──────────────────────────────────────────────────────

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
  const slotDefs = SLOT_DEFINITIONS[tool];
  if (!slotDefs) {
    return { ready: true, args: prefilledArgs };
  }

  const collectedArgs: Record<string, string> = { ...prefilledArgs };

  // Apply transforms to prefilled values
  for (const slot of slotDefs) {
    if (collectedArgs[slot.key] !== undefined && slot.transform) {
      const transformed = slot.transform(collectedArgs[slot.key], collectedArgs);
      if (transformed !== null) {
        collectedArgs[slot.key] = transformed;
      } else {
        delete collectedArgs[slot.key];
      }
    }
  }

  // Resolve past time rollover if date & time present
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
  const pendingAction: PendingAction = {
    tool,
    collectedArgs,
    remainingSlots: remainingSlots as SlotSpec[],
    lastQuestion: nextSlot.question,
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

  // 2. Check Intent Interruption: User completely changed topic or issued a new command (e.g. "hi", "create a task...", "my friend said...")
  const isInterruption = /^(hi|hello|hey|yo|sup|create|add|make|schedule|set up|delete|remove|clear|complete|finish|what|how|who|why|recommend|sing|tell me|motivate|my friend)\b/i.test(lower) &&
    !/^(today|tomorrow|tonight|this evening|this morning|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/i.test(lower);

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

  // 5. Multi-slot Extraction: Extract ALL possible slots from the user's message
  const collected = { ...pending.collectedArgs };

  // Try extracting date
  const extractedDate = parseDate(normalized);
  if (extractedDate) {
    collected.date = extractedDate;
  }

  // Try extracting time
  const extractedTime = parseTime(normalized);
  if (extractedTime) {
    // Check if user provided a bare hour (like "7" or "10") without am/pm
    const bareHourMatch = /^(\d{1,2})$/.exec(normalized.trim());
    if (bareHourMatch && !/am|pm|morning|afternoon|evening|night/i.test(normalized)) {
      const h = parseInt(bareHourMatch[1], 10);
      if (h > 0 && h <= 12) {
        const pmTime = h === 12 ? "12:00" : `${String(h + 12).padStart(2, "0")}:00`;
        collected.time = pmTime;

        const slotDefs = SLOT_DEFINITIONS[pending.tool] ?? TASK_SLOTS;
        const remaining = slotDefs.filter((s) => !collected[s.key]);
        const confirmQuestion = `${h} PM?`;
        const updated: PendingAction = {
          tool: pending.tool,
          collectedArgs: collected,
          remainingSlots: remaining as SlotSpec[],
          lastQuestion: confirmQuestion,
          awaitingConfirmation: true,
          updatedAt: Date.now(),
        };
        return { ready: false, question: confirmQuestion, updatedAction: updated };
      }
    }
    collected.time = extractedTime;
  }

  // If title was missing and the user reply is not just a date/time keyword, use it as title!
  if (!collected.title) {
    if (!extractedDate && !extractedTime) {
      collected.title = rawMsg;
    } else {
      // User said "Study Java tomorrow at 7 PM" during slot filling -> extract title
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

  // 6. Recalculate missing slots
  const slotDefs = SLOT_DEFINITIONS[pending.tool] ?? TASK_SLOTS;
  const remainingSlots = slotDefs.filter((s) => !collected[s.key]);

  if (remainingSlots.length === 0) {
    return { ready: true, args: collected };
  }

  const nextSlot = remainingSlots[0];
  const updatedAction: PendingAction = {
    tool: pending.tool,
    collectedArgs: collected,
    remainingSlots: remainingSlots as SlotSpec[],
    lastQuestion: nextSlot.question,
    awaitingConfirmation: false,
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

  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

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

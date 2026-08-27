/**
 * slotFiller.ts
 *
 * Robust multi-turn slot-filling for Piggy actions.
 * Features:
 * - Speech-to-text typo normalization ("10 pam" -> "10 pm", "tosay" -> "today")
 * - Multi-slot extraction (extracts date AND time from a single reply like "today 10 pm")
 * - Cancellation handling ("cancel", "never mind")
 * - Mid-flow corrections ("actually 8 PM")
 * - Bare-hour confirmation ("7" -> "7 PM?")
 */

import type { SlotSpec, PendingAction } from "./conversationState.js";

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

// ─── Time Parser ───────────────────────────────────────────────────────────

const TIME_24H = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const TIME_AMPM = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i;
const TIME_IN_STRING = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const BARE_TIME_IN_STRING = /\bat\s+(\d{1,2})(?::(\d{2}))?\b/i;
const TIME_BARE = /^(\d{1,2})(?::(\d{2}))?$/;

export function parseTime(raw: string): string | null {
  const s = normalizeSpeechTypos(raw).toLowerCase();

  if (s.includes("morning")) return "09:00";
  if (s.includes("noon") || s.includes("midday")) return "12:00";
  if (s.includes("afternoon")) return "14:00";
  if (s.includes("evening") || s.includes("tonight") || s.includes("this evening")) return "18:00";
  if (s.includes("night")) return "21:00";

  // Explicit 24h format like "19:00"
  if (TIME_24H.test(s)) return s;

  // Exact am/pm match like "10 pm"
  const ampmExact = TIME_AMPM.exec(s);
  if (ampmExact) {
    let h = parseInt(ampmExact[1], 10);
    const m = ampmExact[2] ? parseInt(ampmExact[2], 10) : 0;
    const period = ampmExact[3].toLowerCase();
    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Substring am/pm match inside longer sentence like "today at 10 pm"
  const ampmSub = TIME_IN_STRING.exec(s);
  if (ampmSub) {
    let h = parseInt(ampmSub[1], 10);
    const m = ampmSub[2] ? parseInt(ampmSub[2], 10) : 0;
    const period = ampmSub[3].toLowerCase();
    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Bare time after "at" like "at 7"
  const bareAt = BARE_TIME_IN_STRING.exec(s);
  if (bareAt) {
    const h = parseInt(bareAt[1], 10);
    const m = bareAt[2] ? parseInt(bareAt[2], 10) : 0;
    const pmHour = h < 12 ? h + 12 : h;
    return `${String(pmHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Bare number like "7" or "10"
  const bareExact = TIME_BARE.exec(s);
  if (bareExact) {
    const h = parseInt(bareExact[1], 10);
    const m = bareExact[2] ? parseInt(bareExact[2], 10) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  return null;
}

// ─── Date Parser ───────────────────────────────────────────────────────────

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function nextWeekday(name: string): Date {
  const today = new Date();
  const target = WEEKDAY_NAMES.indexOf(name.toLowerCase());
  const current = today.getDay();
  let diff = target - current;
  if (diff <= 0) diff += 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return d;
}

function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(raw: string): string | null {
  const s = normalizeSpeechTypos(raw).toLowerCase();
  const today = new Date();

  if (s.includes("today")) return toDateStr(today);
  if (s.includes("tomorrow")) {
    const d = new Date(today);
    d.setDate(today.getDate() + 1);
    return toDateStr(d);
  }
  if (s.includes("tonight") || s.includes("this evening")) return toDateStr(today);
  if (s.includes("next week")) {
    const d = new Date(today);
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    d.setDate(today.getDate() + daysUntilMonday);
    return toDateStr(d);
  }

  // Weekdays: "next Monday", "this Friday", "on Thursday", or bare "friday"
  for (const dayName of WEEKDAY_NAMES) {
    if (new RegExp(`\\b(?:next\\s+|this\\s+|on\\s+)?${dayName}\\b`, "i").test(s)) {
      return toDateStr(nextWeekday(dayName));
    }
  }

  // "in N days"
  const inN = /\bin\s+(\d+)\s+days?\b/i.exec(s);
  if (inN) {
    const n = parseInt(inN[1], 10);
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return toDateStr(d);
  }

  // ISO or "YYYY-MM-DD"
  const isoMatch = /(\d{4}-\d{2}-\d{2})/.exec(s);
  if (isoMatch) return isoMatch[1];

  return null;
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
 * Multi-slot extraction: parses ALL available slots (title, date, time) from userMessage simultaneously.
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
      message: "No problem — I cancelled that task creation.",
    };
  }

  // 2. Check Confirmation for ambiguous bare-hour time (e.g. "7" -> "7 PM?")
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

  // 3. Multi-slot Extraction: Extract ALL possible slots from the user's message
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
    const bareHourMatch = TIME_BARE.exec(normalized.trim());
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

  // 4. Recalculate missing slots
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

  const todayStr = toDateStr(today);
  const tomorrowStr = toDateStr(tomorrow);

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

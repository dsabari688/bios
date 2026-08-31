/**
 * responseFormatter.ts
 *
 * Converts raw PiggyToolResult messages into natural, friendly responses.
 * Centralized user-facing sanitizer guarantees zero UUIDs, tool names, or system leak strings.
 */

import type { PiggyToolResult } from "./tools/habitTools.js";

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ID_BRACKET_REGEX = /\[id=[^\]]+\]/gi;
const ID_PAREN_REGEX = /\s*\((?:ID|id|taskId|memoryId):\s*[^\)]+\)/gi;
const INTERNAL_SYSTEM_STRINGS = [
  /\[PIGGY EXECUTED[^\]]*\]/gi,
  /\[PIGGY SECURE AUDIT[^\]]*\]/gi,
  /\[AI BRIDGE EXECUTION[^\]]*\]/gi,
  /\bDATABASE UPDATED\b/gi,
  /\bAI Bridge operational\b/gi,
  /\bMCP Bridge listening\b/gi,
  /\bpiggy_[a-z_]+\b/gi,
];

/**
 * Centralized sanitizer: guarantees no internal IDs, UUIDs, or tool execution metadata leak to user.
 */
export function sanitizeUserResponse(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Strip internal system execution markers
  for (const pattern of INTERNAL_SYSTEM_STRINGS) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Strip UUIDs, [id=...], (ID: ...), and raw ID references
  cleaned = cleaned.replace(UUID_REGEX, "");
  cleaned = cleaned.replace(ID_BRACKET_REGEX, "");
  cleaned = cleaned.replace(ID_PAREN_REGEX, "");
  cleaned = cleaned.replace(/\bwhich task id\b/gi, "Which task");
  cleaned = cleaned.replace(/\btask id\b/gi, "task");
  cleaned = cleaned.replace(/\bhabit id\b/gi, "habit");
  cleaned = cleaned.replace(/\bgoal id\b/gi, "goal");
  cleaned = cleaned.replace(/\bexpense id\b/gi, "expense");

  // Clean up formatting glitches left by removals
  cleaned = cleaned
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return cleaned;
}

function formatDateHuman(iso: string): string {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const d = new Date(iso);
    const dateOnly = d.toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    if (dateOnly === todayStr) return "today";
    if (dateOnly === tomorrowStr) return "tomorrow";

    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function formatTimeHuman(iso: string): string | null {
  try {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 0 && m === 0) return null;
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, "0")} ${period}`;
  } catch {
    return null;
  }
}

function cleanTaskList(tasks: unknown[]): string {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return "You have no tasks right now.";
  }

  const lines = tasks.slice(0, 15).map((t: any) => {
    const title = t.title || "Untitled";
    const status = t.status === "completed" ? "✅" : t.status === "pending" ? "⏳" : "📌";
    const dateStr = t.date ? formatDateHuman(t.date) : "";
    const timeStr = t.date ? formatTimeHuman(t.date) : null;
    const when = timeStr ? `${dateStr} at ${timeStr}` : dateStr;
    return `${status} ${title}${when ? ` — ${when}` : ""}`;
  });

  return `Here are your tasks:\n\n${lines.join("\n")}`;
}

function cleanHabitList(habits: unknown[]): string {
  if (!Array.isArray(habits) || habits.length === 0) {
    return "You have no habits set up yet.";
  }

  const lines = habits.slice(0, 10).map((h: any) => {
    const name = h.name || "Unnamed";
    const streak = h.streak ?? 0;
    return `• ${name} — ${streak}-day streak`;
  });

  return `Here are your habits:\n\n${lines.join("\n")}`;
}

function cleanGoalList(goals: unknown[]): string {
  if (!Array.isArray(goals) || goals.length === 0) {
    return "You have no goals set up yet.";
  }

  const lines = goals.slice(0, 10).map((g: any) => {
    const title = g.title || "Unnamed";
    const progress = g.progress ?? 0;
    const status = g.status ? ` (${g.status})` : "";
    return `• ${title} — ${progress}%${status}`;
  });

  return `Here are your goals:\n\n${lines.join("\n")}`;
}

function cleanExpenseList(data: unknown): string {
  if (!data) return "No expense data available.";

  const d = data as any;
  const total = d.total ?? 0;
  const items: any[] = d.items ?? (Array.isArray(data) ? data : []);

  const lines = items.slice(0, 10).map((e: any) => {
    const cat = e.category || "Other";
    const amt = e.amount ?? 0;
    const desc = e.description ? ` (${e.description})` : "";
    return `• ${cat}: ₹${amt}${desc}`;
  });

  const header = total > 0 ? `Total: ₹${total}\n\n` : "";
  return `${header}${lines.join("\n") || "No expenses logged."}`;
}

export function formatToolResult(
  toolName: string,
  result: PiggyToolResult,
  args?: Record<string, unknown>,
): string {
  if (!result.success) {
    return "I couldn't do that right now. Want me to try again?";
  }

  let formatted = "";

  // Task operations
  if (toolName === "piggy_task_create") {
    const task = result.data as any;
    const title = task?.title ?? (args?.title ?? "the task");
    const date = task?.date ? formatDateHuman(task.date) : "today";
    const time = task?.date ? formatTimeHuman(task.date) : null;
    formatted = time
      ? `Done — I've added "${title}" for ${date} at ${time}.`
      : `Done — I've added "${title}" for ${date}.`;
  } else if (toolName === "piggy_task_complete") {
    const task = result.data as any;
    const title = task?.title ?? "that task";
    formatted = `Done — "${title}" is marked complete. ✅`;
  } else if (toolName === "piggy_task_delete") {
    formatted = "Done — I've removed that task.";
  } else if (toolName === "piggy_task_update") {
    const task = result.data as any;
    const title = task?.title ?? "the task";
    const date = task?.date ? formatDateHuman(task.date) : null;
    const time = task?.date ? formatTimeHuman(task.date) : null;
    if (date && time) formatted = `Done — "${title}" is now scheduled for ${date} at ${time}.`;
    else if (date) formatted = `Done — "${title}" is now scheduled for ${date}.`;
    else formatted = `Done — "${title}" has been updated.`;
  } else if (toolName === "piggy_tasks_list") {
    formatted = cleanTaskList(result.data as unknown[]);
  }

  // Habit operations
  else if (toolName === "piggy_habit_log") {
    const habit = result.data as any;
    const name = habit?.name ?? "your habit";
    formatted = `Done — "${name}" logged for today. Keep the streak going! 🔥`;
  } else if (toolName === "piggy_habit_create") {
    const habit = result.data as any;
    const name = habit?.name ?? "the habit";
    formatted = `Done — I've added "${name}" to your habits.`;
  } else if (toolName === "piggy_habit_delete") {
    formatted = "Done — that habit has been removed.";
  } else if (toolName === "piggy_habits_list") {
    formatted = cleanHabitList(result.data as unknown[]);
  }

  // Goal operations
  else if (toolName === "piggy_goal_create") {
    const goal = result.data as any;
    const title = goal?.title ?? "the goal";
    formatted = `Done — I've added "${title}" to your goals.`;
  } else if (toolName === "piggy_goal_update") {
    formatted = "Done — your goal has been updated.";
  } else if (toolName === "piggy_goal_delete") {
    formatted = "Done — that goal has been removed.";
  } else if (toolName === "piggy_goals_list") {
    formatted = cleanGoalList(result.data as unknown[]);
  }

  // Expense operations
  else if (toolName === "piggy_expense_create") {
    const exp = result.data as any;
    const cat = exp?.category ?? "expense";
    const amt = exp?.amount ?? "";
    formatted = `Done — logged ${amt ? `₹${amt} ` : ""}under ${cat}.`;
  } else if (toolName === "piggy_expense_delete") {
    formatted = "Done — that expense has been removed.";
  } else if (toolName === "piggy_expenses_list") {
    formatted = cleanExpenseList(result.data);
  }

  // Memory operations
  else if (toolName === "piggy_memory_save") {
    formatted = "Got it — I'll remember that.";
  } else if (toolName === "piggy_memory_delete") {
    formatted = "Done — I've cleared that from my memory.";
  } else if (toolName === "piggy_memory_list") {
    const facts = result.data as any[];
    if (!Array.isArray(facts) || facts.length === 0) {
      formatted = "I don't have anything stored in memory yet.";
    } else {
      const lines = facts.slice(0, 10).map((f: any) => `• ${f.fact}`);
      formatted = `Here's what I remember about you:\n\n${lines.join("\n")}`;
    }
  }

  // Mood
  else if (toolName === "piggy_mood_log") {
    formatted = "Got it — your mood has been logged.";
  }

  // Analytics
  else if (toolName === "piggy_analytics_weekly") {
    const data = result.data as any;
    if (!data) return "No analytics data available.";
    formatted = `Here's your weekly snapshot:\n\n${JSON.stringify(data, null, 2).slice(0, 800)}`;
  }

  // Generic fallback
  else {
    formatted = result.message ?? "Done.";
  }

  return sanitizeUserResponse(formatted);
}

import type { HabitFrequency } from "./habit.types.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function todayStr(): string {
  return toISODate(new Date());
}

export function shiftDate(dateStr: string, deltaDays: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + deltaDays);

  return toISODate(date);
}

export function isValidDateStr(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31
  );
}

function mondayOf(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);

  const date = new Date(year, month - 1, day);
  const weekdayIndex = (date.getDay() + 6) % 7;

  return shiftDate(dateStr, -weekdayIndex);
}

function sanitizeLogs(logs: unknown): string[] {
  if (!Array.isArray(logs)) {
    return [];
  }

  return Array.from(
    new Set(
      logs.filter((log) => isValidDateStr(log)),
    ),
  ) as string[];
}

export function calculateStreak(
  logs: unknown,
  frequency: HabitFrequency | string | undefined,
): number {
  const uniqueLogs = sanitizeLogs(logs);

  if (uniqueLogs.length === 0) {
    return 0;
  }

  const logSet = new Set(uniqueLogs);

  const anchor = uniqueLogs.sort().pop() as string;
  const today = todayStr();

  if (frequency === "weekly") {
    return calculateWeeklyStreak(logSet, anchor, mondayOf(today));
  }

  return calculateDailyStreak(logSet, anchor, today);
}

function calculateDailyStreak(
  logSet: Set<string>,
  anchor: string,
  today: string,
): number {
  if (anchor !== today && anchor !== shiftDate(today, -1)) {
    return 0;
  }

  let cursor = anchor;
  let streak = 0;

  while (logSet.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

function calculateWeeklyStreak(
  logSet: Set<string>,
  anchor: string,
  currentMonday: string,
): number {
  const anchorMonday = mondayOf(anchor);

  if (
    anchorMonday !== currentMonday &&
    anchorMonday !== shiftDate(currentMonday, -7)
  ) {
    return 0;
  }

  const weekMondays = new Set(
    Array.from(logSet).map((date) => mondayOf(date)),
  );

  let cursorWeek = anchorMonday;
  let streak = 0;

  while (weekMondays.has(cursorWeek)) {
    streak += 1;
    cursorWeek = shiftDate(cursorWeek, -7);
  }

  return streak;
}

export function calculateLongestStreak(
  logs: unknown,
  frequency: HabitFrequency | string | undefined,
): number {
  const uniqueLogs = sanitizeLogs(logs).sort();

  if (uniqueLogs.length === 0) {
    return 0;
  }

  if (frequency === "weekly") {
    return longestRun(
      uniqueLogs.map((date) => mondayOf(date)).filter(
        (value, index, arr) => index === 0 || arr[index - 1] !== value,
      ),
      7,
    );
  }

  return longestRun(uniqueLogs, 1);
}

function longestRun(sortedKeys: string[], stepDays: number): number {
  let longest = 0;
  let run = 0;
  let expected = "";

  for (const key of sortedKeys) {
    if (run > 0 && key === expected) {
      run += 1;
    } else {
      run = 1;
    }

    expected = shiftDate(key, stepDays);
    longest = Math.max(longest, run);
  }

  return longest;
}

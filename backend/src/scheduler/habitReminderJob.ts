import { pool } from "../db/postgres.js";
import { notificationRepository } from "../modules/notifications/notification.repository.js";
import {
  isValidDateStr,
  shiftDate,
  todayStr,
} from "../modules/habits/habit.streak.js";

interface HabitRow {
  id: string;
  name: string;
  frequency: string;
  streak: number;
  logs: unknown;
}

function parseLogs(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((log) => isValidDateStr(log)) as string[];
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((log) => isValidDateStr(log))
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function hasLogInCurrentWeek(logs: string[], today: string): boolean {
  const [year, month, day] = today.split("-").map(Number);

  const now = new Date(year, month - 1, day);
  const weekdayIndex = (now.getDay() + 6) % 7;

  const weekStart = shiftDate(today, -weekdayIndex);
  const weekEnd = shiftDate(weekStart, 6);

  return logs.some(
    (log) => log >= weekStart && log <= weekEnd,
  );
}

export async function runHabitReminderCheck(
  now: Date = new Date(),
): Promise<{ created: number; checked: number }> {
  const reminderTime =
    process.env.HABIT_REMINDER_TIME || "20:00";

  const [targetHour, targetMinute] = reminderTime
    .split(":")
    .map(Number);

  const minutesNow =
    now.getHours() * 60 + now.getMinutes();

  const minutesTarget =
    (Number.isFinite(targetHour) ? targetHour : 20) * 60 +
    (Number.isFinite(targetMinute) ? targetMinute : 0);

  if (minutesNow < minutesTarget) {
    return { created: 0, checked: 0 };
  }

  const today = todayStr();
  const lastRunKey = `habit-reminder:${today}`;

  const alreadyRan = await notificationRepository.findByDedupeKey(
    `${lastRunKey}:batch`,
  );

  if (alreadyRan) {
    return { created: 0, checked: 0 };
  }

  const result = await pool.query(
    `SELECT * FROM "habit"`,
  );

  const habits = result.rows as HabitRow[];

  let created = 0;

  for (const habit of habits) {
    const logs = parseLogs(habit.logs);

    let isPending = false;

    if (habit.frequency === "weekly") {
      isPending = !hasLogInCurrentWeek(logs, today);
    } else {
      isPending = !logs.includes(today);
    }

    if (!isPending) {
      continue;
    }

    const currentStreak = Number(habit.streak) || 0;

    const message =
      currentStreak > 0
        ? `You haven't logged "${habit.name}" today. Keep your ${currentStreak}-day streak alive!`
        : `You haven't logged "${habit.name}" today. A fresh start is one tap away.`;

    const inserted = await notificationRepository.create({
      type: "habit_reminder",
      title: "Habit reminder",
      message,
      dedupeKey: `${lastRunKey}:${habit.id}`,
    });

    if (inserted) {
      created += 1;
    }
  }

  await notificationRepository.create({
    type: "system",
    title: "Scheduler",
    message: `Habit reminder batch executed (${created} reminders).`,
    dedupeKey: `${lastRunKey}:batch`,
  });

  console.log(
    `[scheduler] habit reminders: checked=${habits.length} created=${created}`,
  );

  return { created, checked: habits.length };
}

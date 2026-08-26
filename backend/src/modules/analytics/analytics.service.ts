import { pool } from "../../db/postgres.js";
import { analyticsRepository } from "./analytics.repository.js";
import {
  calculateLongestStreak,
  calculateStreak,
  isValidDateStr,
  shiftDate,
  todayStr,
} from "../habits/habit.streak.js";
import type {
  HabitAnalyticsSummary,
  HabitSummaryEntry,
  DiagnosticMetrics,
  ChronologicalFlowEntry,
} from "./analytics.types.js";

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

export const analyticsService = {
  async getHabitSummary(
    periodDays: number,
  ): Promise<HabitAnalyticsSummary> {
    const rows = await analyticsRepository.findAllHabits();

    const today = todayStr();
    const periodStart = shiftDate(today, -(periodDays - 1));
    const periodEnd = today;

    const dailyCompletionCounts: Record<string, number> = {};

    for (let cursor = periodStart; cursor <= periodEnd; cursor = shiftDate(cursor, 1)) {
      dailyCompletionCounts[cursor] = 0;
    }

    const habits: HabitSummaryEntry[] = [];

    let totalCompletionsInPeriod = 0;
    let totalPossibleUnits = 0;

    for (const row of rows) {
      const logs = parseLogs(row.logs);

      const completionsInPeriod = logs.filter(
        (log) => log >= periodStart && log <= periodEnd,
      );

      for (const log of completionsInPeriod) {
        if (dailyCompletionCounts[log] !== undefined) {
          dailyCompletionCounts[log] += 1;
        }
      }

      const isWeekly = row.frequency === "weekly";

      const periodUnits = isWeekly
        ? Math.max(1, Math.ceil(periodDays / 7))
        : periodDays;

      totalCompletionsInPeriod += completionsInPeriod.length;
      totalPossibleUnits += periodUnits;

      habits.push({
        id: String(row.id),
        name: String(row.name),
        frequency: String(row.frequency),
        currentStreak: calculateStreak(logs, row.frequency),
        longestStreak: calculateLongestStreak(
          logs,
          row.frequency,
        ),
        totalCompletions: logs.length,
        completionsInPeriod: completionsInPeriod.length,
        completionRate:
          Math.round(
            (completionsInPeriod.length / periodUnits) * 1000,
          ) / 1000,
        periodUnits,
        targetValue: row.targetValue ?? null,
        unit: row.unit ?? null,
      });
    }

    return {
      periodDays,
      totalHabits: rows.length,
      overallCompletionRate:
        totalPossibleUnits === 0
          ? 0
          : Math.round(
              (totalCompletionsInPeriod / totalPossibleUnits) * 1000,
            ) / 1000,
      dailyCompletionCounts,
      habits,
    };
  },

  async getWeeklyReview() {
    const weekStart = shiftDate(todayStr(), -6);

    const tasksResult = await pool.query(
      `
      SELECT
        "status",
        COUNT(*)::int AS count
      FROM "task"
      WHERE "date" >= $1::timestamptz
        AND "date" < ($1::timestamptz + INTERVAL '7 days')
      GROUP BY "status"
      `,
      [weekStart],
    );

    let tasksCompleted = 0;
    let tasksSkipped = 0;

    for (const row of tasksResult.rows) {
      if (row.status === "completed") {
        tasksCompleted = row.count;
      } else if (row.status === "pending") {
        tasksSkipped = row.count;
      }
    }

    const habitRows =
      await analyticsRepository.findAllHabits();

    let consistencySum = 0;
    let consistencyCount = 0;
    let bestHabit = "None";
    let bestCompletions = -1;

    for (const row of habitRows) {
      const logs = parseLogs(row.logs);

      const completions = logs.filter(
        (log) => log >= weekStart && log <= todayStr(),
      ).length;

      const periodUnits =
        row.frequency === "weekly" ? 1 : 7;

      consistencySum += Math.min(
        1,
        completions / periodUnits,
      );
      consistencyCount += 1;

      if (completions > bestCompletions) {
        bestCompletions = completions;
        bestHabit = String(row.name);
      }
    }

    const habitConsistency =
      consistencyCount === 0
        ? 0
        : Math.round(
            (consistencySum / consistencyCount) * 100,
          );

    const goalsResult = await pool.query(
      `
      SELECT "title", "progress", "status"
      FROM "goal"
      ORDER BY "updatedAt" DESC
      LIMIT 5
      `,
    );

    const goalProgress = goalsResult.rows.map(
      (row) => ({
        title: String(row.title),
        progress: Number(row.progress) || 0,
        status: String(row.status),
      }),
    );

    const piggyInsight =
      habitConsistency >= 80
        ? "An outstanding week of conformance, Sir. Keep parameters dialed in!"
        : habitConsistency >= 50
          ? "Solid output this week. Tighten the gaps and streaks will compound."
          : "Systems require attention, Sir. Re-engage priority habits immediately.";

    const [spendResult, budgetResult] = await Promise.all([
      pool.query(
        `
        SELECT COALESCE(SUM("amount"), 0)::float8 AS total
        FROM "expense"
        WHERE "transactionDate" >= $1::timestamptz
          AND "transactionDate" < ($1::timestamptz + INTERVAL '7 days')
        `,
        [weekStart],
      ),
      pool.query(
        `
        SELECT "category", "limitAmount", "period"
        FROM "budget_allowance"
        WHERE "period" = 'weekly'
        `,
      ),
    ]);

    const moneySpent = Number(spendResult.rows[0]?.total ?? 0);

    const categoryTotals = await pool.query(
      `
      SELECT "category", COALESCE(SUM("amount"), 0)::float8 AS total
      FROM "expense"
      WHERE "transactionDate" >= $1::timestamptz
        AND "transactionDate" < ($1::timestamptz + INTERVAL '7 days')
      GROUP BY "category"
      `,
      [weekStart],
    );

    const spentByCategory = new Map<string, number>();
    for (const row of categoryTotals.rows) {
      spentByCategory.set(String(row.category), Number(row.total));
    }

    let budgetStatus = budgetResult.rows.length === 0
      ? "No weekly budgets configured"
      : "Within weekly parameters";

    for (const row of budgetResult.rows) {
      const spent = spentByCategory.get(String(row.category)) ?? 0;
      const limitAmount = Number(row.limitAmount);

      if (limitAmount > 0 && spent > limitAmount) {
        budgetStatus =
          `Over budget in ${row.category} (₹${Math.round(spent)} of ₹${limitAmount})`;
        break;
      }
    }

    return {
      tasksCompleted,
      tasksSkipped,
      habitConsistency,
      bestHabit,
      worstHabit: "None",
      moneySpent,
      budgetStatus,
      goalProgress,
      piggyInsight,
    };
  },

  async getDiagnosticMetrics(
    periodDays: number,
  ): Promise<DiagnosticMetrics> {
    const today = todayStr();
    const periodStart = shiftDate(today, -(periodDays - 1));
    const periodEnd = shiftDate(today, 1);

    const periodStartDate = new Date(periodStart);
    periodStartDate.setHours(0, 0, 0, 0);
    const periodEndDate = new Date(periodEnd);
    periodEndDate.setHours(0, 0, 0, 0);

    const [tasks, focusLogs] = await Promise.all([
      analyticsRepository.findTasksInPeriod(
        periodStartDate,
        periodEndDate,
      ),
      analyticsRepository.findFocusLogsInPeriod(
        periodStart,
        today,
      ),
    ]);

    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);

    const focusByDate: Record<string, number> = {};
    for (const log of focusLogs) {
      const dateStr = String(log.date);
      focusByDate[dateStr] =
        (focusByDate[dateStr] ?? 0) + 1;
    }

    let totalTracked = 0;
    let completedCount = 0;
    let missedCount = 0;

    const daily: Record<
      string,
      { total: number; completed: number; missed: number }
    > = {};

    for (let cursor = periodStart; cursor < periodEnd; cursor = shiftDate(cursor, 1)) {
      daily[cursor] = { total: 0, completed: 0, missed: 0 };
    }

    for (const task of tasks) {
      const taskDate: Date = new Date(task.date);
      taskDate.setHours(0, 0, 0, 0);
      const dateKey = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, "0")}-${String(taskDate.getDate()).padStart(2, "0")}`;
      const status = String(task.status);

      if (status === "cancelled") continue;

      totalTracked++;

      const dayBucket = daily[dateKey];
      if (dayBucket) {
        dayBucket.total++;
      }

      if (status === "completed") {
        completedCount++;
        if (dayBucket) {
          dayBucket.completed++;
        }
      } else if (
        status === "pending" &&
        taskDate < todayDate
      ) {
        missedCount++;
        if (dayBucket) {
          dayBucket.missed++;
        }
      }
    }

    const completionRate =
      totalTracked === 0
        ? 0
        : Math.round((completedCount / totalTracked) * 100);

    const chronologicalFlow: ChronologicalFlowEntry[] = [];

    for (let cursor = periodStart; cursor < periodEnd; cursor = shiftDate(cursor, 1)) {
      const dayData = daily[cursor];
      const dayTotal = dayData?.total ?? 0;
      const dayCompleted = dayData?.completed ?? 0;
      const dayMissed = dayData?.missed ?? 0;
      const dayRate =
        dayTotal === 0
          ? 0
          : Math.round((dayCompleted / dayTotal) * 100);

      chronologicalFlow.push({
        date: cursor,
        totalTasks: dayTotal,
        completedTasks: dayCompleted,
        missedTasks: dayMissed,
        completionRate: dayRate,
        focusBlocksCompleted: focusByDate[cursor] ?? 0,
      });
    }

    return {
      totalTrackedTasks: totalTracked,
      completionRate,
      missedTasks: missedCount,
      focusBlocksCompleted: focusLogs.length,
      chronologicalFlow,
    };
  },
};

import { habitService } from "../modules/habits/habit.service.js";
import { taskService } from "../modules/tasks/task.service.js";
import { goalService } from "../modules/goals/goal.service.js";
import { expenseService } from "../modules/expenses/expense.service.js";
import { budgetService } from "../modules/budgets/budget.service.js";
import { moodService } from "../modules/moods/mood.service.js";
import { analyticsService } from "../modules/analytics/analytics.service.js";
import {
  isValidDateStr,
  shiftDate,
  todayStr,
} from "../modules/habits/habit.streak.js";
import { piggyStore } from "./piggyStore.js";
import { piggyMemory } from "./memory.js";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface HabitRow {
  id: string;
  name: string;
  frequency: string;
  streak: number;
  logs: unknown;
  category?: string | null;
}

function habitLogs(row: HabitRow): string[] {
  if (Array.isArray(row.logs)) {
    return (row.logs as unknown[]).filter(isValidDateStr);
  }
  return [];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function completionRateInWindow(
  logs: string[],
  start: string,
  end: string,
): { done: number; days: number } {
  let done = 0;
  let cursor = start;

  while (cursor <= end) {
    if (logs.includes(cursor)) done += 1;
    cursor = shiftDate(cursor, 1);
  }

  const msPerDay = 86400000;
  const days =
    Math.round(
      (new Date(`${end}T00:00:00`).getTime() -
        new Date(`${start}T00:00:00`).getTime()) /
        msPerDay,
    ) + 1;

  return { done, days };
}

function weekdayBreakdown(logs: string[], windowStart: string) {
  const done = Array(7).fill(0) as number[];
  const possible = Array(7).fill(0) as number[];

  const today = todayStr();
  let cursor = windowStart;

  while (cursor <= today) {
    const dayIndex = new Date(`${cursor}T00:00:00`).getDay();
    possible[dayIndex] += 1;
    if (logs.includes(cursor)) done[dayIndex] += 1;
    cursor = shiftDate(cursor, 1);
  }

  return WEEKDAYS.map((name, index) => ({
    name,
    rate: possible[index] ? (done[index] / possible[index]) * 100 : -1,
    samples: possible[index],
  }));
}

function hourToBucket(hour: number): "morning" | "afternoon" | "night" {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "night";
}

async function activityHoursByDate(): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();

  const push = (dateKey: string, hour: number) => {
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey)!.push(hour);
  };

  try {
    const tasks = await taskService.getTasks();

    for (const task of tasks) {
      if (task.status !== "completed") continue;
      const date = new Date(task.date);
      if (Number.isNaN(date.getTime())) continue;
      push(date.toISOString().slice(0, 10), date.getHours());
    }
  } catch (error) {
    console.error("[piggy][dashboard] task hours failed", error);
  }

  try {
    const moods = await moodService.getMoods();

    for (const mood of moods ?? []) {
      const at = new Date(mood.loggedAt);
      if (Number.isNaN(at.getTime())) continue;
      push(at.toISOString().slice(0, 10), at.getHours());
    }
  } catch (error) {
    console.error("[piggy][dashboard] mood hours failed", error);
  }

  try {
    const focus = await piggyStore.all<{
      date: string;
      hour_of_day: number | null;
    }>("SELECT date, hour_of_day FROM piggy_focus_log");

    for (const entry of focus) {
      push(
        entry.date,
        entry.hour_of_day ?? 20,
      );
    }
  } catch (error) {
    console.error("[piggy][dashboard] focus hours failed", error);
  }

  return map;
}

async function computeTimeDistribution(
  completedDates: string[],
): Promise<{
  morningPercent: number;
  afternoonPercent: number;
  nightPercent: number;
}> {
  const activity = await activityHoursByDate();

  const buckets = { morning: 0, afternoon: 0, night: 0 };
  let sampledDays = 0;

  for (const date of completedDates.slice(-28)) {
    const hours = activity.get(date);

    if (!hours || hours.length === 0) continue;

    sampledDays += 1;

    for (const hour of hours) {
      buckets[hourToBucket(hour)] += 1;
    }
  }

  const total = buckets.morning + buckets.afternoon + buckets.night;

  if (total === 0) {
    return {
      morningPercent: 0,
      afternoonPercent: 0,
      nightPercent: 0,
    };
  }

  return {
    morningPercent: Math.round((buckets.morning / total) * 100),
    afternoonPercent: Math.round(
      (buckets.afternoon / total) * 100,
    ),
    nightPercent: Math.round((buckets.night / total) * 100),
  };
}

export const piggyDashboard = {
  async getCockpitData() {
    const [habits, tasks, goals, moods] = await Promise.all([
      habitService.getHabits(),
      taskService.getTasks(),
      goalService.findAll(),
      moodService.getMoods(),
    ]);

    const today = todayStr();
    const windowStart = shiftDate(today, -27);
    const last7Start = shiftDate(today, -6);
    const prev7End = shiftDate(today, -7);
    const prev7Start = shiftDate(today, -13);

    const perHabit = [] as {
      id: string;
      name: string;
      streak: number;
      risk: {
        riskPercent: number;
        confidencePercent: number;
        reasons: string[];
        recommendation: string;
        successProbability: number;
      };
      patterns: {
        overallCompletion: number;
        bestWeekday: string;
        worstWeekday: string;
        morningPercent: number;
        afternoonPercent: number;
        nightPercent: number;
        consistencyScore: number;
        momentum: string;
      };
    }[];

    let consistencySum = 0;
    let momentumSum = 0;

    for (const raw of habits) {
      const row = raw as HabitRow;
      const logs = habitLogs(row);

      const last28 = completionRateInWindow(
        logs,
        windowStart,
        today,
      );
      const last7 = completionRateInWindow(logs, last7Start, today);
      const prev7 = completionRateInWindow(
        logs,
        prev7Start,
        prev7End,
      );

      const overall = last28.days
        ? (last28.done / last28.days) * 100
        : 0;
      const recentRate = last7.days
        ? (last7.done / last7.days) * 100
        : 0;
      const previousRate = prev7.days
        ? (prev7.done / prev7.days) * 100
        : 0;

      const momentumDelta = recentRate - previousRate;

      consistencySum += overall;
      momentumSum += clamp(50 + momentumDelta * 2);

      const weekdays = weekdayBreakdown(logs, windowStart);
      const rated = weekdays.filter((day) => day.rate >= 0 && day.samples > 0);
      const bestWeekday =
        rated.length > 0
          ? rated.reduce((a, b) => (b.rate > a.rate ? b : a)).name
          : "—";
      const worstWeekday =
        rated.length > 0
          ? rated.reduce((a, b) => (b.rate < a.rate ? b : a)).name
          : "—";

      const missedLast7 = last7.days - last7.done;
      const worstDayRate =
        rated.find((day) => day.name === worstWeekday)?.rate ?? 100;

      const riskPercent = clamp(
        0.5 * (100 - recentRate) +
          8 * Math.max(0, missedLast7) +
          (momentumDelta < -5 ? 15 : 0),
        2,
        95,
      );

      const confidencePercent = clamp(
        40 + last28.days * 1.5 + logs.length,
        35,
        92,
      );

      const timeDistribution = await computeTimeDistribution(logs);

      const reasons: string[] = [
        `Completed ${last28.done}/${last28.days} days over the last 4 weeks (${overall.toFixed(0)}%).`,
      ];

      if (momentumDelta < -5) {
        reasons.push(
          `Momentum is dropping: ${previousRate.toFixed(0)}% → ${recentRate.toFixed(0)}% week-over-week.`,
        );
      } else if (momentumDelta > 5) {
        reasons.push(
          `Momentum is rising: ${previousRate.toFixed(0)}% → ${recentRate.toFixed(0)}% week-over-week.`,
        );
      }

      if (worstDayRate < 50) {
        reasons.push(
          `${worstWeekday}s are the weakest slot at ${worstDayRate.toFixed(0)}% completion.`,
        );
      }

      if (missedLast7 > 0) {
        reasons.push(`${missedLast7} miss(es) in the last 7 days.`);
      }

      perHabit.push({
        id: String(row.id),
        name: row.name,
        streak: Number(row.streak ?? 0),
        risk: {
          riskPercent,
          confidencePercent,
          reasons,
          recommendation:
            riskPercent > 50
              ? `Anchor "${row.name}" to your most active daytime window and pre-commit a minimum viable session for ${worstWeekday}s.`
              : `Keep the current cadence for "${row.name}"; protect the streak with a fallback micro-session on low-energy days.`,
          successProbability: clamp(100 - riskPercent + Math.min(Number(row.streak ?? 0), 10)),
        },
        patterns: {
          overallCompletion: clamp(overall),
          bestWeekday,
          worstWeekday,
          consistencyScore: clamp(overall * 0.6 + recentRate * 0.4),
          momentum:
            momentumDelta > 5
              ? "Increasing"
              : momentumDelta < -5
                ? "Decreasing"
                : "Stable",
          ...timeDistribution,
        },
      });
    }

    const pendingTasks = tasks.filter(
      (task) => task.status === "pending",
    );
    const overdueTasks = pendingTasks.filter(
      (task) => new Date(task.date) < new Date(`${today}T23:59:59`),
    );
    const taskCompletion = tasks.length
      ? ((tasks.length - pendingTasks.length) / tasks.length) * 100
      : 0;

    const consistency = clamp(
      habits.length
        ? consistencySum / habits.length * 0.7 + taskCompletion * 0.3
        : taskCompletion,
    );

    const momentum = habits.length
      ? clamp(momentumSum / habits.length)
      : 0;

    const goalProgress = goals.length
      ? clamp(
          goals.reduce(
            (sum, goal) => sum + Number(goal.progress ?? 0),
            0,
          ) / goals.length,
        )
      : 0;

    const recentMoods = (moods ?? []).slice(0, 7);
    const avgMoodScore = recentMoods.length
      ? recentMoods.reduce(
          (sum, mood) => sum + Number(mood.score ?? 5),
          0,
        ) / recentMoods.length
      : null;

    const focusRows = await piggyStore.all<{
      minutes: number;
      date: string;
    }>(
      "SELECT minutes, date FROM piggy_focus_log WHERE date >= $1 ORDER BY date DESC",
      [shiftDate(today, -6)],
    );

    const focusMinutes7d = focusRows.reduce(
      (sum, row) => sum + Number(row.minutes ?? 0),
      0,
    );

    const burnoutRisk = clamp(
      overdueTasks.length * 6 +
        (avgMoodScore !== null ? (5 - avgMoodScore) * 6 : 0) +
        (focusMinutes7d > 1500 ? 20 : 0) +
        (consistency < 50 ? 10 : 0),
      3,
      90,
    );

    const healthScore = clamp(
      consistency * 0.45 +
        goalProgress * 0.2 +
        (avgMoodScore !== null ? avgMoodScore * 10 : 50) * 0.2 +
        Math.min(taskCompletion, 100) * 0.15,
    );

    const energyData = await this.computeEnergyData();

    return {
      cockpit: {
        healthScore,
        consistency,
        momentum,
        goalProgress,
        burnoutRisk,
        energyData,
      },
      habitsData: perHabit,
      correlations: await this.getCorrelations(habits as HabitRow[], moods ?? []),
      achievements: await this.getAchievements(consistency),
      deadlines: await this.getDeadlines(tasks, goals),
      aiMemory: await piggyMemory.list(),
      recommendationsFeedback: await piggyStore.all(
        "SELECT * FROM piggy_suggestion_feedback ORDER BY created_at DESC LIMIT 50",
      ),
      dataQuality: {
        habitsTracked: habits.length,
        openTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        moodSamples: (moods ?? []).length,
        focusSamples7d: focusRows.length,
      },
    };
  },

  async computeEnergyData() {
    const activity = await activityHoursByDate();

    const windows = [
      { key: "earlyMorning", label: "5:00 AM - 8:00 AM", min: 5, max: 7 },
      { key: "morning", label: "8:00 AM - 12:00 PM", min: 8, max: 11 },
      { key: "afternoon", label: "12:00 PM - 5:00 PM", min: 12, max: 16 },
      { key: "evening", label: "5:00 PM - 10:00 PM", min: 17, max: 21 },
      { key: "night", label: "10:00 PM - 1:00 AM", min: 22, max: 24 },
    ];

    const counts = windows.map((window) => {
      let total = 0;

      for (const hours of activity.values()) {
        for (const hour of hours) {
          const normalized = window.max === 24 && hour === 0 ? 24 : hour;
          if (normalized >= window.min && normalized <= window.max) {
            total += 1;
          }
        }
      }

      return { ...window, total };
    });

    const active = counts.filter((window) => window.total > 0);

    if (active.length === 0) {
      return {
        peakWindow: null,
        leastProductiveWindow: null,
        deepWorkWindow: null,
        bestStudyDuration: 0,
      };
    }

    const peak = active.reduce((a, b) => (b.total > a.total ? b : a));
    const least = active.reduce((a, b) =>
      b.total < a.total ? b : a,
    );

    const eveningish = active.filter(
      (window) => window.key === "evening" || window.key === "night",
    );

    const deepWork =
      eveningish.length > 0
        ? eveningish.reduce((a, b) => (b.total > a.total ? b : a))
        : peak;

    const focusRows = await piggyStore.all<{ minutes: number }>(
      "SELECT minutes FROM piggy_focus_log WHERE minutes IS NOT NULL ORDER BY created_at DESC LIMIT 30",
    );

    const durations = focusRows.map((row) => Number(row.minutes));

    return {
      peakWindow: peak.label,
      leastProductiveWindow: least.label,
      deepWorkWindow: deepWork.label,
      bestStudyDuration: durations.length
        ? median(durations)
        : 0,
    };
  },

  async getCorrelations(
    habits: HabitRow[],
    moods: { mood: string; score: number; loggedAt: Date }[],
  ): Promise<{ cause: string; effect: string; change: number }[]> {
    const correlations: {
      cause: string;
      effect: string;
      change: number;
    }[] = [];

    if (habits.length >= 2) {
      const sorted = [...habits].sort(
        (a, b) => Number(b.streak ?? 0) - Number(a.streak ?? 0),
      );
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];

      correlations.push({
        cause: `${top.name} streak of ${top.streak} days`,
        effect: `highest routine reliability in your system`,
        change: clamp(Number(top.streak ?? 0) * 4, 1, 60),
      });

      if (bottom.id !== top.id) {
        correlations.push({
          cause: `${bottom.name} skipped days`,
          effect: `dragging aggregate consistency down`,
          change: -clamp(
            Number(bottom.streak ?? 0) === 0 ? 18 : 10,
            1,
            40,
          ),
        });
      }
    }

    if (moods.length >= 3) {
      const high = moods.filter((mood) => Number(mood.score) >= 4);
      const low = moods.filter((mood) => Number(mood.score) < 4);

      if (high.length && low.length) {
        const delta = clamp(
          ((high.length - low.length) /
            (high.length + low.length)) *
            100,
          -50,
          50,
        );

        correlations.push({
          cause: "Positive mood entries",
          effect: "correlate with higher task follow-through",
          change: delta,
        });
      }
    }

    if (correlations.length === 0) {
      correlations.push({
        cause: "Not enough logged history yet",
        effect: "correlations unlock after more daily activity",
        change: 0,
      });
    }

    return correlations.slice(0, 3);
  },

  async getAchievements(currentConsistency: number) {
    const focusStats = await piggyStore.all<{
      distinct_days: string;
      total_minutes: string;
    }>(
      "SELECT count(DISTINCT date)::text AS distinct_days, coalesce(sum(minutes),0)::text AS total_minutes FROM piggy_focus_log",
    );

    const distinctFocusDays = Number(focusStats[0]?.distinct_days ?? 0);
    const totalFocusMinutes = Number(focusStats[0]?.total_minutes ?? 0);

    const budgets = await budgetService.findAll().catch(() => []);
    const expenses = await expenseService.findAll().catch(() => []);

    let budgetCompliant = true;

    for (const budget of budgets) {
      const windowStart =
        budget.period === "weekly"
          ? shiftDate(todayStr(), -6)
          : todayStr().slice(0, 7);

      const spent = expenses
        .filter((expense) => {
          if (expense.category !== budget.category) return false;
          const date = new Date(expense.transactionDate)
            .toISOString()
            .slice(0, 10);
          return budget.period === "weekly"
            ? date >= windowStart
            : date.startsWith(windowStart);
        })
        .reduce(
          (sum, expense) => sum + Number(expense.amount ?? 0),
          0,
        );

      if (spent > Number(budget.limitAmount ?? 0)) {
        budgetCompliant = false;
        break;
      }
    }

    return [
      {
        id: "30_day_reader",
        unlocked: distinctFocusDays >= 30,
        title: "Protocol Sage",
        desc: "Maintain 30 consecutive days of focus logs.",
        progress: { current: distinctFocusDays, target: 30 },
      },
      {
        id: "consistency_master",
        unlocked: currentConsistency >= 90,
        title: "Momentum Architect",
        desc: "Reach a habit consistency index exceeding 90%.",
        progress: {
          current: Math.round(currentConsistency),
          target: 90,
        },
      },
      {
        id: "deep_work_50",
        unlocked: totalFocusMinutes >= 3000,
        title: "Chronos Voyager",
        desc: "Log 50 cumulative hours of deep focus.",
        progress: {
          current: Math.round(totalFocusMinutes / 60),
          target: 50,
        },
      },
      {
        id: "expense_saver",
        unlocked: budgetCompliant && budgets.length > 0,
        title: "Vault Guardian",
        desc: "Stay strictly within all budget allocation limits.",
        progress: {
          current: budgetCompliant ? budgets.length : Math.max(0, budgets.length - 1),
          target: budgets.length,
        },
      },
    ];
  },

  async getDeadlines(tasks: Awaited<ReturnType<typeof taskService.getTasks>>, goals: Awaited<ReturnType<typeof goalService.findAll>>) {
    const today = todayStr();
    const horizon = shiftDate(today, 21);

    const items: {
      title: string;
      dueDate: string;
      type: string;
      daysLeft: number;
    }[] = [];

    for (const goal of goals) {
      if (!goal.targetDate || goal.status !== "active") continue;
      if (goal.targetDate < today || goal.targetDate > horizon) continue;

      items.push({
        title: goal.title,
        dueDate: goal.targetDate,
        type: "goal",
        daysLeft: Math.max(
          0,
          Math.round(
            (new Date(`${goal.targetDate}T00:00:00`).getTime() -
              new Date(`${today}T00:00:00`).getTime()) /
              86400000,
          ),
        ),
      });
    }

    for (const task of tasks) {
      if (task.status !== "pending") continue;
      const date = new Date(task.date).toISOString().slice(0, 10);
      if (date < today || date > horizon) continue;

      items.push({
        title: task.title,
        dueDate: date,
        type: "task",
        daysLeft: Math.max(
          0,
          Math.round(
            (new Date(`${date}T00:00:00`).getTime() -
              new Date(`${today}T00:00:00`).getTime()) /
              86400000,
          ),
        ),
      });
    }

    return items.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 6);
  },

  async getCoachingData() {
    const review = await analyticsService.getWeeklyReview();
    const summary = await analyticsService.getHabitSummary(28);

    const entries = [...(summary.habits ?? [])].sort(
      (a, b) =>
        Number(b.completionRate ?? 0) - Number(a.completionRate ?? 0),
    );

    const bestHabit = entries[0];
    const weakestHabit = entries[entries.length - 1];

    const monthlyTrends: { month: string; completion: number }[] = [];
    const now = new Date();

    for (let offset = 4; offset >= 0; offset -= 1) {
      const monthDate = new Date(
        now.getFullYear(),
        now.getMonth() - offset,
        1,
      );
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

      const habits = await habitService.getHabits();

      let done = 0;
      let possible = 0;
      const daysInMonth = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
      ).getDate();

      for (const raw of habits) {
        const logs = habitLogs(raw as HabitRow).filter((log) =>
          log.startsWith(monthKey),
        );
        done += logs.length;

        const isCurrentMonth = offset === 0;
        const effectiveDays = isCurrentMonth
          ? now.getDate()
          : daysInMonth;
        possible += effectiveDays;
      }

      monthlyTrends.push({
        month:
          offset === 0
            ? `Current (${monthDate.toLocaleString("en-US", { month: "short" })})`
            : monthDate.toLocaleString("en-US", { month: "long" }),
        completion: possible ? Math.round((done / possible) * 100) : 0,
      });
    }

    const first = monthlyTrends[0]?.completion ?? 0;
    const last =
      monthlyTrends[monthlyTrends.length - 1]?.completion ?? 0;
    const trendDelta = last - first;

    return {
      weeklyCoach: {
        completionRate: clamp(Number(review.habitConsistency ?? 0)),
        bestHabit: bestHabit?.name ?? "No habits tracked yet",
        weakestHabit:
          entries.length > 1
            ? (weakestHabit?.name ?? "—")
            : "Not enough routines to compare",
        mostImproved:
          trendDelta > 0
            ? `Overall consistency (+${trendDelta}% vs 4 months ago)`
            : "No clear improver this period",
        wins:
          bestHabit && Number(bestHabit.completionRate) > 0
            ? `"${bestHabit.name}" leads all routines at ${(Number(bestHabit.completionRate) * 100).toFixed(0)}% completion over the last 4 weeks.`
            : "Log habit completions to unlock performance wins.",
        watchOut:
          Number(review.tasksSkipped ?? 0) > 0 ||
          Number(review.tasksCompleted ?? 0) === 0
            ? `Task slippage detected (${review.tasksSkipped ?? 0} skipped, ${review.tasksCompleted ?? 0} completed this week).`
            : "Task execution held steady this week; keep the deferral rate at zero.",
        recommendedFocus: `Aim your next sprint at "${weakestHabit?.name ?? "your top goal"}"; it has the lowest completion in the current window.`,
      },
      monthlyTrends,
    };
  },

  async getReflections() {
    return piggyStore.all(
      "SELECT * FROM piggy_reflection ORDER BY date DESC LIMIT 60",
    );
  },

  async generateTodayReflection() {
    const today = todayStr();

    const existing = await piggyStore.all(
      "SELECT * FROM piggy_reflection WHERE date = $1",
      [today],
    );

    if (existing.length > 0) {
      return existing[0];
    }

    const habits = await habitService.getHabits();
    const moods = await moodService.getMoods();
    const focusToday = await piggyStore.all<{ minutes: number }>(
      "SELECT coalesce(sum(minutes),0)::int AS minutes FROM piggy_focus_log WHERE date = $1",
      [today],
    );

    const completedHabits = habits.filter((raw) =>
      habitLogs(raw as HabitRow).includes(today),
    );

    const missedHabits = habits.filter(
      (raw) => !habitLogs(raw as HabitRow).includes(today),
    );

    const latestMood = (moods ?? [])[0];
    const focusMinutes = Number(focusToday[0]?.minutes ?? 0);

    const parts: string[] = [];

    if (completedHabits.length === habits.length && habits.length > 0) {
      parts.push("Flawless sweep — every habit executed on schedule.");
    } else {
      parts.push(
        `${completedHabits.length}/${habits.length} habits closed out today.`,
      );
    }

    if (completedHabits.length > 0) {
      parts.push(
        `Strongest execution: ${completedHabits.map((habit) => (habit as HabitRow).name).join(", ")}.`,
      );
    }

    if (missedHabits.length > 0) {
      parts.push(
        `Open gaps for tomorrow: ${missedHabits.map((habit) => (habit as HabitRow).name).join(", ")}.`,
      );
    }

    if (latestMood) {
      parts.push(`Logged state: ${latestMood.mood} (score ${latestMood.score}).`);
    }

    parts.push(`Deep focus banked: ${focusMinutes} minutes.`);

    await piggyStore.run(
      `INSERT INTO piggy_reflection
         (date, timestamp, completed_habits_count, total_habits_count, mood, focus_minutes, reflection_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (date) DO UPDATE SET
         timestamp = EXCLUDED.timestamp,
         completed_habits_count = EXCLUDED.completed_habits_count,
         total_habits_count = EXCLUDED.total_habits_count,
         mood = EXCLUDED.mood,
         focus_minutes = EXCLUDED.focus_minutes,
         reflection_text = EXCLUDED.reflection_text`,
      [
        today,
        Date.now(),
        completedHabits.length,
        habits.length,
        latestMood?.mood ?? "unlogged",
        focusMinutes,
        parts.join(" "),
      ],
    );

    const saved = await piggyStore.all(
      "SELECT * FROM piggy_reflection WHERE date = $1",
      [today],
    );

    return saved[0];
  },
};

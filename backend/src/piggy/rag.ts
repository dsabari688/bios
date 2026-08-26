import { habitService } from "../modules/habits/habit.service.js";
import { taskService } from "../modules/tasks/task.service.js";
import { goalService } from "../modules/goals/goal.service.js";
import { expenseService } from "../modules/expenses/expense.service.js";
import { moodService } from "../modules/moods/mood.service.js";
import { analyticsService } from "../modules/analytics/analytics.service.js";

export interface RetrievedContext {
  source: string;
  content: string;
}

type SourceKey =
  | "habits"
  | "tasks"
  | "goals"
  | "expenses"
  | "moods"
  | "analytics";

const SOURCE_KEYWORDS: Record<SourceKey, string[]> = {
  habits: [
    "habit", "streak", "consistency", "routine", "morning",
    "gym", "cardio", "water", "reading", "skip",
  ],
  tasks: [
    "task", "mission", "todo", "due", "today", "tomorrow",
    "pending", "complete", "defer", "schedule", "deadline",
  ],
  goals: [
    "goal", "objective", "vault", "milestone", "progress",
    "target", "aim",
  ],
  expenses: [
    "expense", "spend", "spent", "budget", "money", "cost",
    "rupees", "rs", "financial", "savings",
  ],
  moods: [
    "mood", "feel", "feeling", "stress", "energy", "burnout",
    "mental", "sleep",
  ],
  analytics: [
    "review", "week", "weekly", "analytics", "summary",
    "performance", "report", "consistent", "trend", "focus",
  ],
};

function selectSources(query: string): SourceKey[] {
  const lower = query.toLowerCase();
  const matches = new Set<SourceKey>();

  for (const [source, keywords] of Object.entries(
    SOURCE_KEYWORDS,
  ) as [SourceKey, string[]][]) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        matches.add(source);
        break;
      }
    }
  }

  if (matches.size === 0) {
    return ["tasks", "habits", "goals"];
  }

  return [...matches];
}

export const piggyRag = {
  async retrieve(query: string): Promise<RetrievedContext[]> {
    const sources = selectSources(query);
    const results: RetrievedContext[] = [];

    for (const source of sources) {
      try {
        const content = await retrieveSource(source);
        if (content) {
          results.push({ source, content });
        }
      } catch (error) {
        console.error(
          `[piggy][rag] source ${source} failed:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    return results;
  },
};

async function retrieveSource(
  source: SourceKey,
): Promise<string> {
  switch (source) {
    case "habits": {
      const habits = await habitService.getHabits();
      if (habits.length === 0) return "";
      return habits
        .map((habit) => {
          const logs = Array.isArray(habit.logs)
            ? (habit.logs as string[])
            : [];
          const recent = logs.slice(-7).join(", ") || "none";
          return `- [id=${habit.id}] ${habit.name}: streak ${habit.streak}, last completions [${recent}]`;
        })
        .join("\n");
    }

    case "tasks": {
      const tasks = await taskService.getTasks();
      if (tasks.length === 0) return "";
      return tasks
        .slice(0, 20)
        .map((task) => {
          return `- [id=${task.id}] [${task.status}] ${task.title} (date ${new Date(task.date).toISOString().slice(0, 10)}, priority ${task.category})`;
        })
        .join("\n");
    }

    case "goals": {
      const goals = await goalService.findAll();
      if (goals.length === 0) return "";
      return goals
        .map((goal) => {
          return `- [id=${goal.id}] ${goal.title}: ${goal.progress}% (${goal.status}${goal.targetDate ? `, target ${goal.targetDate}` : ""})`;
        })
        .join("\n");
    }

    case "expenses": {
      const expenses = await expenseService.findAll();
      if (expenses.length === 0) return "";
      const total = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount ?? 0),
        0,
      );
      const recent = expenses
        .slice(0, 8)
        .map(
          (expense) =>
            `- [id=${expense.id}] ${expense.category}: ${expense.amount} (${expense.description || "no note"}, ${new Date(expense.transactionDate).toISOString().slice(0, 10)})`,
        )
        .join("\n");
      return `Total logged: ${total}\n${recent}`;
    }

    case "moods": {
      const moods = await moodService.getMoods();
      if (!moods || moods.length === 0) return "";
      return moods
        .slice(0, 10)
        .map((mood) => {
          const at = new Date(mood.loggedAt).toISOString();
          return `- [id=${mood.id}] ${mood.mood} (score ${mood.score}) at ${at}`;
        })
        .join("\n");
    }

    case "analytics": {
      const review = await analyticsService.getWeeklyReview();
      return JSON.stringify(review).slice(0, 1200);
    }

    default:
      return "";
  }
}

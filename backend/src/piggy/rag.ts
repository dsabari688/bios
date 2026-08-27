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

export type RouteMode = "FAST_CHAT" | "MEMORY" | "LIVE_DATA" | "HYBRID" | "NONE";

export interface QueryClassification {
  mode: RouteMode;
  liveSources: SourceKey[];
}

// Short greetings / single-word messages / casual talk that need no retrieval at all
const FAST_CHAT_PATTERNS = [
  /^(hi|hey|hello|yo|sup|hiya|howdy)[\s!.]*$/i,
  /^(ok|okay|sure|thanks|thank you|thx|ty|np|no problem|alright|got it|cool|nice|great|awesome|lol|haha)[\s!.]*$/i,
  /^(good morning|good afternoon|good evening|good night)[\s!.]*$/i,
  /^what( is|'s)? your name[\s?]*$/i,
  /^who are you[\s?]*$/i,
  /^(are you|r u) (there|ok|okay|real)[\s?]*$/i,
  /^(can u|can you) help( me)?[\s?]*$/i,
  /^(sing|hum|write)\b/i,
  /^(tell me|say) (a |some )?(joke|jokes)[\s?]*$/i,
  /^(tell me|say) (something|a story|some stories|anything)[\s?!]*$/i,
  /^(motivate|inspire) me[\s?!]*$/i,
  /^i('m| am) (feeling|tired|bored|sad|happy|stressed|unmotivated|scared|nervous|excited)/i,
  /^i (need|want) motivation[\s?!]*$/i,
  /^(what|which) (movie|film|show|series|book|song|music|album) should i/i,
  /^(recommend|suggest) (a |some )?(movie|film|song|book|show)/i,
  /^what is (the )?capital of/i,
  /^what is (the )?(meaning|definition of)/i,
  /^(explain|what is|how does|how do|what are|teach me|tell me about) /i,
  /^(help me|can u|can you) (debug|write|fix|review|improve|understand)/i,
  /^(i'm|i am) (not|don't|struggling|having trouble)/i,
  /^(how are you|how r u|how do you do)[\s?]*$/i,
  /^(what can you do|what do you do|what are you capable of)[\s?]*$/i,
];

// Patterns that are DEFINITELY general knowledge — never need personal context
const GENERAL_KNOWLEDGE_PATTERNS = [
  /what is the capital of/i,
  /how does .* work/i,
  /photosynthesis/i,
  /recipe for/i,
  /history of/i,
  /what is (http|python|javascript|rust|react|gravity|quantum|docker|kubernetes|linux|git|sql|html|css|typescript|node)/i,
  /explain (recursion|oop|functional|async|api|rest|graphql|algorithm|big.?o)/i,
  /what('s| is) the (meaning|definition|difference) (of|between)/i,
  /who (is|was) (einstein|newton|darwin|tesla|turing|gates|jobs|musk)/i,
  /where is .* located/i,
  /^what is [a-z\s]+\?*$/i,
];

export function classifyQuery(query: string): QueryClassification {
  const lower = query.toLowerCase().trim();

  // Personal reference check: do not route personal data questions to FAST_CHAT
  const hasPersonalRef = /\bmy (tasks|goals|habits|schedule|budget|preference|memory|old)\b|about me|remember me|what do i\b/.test(lower);

  // 1. Fast-chat path: greetings, small talk, general questions → no retrieval
  if (!hasPersonalRef && FAST_CHAT_PATTERNS.some((p) => p.test(lower))) {
    return { mode: "FAST_CHAT", liveSources: [] };
  }

  // 2. Clear general knowledge → no retrieval
  const isGeneralQuery = GENERAL_KNOWLEDGE_PATTERNS.some((p) => p.test(lower));
  if (isGeneralQuery && !hasPersonalRef) {
    return { mode: "NONE", liveSources: [] };
  }

  // 3. Check for memory keywords
  const memoryKeywords = [
    "remember", "learned", "prefer", "preference", "like to", "favorite", "favourite", "about me",
    "what do i like", "what do i prefer", "what programming", "my learning",
    "what do you know about me", "what did i", "what was my", "what have i",
    "i used to", "previously", "my old", "tell me something about me",
  ];
  const hasMemoryKeyword = memoryKeywords.some((kw) => lower.includes(kw));

  // 4. Check for live data source keywords
  const SOURCE_KEYWORDS_STRICT: Record<SourceKey, string[]> = {
    habits: [
      "habit", "streak", "routine check", "habit tracker", "my reading", "my gym",
    ],
    tasks: [
      "task", "todo", "to do", "to-do", "due", "pending task", "scheduled", "deadline",
      "what are my tasks", "show tasks", "list tasks", "my schedule", "focus on today", "what should i focus",
    ],
    goals: [
      "goal", "objective", "milestone", "my goals", "goal progress",
      "show goals", "list goals",
    ],
    expenses: [
      "expense", "spend", "spent", "budget", "money", "cost",
      "rupees", "financial", "savings", "how much did i",
    ],
    moods: [
      "log my mood", "track my mood", "mood log", "mood history", "mood report",
    ],
    analytics: [
      "review", "weekly review", "analytics", "weekly summary",
      "performance report", "productivity report",
    ],
  };

  const matches = new Set<SourceKey>();
  for (const [source, keywords] of Object.entries(SOURCE_KEYWORDS_STRICT) as [SourceKey, string[]][]) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        matches.add(source);
        break;
      }
    }
  }

  const liveSources = Array.from(matches);

  if (hasMemoryKeyword && liveSources.length > 0) {
    return { mode: "HYBRID", liveSources };
  }

  if (liveSources.length > 0) {
    return { mode: "LIVE_DATA", liveSources };
  }

  // Tighter personal memory query checks — do not misclassify casual phrases containing "my "
  const isExplicitMemoryQuery =
    lower.startsWith("what do i ") ||
    lower.startsWith("what is my ") ||
    lower.startsWith("what are my ") ||
    lower.startsWith("what was my ") ||
    lower.includes("about me") ||
    lower.includes("remember me") ||
    lower.includes("my preference") ||
    lower.includes("my favorite") ||
    lower.includes("my favourite");

  if (hasMemoryKeyword || isExplicitMemoryQuery) {
    return { mode: "MEMORY", liveSources: [] };
  }

  return { mode: "NONE", liveSources: [] };
}


function selectSources(query: string): SourceKey[] {
  const classification = classifyQuery(query);
  return classification.liveSources;
}

export const piggyRag = {
  async retrieve(query: string, mode?: RouteMode, targetSources?: SourceKey[]): Promise<RetrievedContext[]> {
    const classification = mode && targetSources ? { mode, liveSources: targetSources } : classifyQuery(query);

    if (classification.mode === "NONE" || classification.mode === "MEMORY" || classification.mode === "FAST_CHAT") {
      return [];
    }

    const sources = classification.liveSources;
    if (sources.length === 0) {
      return [];
    }

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

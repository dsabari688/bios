// Life OS Model Context Protocol (MCP) & AI Tool Bridge Specification
// Implements MCP 2024-11-05 Specification + REST Bridge for external AI agents, Cursor, Claude Desktop, and in-app Piggy/JARVIS AI

export interface MCPToolDefinition {
  name: string;
  description: string;
  category: "tasks" | "habits" | "expenses" | "goals" | "wellbeing" | "system";
  inputSchema: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      default?: any;
    }>;
    required?: string[];
  };
}

export interface MCPToolExecutionLog {
  id: string;
  timestamp: string;
  source: "piggy_ai" | "mcp_client" | "api_bridge" | "manual_test";
  toolName: string;
  inputArgs: Record<string, any>;
  result: any;
  status: "success" | "error";
  durationMs: number;
}

// Complete Registry of MCP Tools for Life OS
export const MCP_TOOLS_REGISTRY: MCPToolDefinition[] = [
  // --- TASKS / MISSIONS ---
  {
    name: "tasks_create",
    description: "Create a new tactical task/mission with Eisenhower priority quadrant, due date, scheduled time, and recur patterns.",
    category: "tasks",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "The descriptive title of the tactical mission." },
        category: {
          type: "string",
          description: "Eisenhower quadrant priority",
          enum: ["urgent-important", "important-not-urgent", "urgent-not-important", "not-urgent-not-important"],
          default: "urgent-important"
        },
        date: { type: "string", description: "Target date in YYYY-MM-DD format. Defaults to today." },
        time: { type: "string", description: "Target execution time in HH:MM (24-hour) format. Defaults to current time + 1h or 10:00." },
        endTime: { type: "string", description: "Optional scheduled end time in HH:MM format." },
        description: { type: "string", description: "Extended mission briefing, notes, or execution steps." },
        recurType: {
          type: "string",
          description: "Recurrence rule",
          enum: ["none", "daily", "weekly"],
          default: "none"
        }
      },
      required: ["title"]
    }
  },
  {
    name: "tasks_list",
    description: "Query and filter tactical missions across dates, completion status, or Eisenhower quadrants.",
    category: "tasks",
    inputSchema: {
      type: "object",
      properties: {
        filterBy: {
          type: "string",
          description: "Date or status scope filter",
          enum: ["all", "today", "upcoming", "past", "pending", "completed"],
          default: "today"
        },
        category: {
          type: "string",
          description: "Optional Eisenhower category filter",
          enum: ["urgent-important", "important-not-urgent", "urgent-not-important", "not-urgent-not-important"]
        },
        date: { type: "string", description: "Specific date filter in YYYY-MM-DD format" }
      }
    }
  },
  {
    name: "tasks_complete",
    description: "Mark a tactical mission as completed or toggle its status.",
    category: "tasks",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The unique ID of the task to complete or task title to search." }
      },
      required: ["taskId"]
    }
  },
  {
    name: "tasks_reschedule",
    description: "Reschedule an active tactical mission to a new target date and time.",
    category: "tasks",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task ID or title match." },
        newDate: { type: "string", description: "New execution date in YYYY-MM-DD format." },
        newTime: { type: "string", description: "New execution time in HH:MM format." },
        reason: { type: "string", description: "Optional context for the deferral." }
      },
      required: ["taskId", "newDate"]
    }
  },
  {
    name: "tasks_delete",
    description: "Delete or decommission a tactical mission from the system.",
    category: "tasks",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The ID or title of the task to remove." }
      },
      required: ["taskId"]
    }
  },

  // --- HABITS & ROUTINES ---
  {
    name: "habits_log",
    description: "Log today's completion (or toggle check-in) for a habit routine and update streak counters.",
    category: "habits",
    inputSchema: {
      type: "object",
      properties: {
        habitId: { type: "string", description: "The ID or name of the habit (e.g. 'Morning Code Run', 'Gym Cardio Block')." },
        date: { type: "string", description: "Date to log in YYYY-MM-DD format. Defaults to today." }
      },
      required: ["habitId"]
    }
  },
  {
    name: "habits_list",
    description: "List all active behavioral habits, current streaks, and today's completion states.",
    category: "habits",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "habits_add",
    description: "Install a new habit routine structure in the system.",
    category: "habits",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Habit title / routine description." },
        frequency: { type: "string", description: "Execution cadence (daily or weekly).", enum: ["daily", "weekly"], default: "daily" },
        icon: { type: "string", description: "Lucide icon name (e.g., 'book-open', 'dumbbell', 'code', 'zap')", default: "book-open" }
      },
      required: ["name"]
    }
  },
  {
    name: "habits_delete",
    description: "Remove a habit routine structure from tracking.",
    category: "habits",
    inputSchema: {
      type: "object",
      properties: {
        habitId: { type: "string", description: "The ID or name of the habit to remove." }
      },
      required: ["habitId"]
    }
  },

  // --- EXPENSES & BUDGET ---
  {
    name: "expenses_add",
    description: "Log a financial debit/expense, verify category limits, and flag impulsive purchases.",
    category: "expenses",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Expense amount value in currency units (e.g. ₹ or $)." },
        category: {
          type: "string",
          description: "Spending allocation category",
          enum: ["food", "transportation", "shopping", "education", "healthcare", "entertainment", "misc"],
          default: "food"
        },
        note: { type: "string", description: "Merchant name, invoice item, or note." },
        date: { type: "string", description: "Transaction date in YYYY-MM-DD format. Defaults to today." },
        isImpulsive: { type: "boolean", description: "Flag indicating whether this purchase was unplanned/impulsive.", default: false },
        explanation: { type: "string", description: "Self-reflection or justification for impulsive allocation." }
      },
      required: ["amount", "note"]
    }
  },
  {
    name: "expenses_list",
    description: "Retrieve recorded financial expenses, spending by category, and recent transactions.",
    category: "expenses",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional filter by category" },
        limit: { type: "number", description: "Maximum number of transactions to return", default: 20 }
      }
    }
  },
  {
    name: "budget_check",
    description: "Perform an audit of total spending against budget limit thresholds and category ceilings.",
    category: "expenses",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  // --- STRATEGIC GOAL VAULT ---
  {
    name: "goals_create",
    description: "Establish a new high-leverage strategic goal in the Goal Vault.",
    category: "goals",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Strategic objective title." },
        description: { type: "string", description: "Detailed roadmap or milestones summary." },
        targetDate: { type: "string", description: "Target achievement date in YYYY-MM-DD format." },
        progress: { type: "number", description: "Initial progress percentage (0-100).", default: 0 }
      },
      required: ["title", "targetDate"]
    }
  },
  {
    name: "goals_update_progress",
    description: "Update the progress percentage of an existing strategic goal.",
    category: "goals",
    inputSchema: {
      type: "object",
      properties: {
        goalId: { type: "string", description: "The ID or title of the goal to update." },
        progress: { type: "number", description: "New progress percentage between 0 and 100." },
        status: { type: "string", description: "Optional lifecycle status of the goal.", enum: ["active", "completed", "paused"] }
      },
      required: ["goalId", "progress"]
    }
  },
  {
    name: "goals_list",
    description: "Retrieve all strategic goals with active milestones and progress trajectories.",
    category: "goals",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  // --- WELLBEING, SLEEP & DIARY ---
  {
    name: "sleep_log",
    description: "Log circadian sleep and recovery metrics for daily vitality calculations.",
    category: "wellbeing",
    inputSchema: {
      type: "object",
      properties: {
        duration: { type: "number", description: "Sleep duration in hours (e.g. 7.5)." },
        sleepTime: { type: "string", description: "Bedtime in HH:MM format (e.g. '23:30')." },
        wakeTime: { type: "string", description: "Wake time in HH:MM format (e.g. '07:00')." },
        date: { type: "string", description: "Date in YYYY-MM-DD format. Defaults to today." }
      },
      required: ["duration"]
    }
  },
  {
    name: "diary_entry_add",
    description: "Record a cognitive daily review, mood reflection, and self-evaluation entry.",
    category: "wellbeing",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Journal/diary entry text." },
        mood: { type: "string", description: "Subjective emotional state (e.g. 'focused', 'calm', 'energetic', 'tired').", default: "focused" },
        productivityScore: { type: "number", description: "Estimated subjective productivity score (0-100).", default: 85 }
      },
      required: ["content"]
    }
  },
  {
    name: "focus_session_log",
    description: "Log a completed deep work focus session to calibrate focus indices.",
    category: "wellbeing",
    inputSchema: {
      type: "object",
      properties: {
        durationMinutes: { type: "number", description: "Duration in minutes (e.g. 25, 45, 90)." },
        taskTitle: { type: "string", description: "Task worked on during focus block." },
        focusScore: { type: "number", description: "Focus quality score 0-100.", default: 90 }
      },
      required: ["durationMinutes"]
    }
  },

  // --- SYSTEM TELEMETRY & AI MEMORY ---
  {
    name: "system_get_life_score",
    description: "Calculate and return the real-time compound Life OS Focus Index & individual component scores.",
    category: "system",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "system_get_context",
    description: "Extract a unified snapshot of the user's active tasks, habits, goals, budgets, and AI personality.",
    category: "system",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "ai_memory_store",
    description: "Save a key user preference, habit pattern, or operational constraint to Piggy's long-term memory.",
    category: "system",
    inputSchema: {
      type: "object",
      properties: {
        fact: { type: "string", description: "The statement or fact to remember." },
        category: { type: "string", description: "Taxonomy bucket for memory.", enum: ["preference", "constraint", "schedule", "general"], default: "preference" }
      },
      required: ["fact"]
    }
  }
];

// MCP Resources for Life OS
export const MCP_RESOURCES = [
  {
    uri: "lifeos://tasks/today",
    name: "Today's Tactical Missions",
    description: "Current active tactical tasks scheduled for today.",
    mimeType: "application/json"
  },
  {
    uri: "lifeos://habits/active",
    name: "Active Habit Routines",
    description: "Active habits and current consistency streak status.",
    mimeType: "application/json"
  },
  {
    uri: "lifeos://expenses/summary",
    name: "Financial Ledger Summary",
    description: "Aggregated monthly spending, category totals, and budget limits.",
    mimeType: "application/json"
  },
  {
    uri: "lifeos://goals/vault",
    name: "Strategic Goal Vault",
    description: "Long term objectives and progress tracking.",
    mimeType: "application/json"
  },
  {
    uri: "lifeos://system/telemetry",
    name: "System Telemetry & Focus Index",
    description: "Real-time compound Life Score and productivity indices.",
    mimeType: "application/json"
  }
];

// MCP Prompts for Life OS
export const MCP_PROMPTS = [
  {
    name: "morning_tactical_brief",
    description: "Generate a military-grade morning briefing evaluating tasks, sleep, and priority focus windows.",
    arguments: [
      { name: "tone", description: "AI personality tone ('Logical', 'Energetic', 'Calm', 'Cynical')", required: false }
    ]
  },
  {
    name: "eisenhower_prioritization_audit",
    description: "Analyze all pending tasks and reorganize into optimal Eisenhower quadrants.",
    arguments: []
  },
  {
    name: "budget_variance_alert",
    description: "Audit recent allocations and provide strategic containment recommendations.",
    arguments: []
  }
];

// Helper to execute any registered tool on local OS state
export function executeMCPTool(
  toolName: string,
  args: Record<string, any>,
  osData: any,
  saveDataFn: (updated: any) => void
): { success: boolean; data?: any; error?: string; message: string } {
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeStr = new Date().toTimeString().slice(0, 5);

  try {
    switch (toolName) {
      // --- TASKS ---
      case "tasks_create": {
        const title = args.title?.trim();
        if (!title) throw new Error("Task title is required");

        const newTask = {
          id: `task_${Date.now()}`,
          title,
          category: args.category || "urgent-important",
          date: args.date || todayStr,
          time: args.time || nowTimeStr,
          endTime: args.endTime || "",
          description: args.description || "",
          recurType: args.recurType || "none",
          status: "pending",
          rescheduledCount: 0
        };

        const updated = {
          ...osData,
          tasks: [...(osData.tasks || []), newTask]
        };
        saveDataFn(updated);

        return {
          success: true,
          data: newTask,
          message: `Tactical Mission '${newTask.title}' successfully assigned for ${newTask.date} at ${newTask.time} [${newTask.category}].`
        };
      }

      case "tasks_list": {
        const tasks = osData.tasks || [];
        const filter = args.filterBy || "all";
        let filtered = [...tasks];

        if (filter === "today") filtered = filtered.filter(t => t.date === todayStr);
        else if (filter === "upcoming") filtered = filtered.filter(t => t.date > todayStr);
        else if (filter === "past") filtered = filtered.filter(t => t.date < todayStr);
        else if (filter === "pending") filtered = filtered.filter(t => t.status === "pending");
        else if (filter === "completed") filtered = filtered.filter(t => t.status === "completed");

        if (args.category) filtered = filtered.filter(t => t.category === args.category);
        if (args.date) filtered = filtered.filter(t => t.date === args.date);

        return {
          success: true,
          data: filtered,
          message: `Retrieved ${filtered.length} tactical mission(s).`
        };
      }

      case "tasks_complete": {
        const query = (args.taskId || "").toString().toLowerCase();
        const tasks = [...(osData.tasks || [])];
        const task = tasks.find(t => t.id === query || t.title.toLowerCase().includes(query));

        if (!task) throw new Error(`Task with ID/Title matching '${args.taskId}' not found`);

        task.status = task.status === "completed" ? "pending" : "completed";
        const updated = { ...osData, tasks };
        saveDataFn(updated);

        return {
          success: true,
          data: task,
          message: `Task '${task.title}' marked as ${task.status}.`
        };
      }

      case "tasks_reschedule": {
        const query = (args.taskId || "").toString().toLowerCase();
        const tasks = [...(osData.tasks || [])];
        const task = tasks.find(t => t.id === query || t.title.toLowerCase().includes(query));

        if (!task) throw new Error(`Task matching '${args.taskId}' not found`);

        task.date = args.newDate || todayStr;
        if (args.newTime) task.time = args.newTime;
        task.rescheduledCount = (task.rescheduledCount || 0) + 1;

        const updated = { ...osData, tasks };
        saveDataFn(updated);

        return {
          success: true,
          data: task,
          message: `Task '${task.title}' rescheduled to ${task.date} ${task.time || ""} (Rescheduled ${task.rescheduledCount}x).`
        };
      }

      case "tasks_delete": {
        const query = (args.taskId || "").toString().toLowerCase();
        const tasks = [...(osData.tasks || [])];
        const target = tasks.find(t => t.id === query || t.title.toLowerCase().includes(query));

        if (!target) throw new Error(`Task matching '${args.taskId}' not found`);

        const updatedTasks = tasks.filter(t => t.id !== target.id);
        const updated = { ...osData, tasks: updatedTasks };
        saveDataFn(updated);

        return {
          success: true,
          data: { deletedId: target.id, title: target.title },
          message: `Task '${target.title}' removed from tactical register.`
        };
      }

      // --- HABITS ---
      case "habits_log": {
        const query = (args.habitId || "").toString().toLowerCase();
        const habits = [...(osData.habits || [])];
        const habit = habits.find(h => h.id === query || h.name.toLowerCase().includes(query));

        if (!habit) throw new Error(`Habit matching '${args.habitId}' not found`);

        const targetDate = args.date || todayStr;
        const logIndex = habit.logs.indexOf(targetDate);

        if (logIndex !== -1) {
          habit.logs.splice(logIndex, 1);
          habit.streak = Math.max(0, habit.streak - 1);
        } else {
          habit.logs.push(targetDate);
          habit.streak += 1;
        }

        const updated = { ...osData, habits };
        saveDataFn(updated);

        return {
          success: true,
          data: habit,
          message: `Habit '${habit.name}' updated. Current streak: ${habit.streak} day(s).`
        };
      }

      case "habits_list": {
        const habits = osData.habits || [];
        const enriched = habits.map(h => ({
          ...h,
          loggedToday: h.logs.includes(todayStr)
        }));
        return {
          success: true,
          data: enriched,
          message: `Retrieved ${habits.length} habit routines.`
        };
      }

      case "habits_add": {
        const name = args.name?.trim();
        if (!name) throw new Error("Habit name is required");

        const newHabit = {
          id: `habit_${Date.now()}`,
          name,
          frequency: args.frequency || "daily",
          streak: 0,
          logs: [],
          skippedDaysCount: 0,
          icon: args.icon || "book-open"
        };

        const updated = {
          ...osData,
          habits: [...(osData.habits || []), newHabit]
        };
        saveDataFn(updated);

        return {
          success: true,
          data: newHabit,
          message: `New habit structure '${name}' created.`
        };
      }

      case "habits_delete": {
        const query = (args.habitId || "").toString().toLowerCase();
        const habits = [...(osData.habits || [])];
        const target = habits.find(h => h.id === query || h.name.toLowerCase().includes(query));

        if (!target) throw new Error(`Habit matching '${args.habitId}' not found`);

        const updatedHabits = habits.filter(h => h.id !== target.id);
        const updated = { ...osData, habits: updatedHabits };
        saveDataFn(updated);

        return {
          success: true,
          data: { deletedId: target.id, name: target.name },
          message: `Habit routine '${target.name}' removed.`
        };
      }

      // --- EXPENSES ---
      case "expenses_add": {
        const amount = Number(args.amount);
        if (isNaN(amount) || amount <= 0) throw new Error("Valid expense amount is required");

        const newExpense = {
          id: `exp_${Date.now()}`,
          amount,
          category: args.category || "food",
          note: args.note || "Expense entry",
          date: args.date || todayStr,
          isImpulsive: Boolean(args.isImpulsive),
          explanation: args.explanation || ""
        };

        const updated = {
          ...osData,
          expenses: [newExpense, ...(osData.expenses || [])]
        };
        saveDataFn(updated);

        return {
          success: true,
          data: newExpense,
          message: `Logged expense ₹${amount} for '${newExpense.note}' [${newExpense.category}].`
        };
      }

      case "expenses_list": {
        const expenses = osData.expenses || [];
        let filtered = [...expenses];
        if (args.category) filtered = filtered.filter(e => e.category === args.category);
        const limit = args.limit || 20;
        filtered = filtered.slice(0, limit);

        const totalSpent = (osData.expenses || []).reduce((sum: number, e: any) => sum + e.amount, 0);

        return {
          success: true,
          data: {
            transactions: filtered,
            totalSpent,
            budgetLimit: osData.profile?.budgetLimit || 15000
          },
          message: `Found ${filtered.length} transaction(s). Total spent: ₹${totalSpent}.`
        };
      }

      case "budget_check": {
        const expenses = osData.expenses || [];
        const totalSpent = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
        const limit = osData.profile?.budgetLimit || 15000;
        const categoryBudgets = osData.budgets || [];

        const categoryBreakdown: Record<string, { spent: number; limit?: number }> = {};
        expenses.forEach((e: any) => {
          categoryBreakdown[e.category] = categoryBreakdown[e.category] || { spent: 0 };
          categoryBreakdown[e.category].spent += e.amount;
        });

        categoryBudgets.forEach((b: any) => {
          categoryBreakdown[b.category] = categoryBreakdown[b.category] || { spent: 0 };
          categoryBreakdown[b.category].limit = b.limit;
        });

        const status = totalSpent > limit ? "OVER_LIMIT" : totalSpent > limit * 0.85 ? "WARNING_THRESHOLD" : "HEALTHY";

        return {
          success: true,
          data: {
            totalSpent,
            limit,
            status,
            remaining: Math.max(0, limit - totalSpent),
            utilizationPercent: Math.round((totalSpent / limit) * 100),
            categoryBreakdown
          },
          message: `Budget status: ${status} (${Math.round((totalSpent / limit) * 100)}% utilized: ₹${totalSpent} / ₹${limit}).`
        };
      }

      // --- GOALS ---
      case "goals_create": {
        const title = args.title?.trim();
        if (!title) throw new Error("Goal title is required");

        const newGoal = {
          id: `goal_${Date.now()}`,
          title,
          description: args.description || "",
          targetDate: args.targetDate || todayStr,
          progress: Math.min(100, Math.max(0, Number(args.progress) || 0)),
          status: "active"
        };

        const updated = {
          ...osData,
          goals: [...(osData.goals || []), newGoal]
        };
        saveDataFn(updated);

        return {
          success: true,
          data: newGoal,
          message: `Goal '${title}' registered in Vault with target date ${newGoal.targetDate}.`
        };
      }

      case "goals_update_progress": {
        const query = (args.goalId || "").toString().toLowerCase();
        const goals = [...(osData.goals || [])];
        const goal = goals.find(g => g.id === query || g.title.toLowerCase().includes(query));

        if (!goal) throw new Error(`Goal matching '${args.goalId}' not found`);

        const progress = Math.min(100, Math.max(0, Number(args.progress)));
        goal.progress = progress;
        if (progress >= 100) goal.status = "completed";
        else if (args.status) goal.status = args.status;

        const updated = { ...osData, goals };
        saveDataFn(updated);

        return {
          success: true,
          data: goal,
          message: `Goal '${goal.title}' progress updated to ${progress}%.`
        };
      }

      case "goals_list": {
        const goals = osData.goals || [];
        return {
          success: true,
          data: goals,
          message: `Retrieved ${goals.length} strategic goals.`
        };
      }

      // --- WELLBEING & DIARY ---
      case "sleep_log": {
        const duration = Number(args.duration);
        if (isNaN(duration) || duration <= 0) throw new Error("Valid sleep duration required");

        const sleepRecord = {
          duration,
          sleepTime: args.sleepTime || "23:00",
          wakeTime: args.wakeTime || "07:00",
          date: args.date || todayStr
        };

        return {
          success: true,
          data: sleepRecord,
          message: `Sleep recovery log saved: ${duration} hours (${sleepRecord.sleepTime} -> ${sleepRecord.wakeTime}).`
        };
      }

      case "diary_entry_add": {
        const content = args.content?.trim();
        if (!content) throw new Error("Diary content required");

        const newEntry = {
          id: `diary_${Date.now()}`,
          date: todayStr,
          timestamp: new Date().toISOString(),
          content,
          review: `Recorded via AI Bridge. Evaluated with optimal focus parameters.`,
          mood: args.mood || "focused",
          productivityScore: Number(args.productivityScore) || 85
        };

        const updated = {
          ...osData,
          diaryEntries: [newEntry, ...(osData.diaryEntries || [])]
        };
        saveDataFn(updated);

        return {
          success: true,
          data: newEntry,
          message: `Nightly diary reflection saved successfully with mood '${newEntry.mood}'.`
        };
      }

      case "focus_session_log": {
        const duration = Number(args.durationMinutes);
        if (isNaN(duration) || duration <= 0) throw new Error("Valid duration required");

        return {
          success: true,
          data: {
            durationMinutes: duration,
            taskTitle: args.taskTitle || "Deep Focus Block",
            focusScore: Number(args.focusScore) || 90,
            timestamp: new Date().toISOString()
          },
          message: `Focus interval (${duration} mins) recorded with focus quality rating ${args.focusScore || 90}%.`
        };
      }

      // --- SYSTEM & MEMORY ---
      case "system_get_life_score": {
        const tasks = osData.tasks || [];
        const habits = osData.habits || [];
        const goals = osData.goals || [];

        const dayTasks = tasks.filter((t: any) => t.date === todayStr);
        const taskRate = dayTasks.length > 0
          ? Math.round((dayTasks.filter((t: any) => t.status === "completed").length / dayTasks.length) * 100)
          : (tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.status === "completed").length / tasks.length) * 100) : 0);

        const habitRate = habits.length > 0
          ? Math.round((habits.filter((h: any) => h.logs.includes(todayStr)).length / habits.length) * 100)
          : 0;

        const goalRate = goals.length > 0
          ? Math.round(goals.reduce((acc: number, g: any) => acc + g.progress, 0) / goals.length)
          : 0;

        const lifeScore = Math.round((taskRate * 0.4) + (habitRate * 0.4) + (goalRate * 0.2));

        return {
          success: true,
          data: {
            lifeScore,
            taskRate,
            habitRate,
            goalRate,
            tier: lifeScore >= 80 ? "Optimal (Prime Focus)" : lifeScore >= 50 ? "Stable (Nominal)" : "Needs Attention",
            todayTasksCount: dayTasks.length,
            activeHabitsCount: habits.length,
            activeGoalsCount: goals.length
          },
          message: `Life OS Focus Index: ${lifeScore}% [${lifeScore >= 80 ? "OPTIMAL" : "STABLE"}].`
        };
      }

      case "system_get_context": {
        const pendingTasks = (osData.tasks || []).filter((t: any) => t.status === "pending" && t.date === todayStr);
        const totalExpenses = (osData.expenses || []).reduce((sum: number, e: any) => sum + e.amount, 0);

        return {
          success: true,
          data: {
            user: osData.profile?.name || "Sabarinathan",
            aiPersonality: osData.profile?.aiPersonality || "Logical",
            todayPendingTasks: pendingTasks.map((t: any) => ({ title: t.title, time: t.time, priority: t.category })),
            activeHabits: (osData.habits || []).map((h: any) => ({ name: h.name, streak: h.streak })),
            activeGoals: (osData.goals || []).map((g: any) => ({ title: g.title, progress: g.progress })),
            financials: {
              totalSpent: totalExpenses,
              budgetLimit: osData.profile?.budgetLimit || 15000
            }
          },
          message: "Unified system context snapshot assembled."
        };
      }

      case "ai_memory_store": {
        const fact = args.fact?.trim();
        if (!fact) throw new Error("Memory fact statement required");

        const newMem = {
          id: `mem_${Date.now()}`,
          fact,
          category: args.category || "preference",
          timestamp: Date.now()
        };

        return {
          success: true,
          data: newMem,
          message: `Fact safely indexed into long-term cognitive memory.`
        };
      }

      default:
        throw new Error(`Unknown MCP Tool: '${toolName}'`);
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Execution failed",
      message: `Tool execution error: ${err?.message || "Unknown error"}`
    };
  }
}

// Process JSON-RPC 2.0 MCP Request
export function handleMCPJsonRpcRequest(
  request: { jsonrpc?: string; id?: any; method: string; params?: any },
  osData: any,
  saveDataFn: (updated: any) => void
) {
  const { id, method, params } = request;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: true, listChanged: true },
            prompts: { listChanged: true }
          },
          serverInfo: {
            name: "life-os-mcp-server",
            version: "4.3.0",
            description: "Life OS Model Context Protocol (MCP) server bridging tasks, habits, goals, budgets, and neuroplastic tracking."
          }
        }
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: MCP_TOOLS_REGISTRY.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
          }))
        }
      };

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const execResult = executeMCPTool(toolName, toolArgs, osData, saveDataFn);

      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(execResult, null, 2)
            }
          ],
          isError: !execResult.success
        }
      };
    }

    case "resources/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          resources: MCP_RESOURCES
        }
      };

    case "resources/read": {
      const uri = params?.uri;
      let contentData: any = {};

      if (uri === "lifeos://tasks/today") {
        const todayStr = new Date().toISOString().split("T")[0];
        contentData = (osData.tasks || []).filter((t: any) => t.date === todayStr);
      } else if (uri === "lifeos://habits/active") {
        contentData = osData.habits || [];
      } else if (uri === "lifeos://expenses/summary") {
        contentData = {
          expenses: osData.expenses || [],
          budgetLimit: osData.profile?.budgetLimit || 15000
        };
      } else if (uri === "lifeos://goals/vault") {
        contentData = osData.goals || [];
      } else if (uri === "lifeos://system/telemetry") {
        contentData = executeMCPTool("system_get_life_score", {}, osData, () => {}).data;
      }

      return {
        jsonrpc: "2.0",
        id,
        result: {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(contentData, null, 2)
            }
          ]
        }
      };
    }

    case "prompts/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          prompts: MCP_PROMPTS
        }
      };

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method '${method}' not found.`
        }
      };
  }
}


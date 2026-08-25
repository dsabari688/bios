import { create } from "zustand";
import { FullOSData, Task, Habit, Goal, Expense, ChatMessage, SystemNotification, DiaryEntry } from "../types";
import { executeMCPTool, MCP_TOOLS_REGISTRY } from "../lib/mcpBridge";
import { getLocalDateString, parseLocalDate } from "../lib/timeUtils";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  onUndo?: () => void;
}

export interface UndoAction {
  description: string;
  execute: () => Promise<void>;
}

export interface StoreState {
  token: string | null;
  isLoggedIn: boolean;
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  osData: FullOSData | null;
  isUpdatingDb: boolean;
  activeView: "dashboard" | "missions" | "habits" | "goals" | "analytics" | "ai-core" | "focus-timer" | "settings" | "expenses" | "ai-dashboard" | "diary";
  isSidebarOpen: boolean;
  notificationsOpen: boolean;
  toasts: ToastMessage[];
  loginUsername: string;
  loginEmail: string;
  
  selectedTaskId: string | null;
  selectedTaskTitle: string | null;
  selectedHabitId: string | null;
  selectedHabitName: string | null;
  selectedDate: string;
  
  isTaskModalOpen: boolean;
  editingTask: Task | null;
  isDeferModalOpen: boolean;
  deferringTask: Task | null;
  isDailyReviewOpen: boolean;
  isPlannerModalOpen: boolean;
  plannerPlan: any | null;
  isWeeklyReviewOpen: boolean;
  isOffline: boolean;
  
  undoStack: UndoAction[];
  
  // Actions
  setToken: (token: string | null) => void;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setCurrentUser: (user: StoreState["currentUser"]) => void;
  setActiveView: (view: StoreState["activeView"]) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setNotificationsOpen: (isOpen: boolean) => void;
  setLoginUsername: (name: string) => void;
  setLoginEmail: (email: string) => void;
  setSelectedDate: (date: string) => void;
  changeSelectedDate: (offsetDays: number) => void;
  resetSelectedDateToToday: () => void;
  setSelectedTaskId: (id: string | null) => void;
  setSelectedTaskTitle: (title: string | null) => void;
  setSelectedHabitId: (id: string | null) => void;
  setSelectedHabitName: (name: string | null) => void;
  setIsTaskModalOpen: (isOpen: boolean) => void;
  setEditingTask: (task: Task | null) => void;
  setIsDeferModalOpen: (isOpen: boolean) => void;
  setDeferringTask: (task: Task | null) => void;
  openDeferModal: (task: Task) => void;
  setIsDailyReviewOpen: (isOpen: boolean) => void;
  setIsPlannerModalOpen: (isOpen: boolean) => void;
  setIsWeeklyReviewOpen: (isOpen: boolean) => void;
  setPlannerPlan: (plan: any | null) => void;
  setIsOffline: (isOffline: boolean) => void;
  
  showToast: (message: string, type?: ToastMessage["type"], onUndo?: () => void) => void;
  dismissToast: (id: string) => void;
  
  // API Sync helpers
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  hydrateSystemData: () => Promise<void>;
  
  // Tasks Actions
  toggleTask: (taskId: string) => Promise<void>;
  saveTask: (taskData: Partial<Task> & {
    title: string;
    category: Task["category"];
    date: string;
    time: string;
  }) => Promise<void>;
  rescheduleTask: (taskId: string, newDate: string, reason?: string, maxDeferLimit?: number, newTime?: string) => Promise<void>;
  deferTask: (taskId: string, options: {
    newDate: string;
    newTime?: string;
    newEndTime?: string;
    reason: string;
    maxDeferLimit?: number;
  }) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  
  // Habits Actions
  toggleHabit: (habitId: string, dateStr?: string) => Promise<void>;
  updateHabitProgress: (habitId: string, delta: number, dateStr?: string) => Promise<void>;
  addHabit: (
    name: string,
    frequency: Habit["frequency"],
    icon?: string,
    options?: Partial<Omit<Habit, "id" | "name" | "frequency" | "streak" | "logs" | "skippedDaysCount">>
  ) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;
  
  // Goals Actions
  addGoal: (title: string, targetDate: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateGoalProgress: (id: string, progress: number) => Promise<void>;
  
  // Profile & System Actions
  saveProfile: (profileData: {
    name: string;
    email: string;
    budgetLimit: number;
    aiPersonality: string;
    dailyPlanningReminderTime: string;
    dailyReviewTime: string;
    listeningMode: string;
    proactiveModeEnabled: boolean;
    maxProactiveNudges: number;
    activationWord?: string;
  }) => Promise<void>;
  clearNotifications: () => Promise<void>;
  sendChatMessage: (message: string, activeContext: any) => Promise<any>;
  addExpense: (expenseData: Omit<Expense, "id">) => Promise<void>;
  updateBudget: (category: string, limit: number) => Promise<void>;
  explainExpense: (expenseId: string, explanation: string) => Promise<void>;
  simulatePlanTomorrow: () => Promise<void>;
  
  // Diary actions
  saveDiaryEntry: (content: string, mood: string, productivityScore: number) => Promise<void>;
  deleteDiaryEntry: (entryId: string) => Promise<void>;
  
  // AI Bridge & MCP Tool Execution
  executeBridgeTool: (toolName: string, args: Record<string, any>) => Promise<{ success: boolean; data?: any; error?: string; message: string }>;

  // Undo support
  pushUndo: (description: string, execute: () => Promise<void>) => void;
  triggerUndo: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => {
  // Setup offline listeners
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      set({ isOffline: false });
      get().showToast("Uplink restored. System online.", "success");
      get().hydrateSystemData();
    });
    window.addEventListener("offline", () => {
      set({ isOffline: true });
      get().showToast("Uplink severed. Running in offline mode.", "warning");
    });
  }

  return {
    token: localStorage.getItem("token") || localStorage.getItem("lifeos_token"),
    isLoggedIn: !!(localStorage.getItem("token") || localStorage.getItem("lifeos_token")),
    currentUser: null,
    osData: null,
    isUpdatingDb: false,
    activeView: "dashboard",
    isSidebarOpen: true,
    notificationsOpen: false,
    toasts: [],
    loginUsername: "Sabarinathan",
    loginEmail: "dsabari688@gmail.com",
    
    selectedTaskId: null,
    selectedTaskTitle: null,
    selectedHabitId: null,
    selectedHabitName: null,
    selectedDate: getLocalDateString(new Date()),
    
    isTaskModalOpen: false,
    editingTask: null,
    isDeferModalOpen: false,
    deferringTask: null,
    isDailyReviewOpen: false,
    isPlannerModalOpen: false,
    plannerPlan: null,
    isWeeklyReviewOpen: false,
    isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
    
    undoStack: [],

    setToken: (token) => {
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("lifeos_token", token);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("lifeos_token");
      }
      set({ token, isLoggedIn: !!token });
    },
    setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
    setCurrentUser: (currentUser) => set({ currentUser }),
    setActiveView: (activeView) => set({ activeView }),
    setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
    setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
    setLoginUsername: (loginUsername) => set({ loginUsername }),
    setLoginEmail: (loginEmail) => set({ loginEmail }),
    setSelectedDate: (date: string) => set({ selectedDate: date }),
    changeSelectedDate: (offsetDays: number) => {
      const current = get().selectedDate || getLocalDateString(new Date());
      const d = parseLocalDate(current);
      d.setDate(d.getDate() + offsetDays);
      set({ selectedDate: getLocalDateString(d) });
    },
    resetSelectedDateToToday: () => {
      set({ selectedDate: getLocalDateString(new Date()) });
    },
    setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
    setSelectedTaskTitle: (selectedTaskTitle) => set({ selectedTaskTitle }),
    setSelectedHabitId: (selectedHabitId) => set({ selectedHabitId }),
    setSelectedHabitName: (selectedHabitName) => set({ selectedHabitName }),
    setIsTaskModalOpen: (isTaskModalOpen) => set({ isTaskModalOpen }),
    setEditingTask: (editingTask) => set({ editingTask }),
    setIsDeferModalOpen: (isDeferModalOpen) => set({ isDeferModalOpen }),
    setDeferringTask: (deferringTask) => set({ deferringTask }),
    openDeferModal: (task) => set({ deferringTask: task, isDeferModalOpen: true }),
    setIsDailyReviewOpen: (isDailyReviewOpen) => set({ isDailyReviewOpen }),
    setIsPlannerModalOpen: (isPlannerModalOpen) => set({ isPlannerModalOpen }),
    setIsWeeklyReviewOpen: (isWeeklyReviewOpen) => set({ isWeeklyReviewOpen }),
    setPlannerPlan: (plannerPlan) => set({ plannerPlan }),
    setIsOffline: (isOffline) => set({ isOffline }),

    showToast: (message, type = "info", onUndo) => {
      const id = Math.random().toString(36).substring(2, 9);
      set((state) => ({
        toasts: [...state.toasts, { id, message, type, onUndo }],
      }));
      setTimeout(() => {
        get().dismissToast(id);
      }, 5000);
    },
    dismissToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    },

    authenticatedFetch: async (url, options = {}) => {
      // Simulate fetch for client code expecting it
      return new Response(JSON.stringify({ success: true }));
    },

    hydrateSystemData: async () => {
      if (!get().token) return;
      let dataStr = localStorage.getItem("lifeos_data");
      let data: FullOSData;
      if (!dataStr) {
        // Initial core seed data
        const todayStr = new Date().toISOString().split("T")[0];
        const getPastDate = (daysAgo: number) => {
          const d = new Date();
          d.setDate(d.getDate() - daysAgo);
          return d.toISOString().split("T")[0];
        };

        data = {
          profile: {
            name: "Sabarinathan",
            email: "dsabari688@gmail.com",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
            budgetLimit: 1500,
            aiPersonality: "Logical",
            dailyPlanningReminderTime: "21:00",
            hasPlannedTomorrow: true,
            listeningMode: "push-to-talk",
            proactiveModeEnabled: true,
            maxProactiveNudges: 3,
            dailyReviewTime: "21:30",
            activationWord: "piggy",
            learnedPatterns: [
              "Focus index is 18% higher during pre-noon deep blocks.",
              "Impulsive purchases tend to cluster around late Friday nights.",
              "Rescheduling a task more than 3 times increases abandonment probability to 72%."
            ]
          },
          tasks: [
            {
              id: "task_01",
              title: "Deploy LifeOS Core Interface",
              category: "urgent-important",
              date: todayStr,
              time: "09:00",
              recurType: "none",
              status: "completed",
              rescheduledCount: 0
            },
            {
              id: "task_02",
              title: "Compile Q3 Strategic Architecture Report",
              category: "urgent-important",
              date: todayStr,
              time: "14:00",
              recurType: "none",
              status: "pending",
              rescheduledCount: 0
            },
            {
              id: "task_03",
              title: "Review machine learning telemetry graphs",
              category: "important-not-urgent",
              date: todayStr,
              time: "11:00",
              recurType: "daily",
              status: "pending",
              rescheduledCount: 1
            },
            {
              id: "task_04",
              title: "Institute smart planner routing model",
              category: "important-not-urgent",
              date: todayStr,
              time: "16:30",
              recurType: "none",
              status: "completed",
              rescheduledCount: 0
            },
            {
              id: "task_05",
              title: "Rebalance AWS node container caches",
              category: "urgent-not-important",
              date: todayStr,
              time: "18:00",
              recurType: "weekly",
              status: "completed",
              rescheduledCount: 0
            },
            {
              id: "task_06",
              title: "Filter diagnostic audit trails",
              category: "urgent-not-important",
              date: todayStr,
              time: "19:00",
              recurType: "none",
              status: "pending",
              rescheduledCount: 0
            },
            {
              id: "task_07",
              title: "Archive stale local git branches",
              category: "not-urgent-not-important",
              date: todayStr,
              time: "20:00",
              recurType: "none",
              status: "pending",
              rescheduledCount: 2
            }
          ],
          habits: [
            {
              id: "habit_01",
              name: "LeetCode Daily Challenge",
              frequency: "daily",
              streak: 8,
              logs: [getPastDate(4), getPastDate(3), getPastDate(2), getPastDate(1), todayStr],
              skippedDaysCount: 0,
              icon: "code"
            },
            {
              id: "habit_02",
              name: "Deep Focus Sessions (2h)",
              frequency: "daily",
              streak: 5,
              logs: [getPastDate(3), getPastDate(2), getPastDate(1), todayStr],
              skippedDaysCount: 1,
              icon: "cpu"
            },
            {
              id: "habit_03",
              name: "Cardio Workout & Fitness",
              frequency: "daily",
              streak: 12,
              logs: [getPastDate(6), getPastDate(5), getPastDate(4), getPastDate(3), getPastDate(2), getPastDate(1)],
              skippedDaysCount: 0,
              icon: "zap"
            },
            {
              id: "habit_04",
              name: "Financial Logging Audit",
              frequency: "weekly",
              streak: 3,
              logs: [getPastDate(14), getPastDate(7), todayStr],
              skippedDaysCount: 0,
              icon: "wallet"
            }
          ],
          goals: [
            {
              id: "goal_01",
              title: "Achieve 9.5+ Codebase Quality Score",
              description: "Enforce complete type coverage, comprehensive unit testing, and highly responsive rendering speeds.",
              targetDate: "2026-08-15",
              progress: 85,
              status: "active"
            },
            {
              id: "goal_02",
              title: "Construct OpenCV Spatial Visual Cortex",
              description: "Incorporate coordinate-plotting camera loops to translate motion into cognitive focus scores.",
              targetDate: "2026-10-31",
              progress: 60,
              status: "active"
            },
            {
              id: "goal_03",
              title: "Enforce Multi-layered Fiscal Allocation Control",
              description: "Maintain rigid weekly budgeting and log impulsive exceptions to trigger Piggy's analytical review.",
              targetDate: "2026-12-31",
              progress: 40,
              status: "active"
            }
          ],
          expenses: [
            {
              id: "exp_01",
              amount: 45,
              category: "food",
              note: "Late-night celebration sushi",
              date: getPastDate(2),
              isImpulsive: true,
              explanation: "Backend server successfully passed the Vitest suite."
            },
            {
              id: "exp_02",
              amount: 15,
              category: "transportation",
              note: "Uber ride to corporate lab",
              date: getPastDate(1),
              isImpulsive: false
            },
            {
              id: "exp_03",
              amount: 120,
              category: "shopping",
              note: "Noise-cancelling headphones",
              date: todayStr,
              isImpulsive: false
            },
            {
              id: "exp_04",
              amount: 60,
              category: "entertainment",
              note: "Custom cybernetic keycap set",
              date: todayStr,
              isImpulsive: true,
              explanation: "Necessary upgrade for visual comfort during late-night terminal editing."
            },
            {
              id: "exp_05",
              amount: 8,
              category: "food",
              note: "Espresso coffee",
              date: todayStr,
              isImpulsive: false
            }
          ],
          budgets: [
            { category: "food", limit: 300 },
            { category: "transportation", limit: 150 },
            { category: "shopping", limit: 400 },
            { category: "education", limit: 200 },
            { category: "healthcare", limit: 100 },
            { category: "entertainment", limit: 150 },
            { category: "misc", limit: 100 }
          ],
          chatHistory: [
            {
              id: "chat_01",
              role: "user",
              content: "Jarvis, what is the current diagnostic telemetry on our budget?",
              timestamp: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: "chat_02",
              role: "assistant",
              content: "Understood, Sir. Currently, our entertainment ledger sits at ₹60 out of a ₹150 allocation (40%), food sits at ₹53 out of a ₹300 allocation (17.6%), and shopping is at ₹120 out of a ₹400 allocation (30%). System is well within optimal guardrails.",
              timestamp: new Date(Date.now() - 3550000).toISOString()
            }
          ],
          notifications: [
            {
              id: "notif_01",
              title: "Strategic Alert: Rescheduling Overhead",
              message: "The task 'Archive stale local git branches' has been rescheduled twice already. System predicts a high abandonment probability.",
              timestamp: new Date(Date.now() - 7200000).toISOString(),
              type: "warning",
              read: false
            },
            {
              id: "notif_02",
              title: "Habit Streak Milestone Achieved",
              message: "Cardio Workout & Fitness has sustained a consecutive streak of 12 days. Momentum index: Highly stable.",
              timestamp: new Date(Date.now() - 14400000).toISOString(),
              type: "streak",
              read: false
            },
            {
              id: "notif_03",
              title: "Financial Outlier Flagged",
              message: "Impulsive food expense of ₹45 flagged on 'Late-night celebration sushi'. Ready for self-reflection input.",
              timestamp: new Date(Date.now() - 86400000).toISOString(),
              type: "budget",
              read: true
            }
          ]
        };
        localStorage.setItem("lifeos_data", JSON.stringify(data));
      } else {
        try {
          data = JSON.parse(dataStr);
        } catch (e) {
          localStorage.removeItem("lifeos_data");
          get().hydrateSystemData();
          return;
        }
      }
      set({ osData: data });
      if (data.profile) {
        set({
          loginUsername: data.profile.name,
          loginEmail: data.profile.email,
        });
      }
    },

    // Pushes an undo action onto the stack (limit 15 entries)
    pushUndo: (description, execute) => {
      set((state) => ({
        undoStack: [{ description, execute }, ...state.undoStack].slice(0, 15),
      }));
    },

    // Triggers execution of the top undo item
    triggerUndo: async () => {
      const { undoStack } = get();
      if (undoStack.length === 0) return;
      
      const [top, ...rest] = undoStack;
      set({ undoStack: rest, isUpdatingDb: true });
      
      try {
        await top.execute();
        get().showToast(`Undone: ${top.description}`, "success");
      } catch (err: any) {
        get().showToast(`Failed to undo action: ${err.message}`, "error");
      } finally {
        set({ isUpdatingDb: false });
      }
    },

    // Task Actions
    toggleTask: async (taskId) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const task = data.tasks.find((t) => t.id === taskId);
        if (!task) return;

        const originalStatus = task.status;
        get().pushUndo(`Task toggle completion`, async () => {
          await get().saveTask({ ...task, status: originalStatus });
        });

        task.status = task.status === "completed" ? "pending" : "completed";
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast(`Task status adjusted.`, "success", () => get().triggerUndo());
      } catch (err) {
        console.error(err);
      }
    },

    saveTask: async (taskData) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const isNew = !taskData.id;
        
        if (isNew) {
          const newTask: Task = {
            id: `task_${Date.now()}`,
            title: taskData.title,
            category: taskData.category,
            date: taskData.date,
            time: taskData.time,
            endTime: taskData.endTime,
            description: taskData.description,
            recurType: taskData.recurType || "none",
            status: taskData.status || "pending",
            rescheduledCount: taskData.rescheduledCount || 0,
            maxDeferLimit: taskData.maxDeferLimit || 3,
            deferReason: taskData.deferReason,
            deferHistory: taskData.deferHistory || []
          };
          data.tasks.push(newTask);
        } else {
          const existingIndex = data.tasks.findIndex((t) => t.id === taskData.id);
          if (existingIndex !== -1) {
            const originalTask = { ...data.tasks[existingIndex] };
            get().pushUndo(`Edit Task "${taskData.title}"`, async () => {
              await get().saveTask(originalTask);
            });
            data.tasks[existingIndex] = {
              ...data.tasks[existingIndex],
              ...taskData
            };
          }
        }
        
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast(
          isNew ? `New tactical mission logged.` : `Tactical mission parameters modified.`,
          "success",
          !isNew ? () => get().triggerUndo() : undefined
        );
      } catch (err) {
        console.error(err);
      }
    },

    deferTask: async (taskId, options) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const task = data.tasks.find((t) => t.id === taskId);
        if (!task) return;

        const originalTask = { ...task };
        get().pushUndo(`Defer Mission "${task.title}"`, async () => {
          await get().saveTask(originalTask);
        });

        const newCount = (task.rescheduledCount || 0) + 1;
        const deferRecord = {
          timestamp: new Date().toISOString(),
          fromDate: task.date,
          toDate: options.newDate,
          fromTime: task.time,
          toTime: options.newTime || task.time,
          reason: options.reason || "Tactical rescheduling",
          deferIndex: newCount
        };

        task.originalDate = task.originalDate || task.date;
        task.date = options.newDate;
        if (options.newTime) task.time = options.newTime;
        if (options.newEndTime !== undefined) task.endTime = options.newEndTime;
        task.deferReason = options.reason;
        task.rescheduledCount = newCount;
        if (options.maxDeferLimit !== undefined) {
          task.maxDeferLimit = options.maxDeferLimit;
        }
        task.deferHistory = [...(task.deferHistory || []), deferRecord];

        const maxLimit = task.maxDeferLimit || 3;
        if (task.rescheduledCount >= maxLimit) {
          const newNotif: SystemNotification = {
            id: `notif_${Date.now()}`,
            title: "Performance Warning: Deferral Allowance Limit",
            message: `The mission '${task.title}' has reached its deferral allowance (${task.rescheduledCount}/${maxLimit} times). Reason: ${options.reason}`,
            timestamp: new Date().toISOString(),
            type: "warning",
            read: false
          };
          data.notifications.unshift(newNotif);
        }

        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast(
          `Mission deferred to ${options.newDate} (Deferral #${newCount}).`,
          "success",
          () => get().triggerUndo()
        );
      } catch (err) {
        console.error(err);
      }
    },

    rescheduleTask: async (taskId, newDate, reason, maxDeferLimit, newTime) => {
      await get().deferTask(taskId, {
        newDate,
        newTime,
        reason: reason || "Tactical rescheduling",
        maxDeferLimit
      });
    },

    deleteTask: async (taskId) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const task = data.tasks.find((t) => t.id === taskId);
        if (!task) return;

        get().pushUndo(`Restore deleted task "${task.title}"`, async () => {
          await get().saveTask(task);
        });

        data.tasks = data.tasks.filter((t) => t.id !== taskId);
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("Task decommissioned.", "warning", () => get().triggerUndo());
      } catch (err) {
        console.error(err);
      }
    },

    // Habits Actions
    toggleHabit: async (habitId, targetDateStr) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const habit = data.habits.find((h) => h.id === habitId);
        if (!habit) return;

        const effectiveDate = targetDateStr || get().selectedDate || new Date().toISOString().split("T")[0];
        const logIndex = habit.logs.indexOf(effectiveDate);
        habit.dailyProgress = habit.dailyProgress || {};

        const originalLogs = [...habit.logs];
        const originalStreak = habit.streak;
        const originalDailyProgress = { ...(habit.dailyProgress || {}) };

        get().pushUndo(`Toggle Habit "${habit.name}"`, async () => {
          const innerDataStr = localStorage.getItem("lifeos_data");
          if (innerDataStr) {
            const innerData: FullOSData = JSON.parse(innerDataStr);
            const innerHabit = innerData.habits.find((h) => h.id === habitId);
            if (innerHabit) {
              innerHabit.logs = originalLogs;
              innerHabit.streak = originalStreak;
              innerHabit.dailyProgress = originalDailyProgress;
              localStorage.setItem("lifeos_data", JSON.stringify(innerData));
              set({ osData: innerData });
            }
          }
        });

        if (logIndex !== -1) {
          // Unmark
          habit.logs.splice(logIndex, 1);
          habit.streak = Math.max(0, habit.streak - 1);
          if (habit.targetValue) {
            habit.dailyProgress[effectiveDate] = 0;
          }
        } else {
          // Mark completed
          habit.logs.push(effectiveDate);
          habit.streak += 1;
          if (habit.targetValue) {
            habit.dailyProgress[effectiveDate] = habit.targetValue;
          }
          
          if (habit.streak > 0 && habit.streak % 5 === 0) {
            const milestoneNotif: SystemNotification = {
              id: `notif_${Date.now()}`,
              title: "Consistency Milestone Unlocked",
              message: `Your streak on '${habit.name}' is now ${habit.streak} days. Performance index surging!`,
              timestamp: new Date().toISOString(),
              type: "streak",
              read: false
            };
            data.notifications.unshift(milestoneNotif);
          }
        }

        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("Habit status updated.", "success", () => get().triggerUndo());
      } catch (err) {
        console.error(err);
      }
    },

    updateHabitProgress: async (habitId, delta, targetDateStr) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const habit = data.habits.find((h) => h.id === habitId);
        if (!habit) return;

        const effectiveDate = targetDateStr || get().selectedDate || new Date().toISOString().split("T")[0];
        habit.dailyProgress = habit.dailyProgress || {};
        const currentAmount = habit.dailyProgress[effectiveDate] || 0;
        const target = habit.targetValue || 1;
        const newAmount = Math.max(0, currentAmount + delta);
        
        habit.dailyProgress[effectiveDate] = newAmount;

        const logIndex = habit.logs.indexOf(effectiveDate);
        if (newAmount >= target) {
          if (logIndex === -1) {
            habit.logs.push(effectiveDate);
            habit.streak += 1;
            get().showToast(`Target achieved for ${habit.name}! (${newAmount} / ${target} ${habit.unit || ""})`, "success");
          }
        } else {
          if (logIndex !== -1) {
            habit.logs.splice(logIndex, 1);
            habit.streak = Math.max(0, habit.streak - 1);
          }
        }

        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
      } catch (err) {
        console.error(err);
      }
    },

    addHabit: async (name, frequency, icon, options) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const newHabit: Habit = {
          id: `habit_${Date.now()}`,
          name,
          frequency,
          streak: 0,
          logs: [],
          skippedDaysCount: 0,
          icon: icon || "book-open",
          category: options?.category || "general",
          targetValue: options?.targetValue,
          unit: options?.unit,
          stepIncrement: options?.stepIncrement,
          notes: options?.notes,
          dailyProgress: {}
        };
        data.habits.push(newHabit);
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("Routine structure installed.", "success");
      } catch (err) {
        console.error(err);
      }
    },

    deleteHabit: async (habitId) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        data.habits = data.habits.filter((h) => h.id !== habitId);
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("Habit routine structure removed.", "warning");
      } catch (err) {
        console.error(err);
      }
    },

    // Goals Actions
    addGoal: async (title, targetDate) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const newGoal: Goal = {
          id: `goal_${Date.now()}`,
          title,
          description: "Tactical milestone recorded in the strategic vault.",
          targetDate,
          progress: 0,
          status: "active"
        };
        data.goals.push(newGoal);
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("Strategic milestone goal instituted.", "success");
      } catch (err) {
        console.error(err);
      }
    },

    deleteGoal: async (id) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        data.goals = data.goals.filter((g) => g.id !== id);
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("Milestone decommissioned.", "warning");
      } catch (err) {
        console.error(err);
      }
    },

    updateGoalProgress: async (id, progress) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const goal = data.goals.find((g) => g.id === id);
        if (!goal) return;

        const originalProgress = goal.progress;
        get().pushUndo(`Update Goal "${goal.title}" progress to ${originalProgress}%`, async () => {
          await get().updateGoalProgress(id, originalProgress);
        });

        goal.progress = progress;
        if (progress >= 100) {
          goal.status = "completed";
          const compNotif: SystemNotification = {
            id: `notif_${Date.now()}`,
            title: "Strategic Milestone Met!",
            message: `Congratulations, Sir. The goal '${goal.title}' has achieved 100% execution capacity.`,
            timestamp: new Date().toISOString(),
            type: "streak",
            read: false
          };
          data.notifications.unshift(compNotif);
        }

        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("Strategic progression recorded.", "success", () => get().triggerUndo());
      } catch (err) {
        console.error(err);
      }
    },

    // Profile & Financials
    saveProfile: async (profileData) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        data.profile = {
          ...data.profile,
          ...profileData,
          aiPersonality: profileData.aiPersonality as any,
          listeningMode: profileData.listeningMode as any,
          activationWord: profileData.activationWord || data.profile.activationWord || "piggy"
        };
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("System configurations optimized.", "success");
      } catch (err) {
        console.error(err);
      }
    },

    clearNotifications: async () => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        data.notifications = data.notifications.map((n) => ({ ...n, read: true }));
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("Telemetry warnings cleared.", "info");
      } catch (err) {
        console.error(err);
      }
    },

    executeBridgeTool: async (toolName, args) => {
      const dataStr = localStorage.getItem("lifeos_data");
      const currentData = dataStr ? JSON.parse(dataStr) : get().osData || {};
      
      const saveDataFn = (updated: any) => {
        localStorage.setItem("lifeos_data", JSON.stringify(updated));
        set({ osData: updated });
      };

      const result = executeMCPTool(toolName, args, currentData, saveDataFn);
      
      if (result.success) {
        get().showToast(result.message, "success");
      } else {
        get().showToast(result.message || "Tool execution failed", "error");
      }

      return result;
    },

    sendChatMessage: async (message, activeContext) => {
      const tempId = `temp-${Date.now()}`;
      const tempMessage: ChatMessage = {
        id: tempId,
        role: "user",
        content: message,
        timestamp: new Date().toISOString()
      };

      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return null;
      
      const data: FullOSData = JSON.parse(dataStr);
      data.chatHistory = data.chatHistory || [];
      data.chatHistory.push(tempMessage);
      
      set({ isUpdatingDb: true, osData: data });

      // Intelligent AI Bridge: Determine if user request maps to an MCP tool execution
      setTimeout(() => {
        const personality = data.profile.aiPersonality || "Logical";
        const lowerMsg = message.toLowerCase().trim();
        const todayStr = new Date().toISOString().split("T")[0];
        const nowTimeStr = new Date().toTimeString().slice(0, 5);

        let executedToolInfo: { tool: string; resultMsg: string; data?: any } | null = null;
        let reply = "";

        const saveDataFn = (updated: any) => {
          localStorage.setItem("lifeos_data", JSON.stringify(updated));
          set({ osData: updated });
        };

        // 1. Task Creation Detection (e.g. "add task finish deck tomorrow at 3pm", "create task refactor protocols", "new mission ...")
        if (
          (lowerMsg.startsWith("add task") || lowerMsg.startsWith("create task") || lowerMsg.startsWith("new task") || lowerMsg.startsWith("assign task") || lowerMsg.startsWith("task:") || lowerMsg.includes("designate a new core task"))
        ) {
          let taskTitle = message
            .replace(/^(add task|create task|new task|assign task|task:|sir, let's designate a new core task:?)/i, "")
            .trim();
          
          if (!taskTitle) taskTitle = "Tactical Mission Objective";

          const toolRes = executeMCPTool("tasks_create", {
            title: taskTitle,
            category: lowerMsg.includes("urgent") || lowerMsg.includes("critical") ? "urgent-important" : "important-not-urgent",
            date: todayStr,
            time: nowTimeStr
          }, data, saveDataFn);

          if (toolRes.success) {
            executedToolInfo = { tool: "tasks_create", resultMsg: toolRes.message, data: toolRes.data };
            reply = `Mission Initialized: '${taskTitle}' is registered into today's tactical operations matrix [Quadrant: Urgent-Important].`;
          }
        }
        
        // 2. Task Completion Detection (e.g. "complete task ...", "done task ...", "mark task done")
        else if (lowerMsg.includes("complete task") || lowerMsg.includes("mark task done") || lowerMsg.includes("finished task")) {
          const match = lowerMsg.replace(/(complete task|mark task done|finished task|done task)/i, "").trim();
          const targetTask = data.tasks.find(t => t.title.toLowerCase().includes(match) || t.id === match);
          if (targetTask) {
            const toolRes = executeMCPTool("tasks_complete", { taskId: targetTask.id }, data, saveDataFn);
            executedToolInfo = { tool: "tasks_complete", resultMsg: toolRes.message, data: toolRes.data };
            reply = `Status Update Confirmed: '${targetTask.title}' marked as completed. Life Score index updated!`;
          }
        }

        // 3. Habit Log / Toggle Detection (e.g. "log habit morning code", "check habit gym", "mark habit done")
        else if (lowerMsg.includes("log habit") || lowerMsg.includes("mark habit") || lowerMsg.includes("check habit") || lowerMsg.includes("done with habit")) {
          const habitQuery = lowerMsg.replace(/(log habit|mark habit|check habit|done with habit)/i, "").trim();
          const targetHabit = data.habits.find(h => h.name.toLowerCase().includes(habitQuery) || h.id === habitQuery);
          if (targetHabit) {
            const toolRes = executeMCPTool("habits_log", { habitId: targetHabit.id }, data, saveDataFn);
            executedToolInfo = { tool: "habits_log", resultMsg: toolRes.message, data: toolRes.data };
            reply = `Habit Verified: '${targetHabit.name}' logged for today! Streak is now ${targetHabit.streak} days. Keep pushing!`;
          }
        }

        // 4. Expense Logging Detection (e.g. "add expense 250 for lunch", "log expense 150 coffee", "spent 500 on shopping")
        else if (lowerMsg.includes("add expense") || lowerMsg.includes("log expense") || lowerMsg.startsWith("spent ") || lowerMsg.includes("paid ₹") || lowerMsg.includes("bought ")) {
          const numMatch = lowerMsg.match(/(?:(?:rs\.?|₹|\$)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|inr|usd|bucks)?)/i);
          const amount = numMatch ? parseFloat(numMatch[1] || numMatch[2]) : 150;
          
          let note = message.replace(/(add expense|log expense|spent|paid|bought|for|on|₹|\$|\d+)/gi, "").trim();
          if (!note) note = "Tactical Procurement";

          let category: any = "food";
          if (lowerMsg.includes("shop") || lowerMsg.includes("book") || lowerMsg.includes("cloth")) category = "shopping";
          else if (lowerMsg.includes("cab") || lowerMsg.includes("uber") || lowerMsg.includes("fuel") || lowerMsg.includes("metro")) category = "transportation";
          else if (lowerMsg.includes("course") || lowerMsg.includes("study") || lowerMsg.includes("exam")) category = "education";
          else if (lowerMsg.includes("movie") || lowerMsg.includes("game")) category = "entertainment";

          const toolRes = executeMCPTool("expenses_add", { amount, category, note }, data, saveDataFn);
          if (toolRes.success) {
            executedToolInfo = { tool: "expenses_add", resultMsg: toolRes.message, data: toolRes.data };
            reply = `Financial Ledger Updated: Debit of ₹${amount} logged under '${note}' [Category: ${category}].`;
          }
        }

        // 5. Goal Creation Detection (e.g. "new goal save 50000", "create goal run 5k marathon")
        else if (lowerMsg.startsWith("new goal") || lowerMsg.startsWith("create goal") || lowerMsg.startsWith("add goal")) {
          const goalTitle = message.replace(/(new goal|create goal|add goal):?/i, "").trim() || "Strategic Objective";
          const toolRes = executeMCPTool("goals_create", {
            title: goalTitle,
            targetDate: "2026-12-31",
            progress: 0
          }, data, saveDataFn);
          if (toolRes.success) {
            executedToolInfo = { tool: "goals_create", resultMsg: toolRes.message, data: toolRes.data };
            reply = `Strategic Vault Entry Initialized: Goal '${goalTitle}' locked in.`;
          }
        }

        // 6. Focus Score / Life Score Query
        else if (lowerMsg.includes("life score") || lowerMsg.includes("focus index") || lowerMsg.includes("productivity review") || lowerMsg.includes("my score")) {
          const toolRes = executeMCPTool("system_get_life_score", {}, data, saveDataFn);
          executedToolInfo = { tool: "system_get_life_score", resultMsg: toolRes.message, data: toolRes.data };
          reply = `Life OS Telemetry: Compound Focus Index is ${toolRes.data?.lifeScore}%. Daily Tasks: ${toolRes.data?.taskRate}%, Routine Cadence: ${toolRes.data?.habitRate}%, Vault Trajectory: ${toolRes.data?.goalRate}%. Rating: ${toolRes.data?.tier}.`;
        }

        // If no tool was explicitly executed, provide smart personality response
        if (!reply) {
          const pendingTasks = data.tasks.filter(t => t.status === "pending");
          const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);

          if (lowerMsg.includes("budget") || lowerMsg.includes("expens") || lowerMsg.includes("money") || lowerMsg.includes("spend")) {
            const toolRes = executeMCPTool("budget_check", {}, data, saveDataFn);
            executedToolInfo = { tool: "budget_check", resultMsg: toolRes.message, data: toolRes.data };
            if (personality === "Cynical") {
              reply = `Checking the damage: We've allocated ₹${totalExpenses} against ₹${data.profile.budgetLimit}. Utilization is at ${toolRes.data?.utilizationPercent}%. Try to refrain from unnecessary transactions.`;
            } else if (personality === "Energetic") {
              reply = `Financial Ledger Check! Total allocations: ₹${totalExpenses} / ₹${data.profile.budgetLimit} (${toolRes.data?.utilizationPercent}%). Staying well inside the guardrails! 🚀`;
            } else if (personality === "Calm") {
              reply = `A peaceful assessment of our financial ledgers shows recent allocations total ₹${totalExpenses} of ₹${data.profile.budgetLimit}. Mindful spending maintains harmony.`;
            } else {
              reply = `Financial status: ₹${totalExpenses} spent against ₹${data.profile.budgetLimit} limit (${toolRes.data?.utilizationPercent}% utilization). Status: ${toolRes.data?.status}.`;
            }
          } else if (lowerMsg.includes("task") || lowerMsg.includes("mission") || lowerMsg.includes("todo") || lowerMsg.includes("plan")) {
            const taskListStr = pendingTasks.slice(0, 4).map(t => `'${t.title}'`).join(", ");
            if (pendingTasks.length === 0) {
              reply = `All active tactical missions have been completed for today, Sir. Telemetry indicates 100% execution throughput.`;
            } else {
              reply = `Backlog parsing completed. There are ${pendingTasks.length} pending missions: ${taskListStr}. Optimal routing recommends tackling high-priority missions first.`;
            }
          } else if (lowerMsg.includes("habit") || lowerMsg.includes("streak") || lowerMsg.includes("routine")) {
            const bestHabit = data.habits.length > 0 ? data.habits.reduce((prev, current) => (prev.streak > current.streak) ? prev : current) : null;
            const bestStr = bestHabit ? `'${bestHabit.name}' on a ${bestHabit.streak}-day streak` : "no active routines";
            reply = `Routine tracking telemetry updated. Highest momentum routine is currently ${bestStr}. Cumulative daily habit adherence rate is 78%.`;
          } else if (lowerMsg.includes("remember") || lowerMsg.includes("recall context") || lowerMsg.includes("preference")) {
            const toolRes = executeMCPTool("system_get_context", {}, data, saveDataFn);
            executedToolInfo = { tool: "system_get_context", resultMsg: toolRes.message, data: toolRes.data };
            reply = `Context Recalled: User '${data.profile.name}', AI Mode '${data.profile.aiPersonality}', ${pendingTasks.length} pending missions today, ${data.habits.length} tracked habits, and ₹${totalExpenses} allocated this cycle.`;
          } else {
            if (personality === "Cynical") {
              reply = `Life OS online. I'm connected to all tools (Tasks, Habits, Expenses, Vault, Sleep). What do you need executed?`;
            } else if (personality === "Energetic") {
              reply = `J.A.R.V.I.S. and Piggy are linked to all tools across the OS! Ask me to add tasks, log expenses, check streaks, or query the MCP bridge! 🎯`;
            } else if (personality === "Calm") {
              reply = `All tools and MCP servers are connected in harmony. Let me know what you would like to organize or log.`;
            } else {
              reply = `AI Bridge operational. All 20+ MCP tools (Tasks, Habits, Goals, Expenses, Diary, Telemetry) are active and ready for execution.`;
            }
          }
        }

        if (executedToolInfo) {
          reply += `\n\n*[AI BRIDGE EXECUTION: Invoked tool \`${executedToolInfo.tool}\` • Status: OK • Telemetry Synced]*`;
        } else {
          reply += `\n\n*[PIGGY SECURE AUDIT: Logic verified. MCP Bridge listening. 0 conflicts detected.]*`;
        }

        const assistantMessage: ChatMessage = {
          id: `chat_reply_${Date.now()}`,
          role: "assistant",
          content: reply,
          timestamp: new Date().toISOString()
        };

        const updatedDataStr = localStorage.getItem("lifeos_data");
        if (updatedDataStr) {
          const updatedData: FullOSData = JSON.parse(updatedDataStr);
          updatedData.chatHistory = updatedData.chatHistory || [];
          updatedData.chatHistory.push(assistantMessage);
          localStorage.setItem("lifeos_data", JSON.stringify(updatedData));
          set({ osData: updatedData, isUpdatingDb: false });
        }
      }, 750);
      
      return { success: true };
    },

    addExpense: async (expenseData) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const newExpense: Expense = {
          id: `exp_${Date.now()}`,
          ...expenseData,
          isImpulsive: expenseData.isImpulsive || false
        };
        data.expenses.unshift(newExpense);

        const categoryBudget = data.budgets.find((b) => b.category === expenseData.category);
        const totalSpentOnCategory = data.expenses
          .filter((e) => e.category === expenseData.category)
          .reduce((sum, e) => sum + e.amount, 0);

        if (categoryBudget && totalSpentOnCategory > categoryBudget.limit) {
          const budgetNotif: SystemNotification = {
            id: `notif_${Date.now()}`,
            title: "Critical: Budget Deficit Flagged",
            message: `The ledger limit for '${expenseData.category}' has been violated (₹${totalSpentOnCategory} spent of ₹${categoryBudget.limit} limit).`,
            timestamp: new Date().toISOString(),
            type: "budget",
            read: false
          };
          data.notifications.unshift(budgetNotif);
        }

        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("Financial deduction logged.", "success");
      } catch (err) {
        console.error(err);
      }
    },

    updateBudget: async (category, limit) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const bIndex = data.budgets.findIndex((b) => b.category === category);
        if (bIndex !== -1) {
          data.budgets[bIndex].limit = limit;
        } else {
          data.budgets.push({ category, limit });
        }
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("Budget allocation updated.", "success");
      } catch (err) {
        console.error(err);
      }
    },

    explainExpense: async (expenseId, explanation) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const exp = data.expenses.find((e) => e.id === expenseId);
        if (exp) {
          exp.explanation = explanation;
        }
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast("Self-reflection logged.", "success");
      } catch (err) {
        console.error(err);
      }
    },

    simulatePlanTomorrow: async () => {
      set({ isUpdatingDb: true });
      setTimeout(() => {
        const mockPlan = {
          success: true,
          plan: {
            title: "Tactical Flightpath — Tomorrow's Optimized Routine",
            blocks: [
              { time: "6:30 AM - 7:00 AM", activity: "Calibrating Cardio & Stretching (Workout Routine)", type: "routine" },
              { time: "8:00 AM - 8:30 AM", activity: "Fasted Coffee & Daily Backlog Triage", type: "planning" },
              { time: "9:00 AM - 11:30 AM", activity: "Deep Focus Segment: " + (get().osData?.tasks.find(t => t.status === "pending")?.title || "LifeOS Coding Codebase Audit"), type: "work" },
              { time: "12:00 PM - 1:00 PM", activity: "High-protein lunch & hydration rebalancing", type: "rest" },
              { time: "2:00 PM - 4:00 PM", activity: "Secondary Tactical Block: " + (get().osData?.tasks.filter(t => t.status === "pending")[1]?.title || "Strategic goal synchronization"), type: "work" },
              { time: "5:00 PM - 6:00 PM", activity: "Routine Ledger Review & Expense logs audit", type: "admin" },
              { time: "9:30 PM - 9:45 PM", activity: "Piggy Cognitive Alignment & Sleep tracker check-in", type: "planning" }
            ],
            notes: "Strategic priorities mapped successfully. Focus probability: 94%. We detected high evening fatigue, so cognitive-intensive tasks are shifted into the pre-noon block, Sir."
          }
        };
        set({ plannerPlan: mockPlan.plan, isUpdatingDb: false });
        get().showToast("Optimal daily path compiled.", "success");
      }, 1000);
    },

    saveDiaryEntry: async (content, mood, productivityScore) => {
      set({ isUpdatingDb: true });
      
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) {
        set({ isUpdatingDb: false });
        return;
      }
      
      try {
        const data: FullOSData = JSON.parse(dataStr);
        data.diaryEntries = data.diaryEntries || [];
        
        const todayStr = new Date().toISOString().split("T")[0];
        
        const totalHabits = data.habits.length;
        const completedHabits = data.habits.filter(h => h.logs.includes(todayStr)).length;
        const pendingTasks = data.tasks.filter(t => t.status === "pending").length;
        const completedTasksToday = data.tasks.filter(t => t.date === todayStr && t.status === "completed").length;
        
        const personality = data.profile?.aiPersonality || "Logical";
        
        // --- Smart Linguistic Analysis Engine ---
        const normalized = content.toLowerCase();
        const hasTamilScript = /[\u0b80-\u0bff]/.test(content);
        const tanglishPatterns = [
          "naan", "vanden", "vandhen", "pannen", "pennen", "senjen", "mudichen", "mudichuten", "vela", "velai", 
          "padichen", "padithen", "sapten", "saapten", "thoonginen", "thunginen", "pesunen", "pesinen", 
          "irukken", "iruken", "pala", "seitha", "seithutten", "work pannen", "code pannen", "study pannen", "panniten"
        ];
        
        const hasTanglish = tanglishPatterns.some(pattern => normalized.includes(pattern));
        const isTamilContext = hasTamilScript || hasTanglish;

        const achievements: string[] = [];
        
        if (normalized.includes("code") || normalized.includes("coding") || normalized.includes("program") || normalized.includes("software") || normalized.includes("bugs") || normalized.includes("github") || normalized.includes("build")) {
          achievements.push(isTamilContext ? "coding panni software solutions design panni irukkinga 💻" : "making concrete software engineering progress 💻");
        }
        if (normalized.includes("work") || normalized.includes("vela") || normalized.includes("velai") || normalized.includes("office") || normalized.includes("meeting") || normalized.includes("task") || normalized.includes("வேலை")) {
          achievements.push(isTamilContext ? "office velai-galaium targets-aium disciplined-ah mudichurukkinga 👔" : "completing vital work and operational tasks 👔");
        }
        if (normalized.includes("study") || normalized.includes("studying") || normalized.includes("padichen") || normalized.includes("padithen") || normalized.includes("learn") || normalized.includes("read") || normalized.includes("book") || normalized.includes("படித்தேன்")) {
          achievements.push(isTamilContext ? "iniku nalla padichu knowledge expand panni irukkinga 📚" : "investing in your intellect and learning new things 📚");
        }
        if (normalized.includes("gym") || normalized.includes("exercise") || normalized.includes("workout") || normalized.includes("run") || normalized.includes("walk") || normalized.includes("உடற்பயிற்சி")) {
          achievements.push(isTamilContext ? "body physical fitness-kaga workout panni gym exercise seithurukkinga 🏃‍♂️" : "prioritizing physical fitness and body conditioning 🏃‍♂️");
        }
        if (normalized.includes("vandhen") || normalized.includes("vanden") || normalized.includes("vandha") || normalized.includes("came") || normalized.includes("வந்தேன்")) {
          achievements.push(isTamilContext ? "solliya edathuku vandhu correct attendance, presence-ah thandhirukkinga 📍" : "showing up exactly where you needed to be with commitment 📍");
        }
        if (normalized.includes("sapten") || normalized.includes("saapten") || normalized.includes("food") || normalized.includes("diet") || normalized.includes("eat") || normalized.includes("சாப்பிட்டேன்")) {
          achievements.push(isTamilContext ? "diet health follow panni correct timela food saapturukkinga 🍏" : "maintaining clean nutritional intake and eating properly 🍏");
        }
        if (normalized.includes("completed") || normalized.includes("done") || normalized.includes("mudichen") || normalized.includes("mudichuten") || normalized.includes("mudithutten") || normalized.includes("முடித்தேன்")) {
          achievements.push(isTamilContext ? "kudutha works-ai disciplined-ah check panni mudichurukkinga 🎯" : "crossing off crucial line items from your list successfully 🎯");
        }

        if (achievements.length === 0) {
          achievements.push(isTamilContext ? "iniku nalla focus-odu life routine-ai secure panni irukkinga ✨" : "dedicating energy toward stabilizing your daily routines ✨");
        }

        const achievementsList = achievements.join(isTamilContext ? ", and " : ", and ");

        let review = "";
        
        if (personality === "Cynical") {
          review = isTamilContext 
            ? `Well well, look at today's log. Neenga rate panna score ${productivityScore}%. You logged ${completedTasksToday} tasks completed and ${completedHabits}/${totalHabits} routines. On the bright side, you actually did well by: ${achievementsList}. Romba creative-ah eludhi irukkeenga, let's see if tomorrow holds same execution, or just more creative diary logging.`
            : `Well, let's inspect today's "unprecedented achievements." You self-reported a productivity score of ${productivityScore}%. On the positive side, my sensors verify you did well by: ${achievementsList}. You logged ${completedTasksToday} completed tasks today, leaving ${pendingTasks} pending issues, and completed ${completedHabits}/${totalHabits} routines. Let's see if tomorrow holds actual execution, or just more creative diary logging.`;
        } else if (personality === "Energetic") {
          review = isTamilContext 
            ? `WHOA! MARANAMAANA VEGAM, CAPTAIN! 🚀 Unge momentum score ${productivityScore}% mudichu thookuringa! Mass panni irukkinga, especially by: ${achievementsList}! Iniku ${completedTasksToday} tasks complete panni ${completedHabits}/${totalHabits} habits complie pannirukeenga! Pure fire! Let's fuel up the engine tomorrow and break more limits! 🔥⚡`
            : `WHOA! Simply spectacular effort today, Captain! 🚀 You rating your day at a solid ${productivityScore}% shows absolute momentum! You did phenomenally well by: ${achievementsList}! You crushed ${completedTasksToday} primary missions and logged ${completedHabits}/${totalHabits} habits! Keep checking those boxes and let's light up tomorrow with maximum intensity! ⚡`;
        } else if (personality === "Calm") {
          review = isTamilContext 
            ? `Miga nalla naal, Sir. Iniku neenga: ${achievementsList}. Romba porumaiyodum amaidhiyodum thondu seithu mudichurukkinga. Rating yourself at ${productivityScore}% show balanced peace. Completed ${completedTasksToday} tasks and ${completedHabits}/${totalHabits} routines. Rest your mind tonight and let go of what remains undone.`
            : `A peaceful conclusion to your day. You self-reported a productivity balance of ${productivityScore}% and completed ${completedHabits} out of ${totalHabits} routines. You did exceptionally well today by: ${achievementsList}. You completed ${completedTasksToday} tasks today; whether big or small, they contribute to your peace. Rest your mind tonight and let go of what remains undone.`;
        } else { // Logical
          review = isTamilContext 
            ? `Audit Parameters Ingested. Efficiency declared: ${productivityScore}%. Positive milestones achieved: ${achievementsList}. Routines complied: ${completedHabits}/${totalHabits}. Completed tactical tasks: ${completedTasksToday}. Recommendation: Current data indicates optimal cognitive utilization. Initiate recovery mode, Sir.`
            : `Audit Parameters: Ingested evening log. Conformance evaluation metrics updated. Self-declared productivity coefficient is ${productivityScore}%. Success vectors verified: ${achievementsList}. Routines execution: ${completedHabits}/${totalHabits} completed (${totalHabits > 0 ? Math.round((completedHabits/totalHabits)*100) : 0}%). Completed tactical tasks: ${completedTasksToday}. Recommendation: current metrics suggest optimal cognitive utilization. Transitioning to recovery mode.`;
        }
        
        const newEntry: DiaryEntry = {
          id: `diary_${Date.now()}`,
          date: todayStr,
          timestamp: new Date().toISOString(),
          content,
          review,
          mood,
          productivityScore
        };
        
        data.diaryEntries = data.diaryEntries.filter(entry => entry.date !== todayStr);
        data.diaryEntries.unshift(newEntry);
        
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data, isUpdatingDb: false });
        get().showToast("Nightly Diary log secured & analyzed by Piggy.", "success");
      } catch (err) {
        console.error(err);
        set({ isUpdatingDb: false });
        get().showToast("Failed to compile diary reflection.", "error");
      }
    },
    
    deleteDiaryEntry: async (entryId) => {
      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        if (data.diaryEntries) {
          const entry = data.diaryEntries.find(e => e.id === entryId);
          if (entry) {
            get().pushUndo(`Restore deleted diary entry from ${entry.date}`, async () => {
              const innerDataStr = localStorage.getItem("lifeos_data");
              if (innerDataStr) {
                const innerData: FullOSData = JSON.parse(innerDataStr);
                innerData.diaryEntries = innerData.diaryEntries || [];
                innerData.diaryEntries.push(entry);
                innerData.diaryEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
                localStorage.setItem("lifeos_data", JSON.stringify(innerData));
                set({ osData: innerData });
              }
            });
            data.diaryEntries = data.diaryEntries.filter(e => e.id !== entryId);
            localStorage.setItem("lifeos_data", JSON.stringify(data));
            set({ osData: data });
            get().showToast("Diary entry deleted.", "warning", () => get().triggerUndo());
          }
        }
      } catch (err) {
        console.error(err);
      }
    },
  };
});

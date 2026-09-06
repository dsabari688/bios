import { create } from "zustand";
import { FullOSData, Task, Habit, Goal, Expense, ChatMessage, SystemNotification, DiaryEntry, UserProfile, safeLogs } from "../types";
import { executeMCPTool, MCP_TOOLS_REGISTRY } from "../lib/mcpBridge";
import { goalService } from "../services/goalService";
import { habitService } from "../services/habitService";
import { expenseService } from "../services/expenseService";
import { diaryService } from "../services/diaryService";
import { budgetService } from "../services/budgetService";
import { notificationService } from "../services/notificationService";
import { systemConfigApi, type SystemConfig } from "../api/systemConfig.api";
import { habitsApi } from "../api/habits.api";
import { fetchGoals, createGoal } from "../api/goals.api";
import { expensesApi } from "../api/expenses.api";
import { diaryApi } from "../api/diary.api";
import { isUuid } from "../lib/taskSync";
import { getLocalDateString, parseLocalDate } from "../lib/timeUtils";
import { taskRepository } from "../db/repositories/taskRepository";
import { habitRepository } from "../db/repositories/habitRepository";
import { goalRepository } from "../db/repositories/goalRepository";
import { expenseRepository } from "../db/repositories/expenseRepository";
import { diaryRepository } from "../db/repositories/diaryRepository";
import {
  backendToTask,
  fetchBackendTasks,
  syncCompleteTask,
  syncCreateTask,
  syncDeleteTask,
  syncSetTaskStatus,
  syncUpdateTask
} from "../lib/taskSync";
import { getApiBaseUrl, apiRequest } from "../api/client";

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
  systemConfig: SystemConfig | null;
  systemConfigLoaded: boolean;
  
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
    avatar?: string;
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
    learnedPatterns?: string[];
    taskReminders?: boolean;
    habitNudges?: boolean;
    goalMilestones?: boolean;
    missedAlerts?: boolean;
    biometrics?: boolean;
    faceUnlock?: boolean;
    darkMode?: boolean;
    highContrast?: boolean;
  }) => Promise<void>;
  clearNotifications: () => Promise<void>;
  clearChatHistory: () => void;
  sendChatMessage: (message: string, activeContext: any) => Promise<any>;
  addExpense: (expenseData: Omit<Expense, "id">) => Promise<void>;
  updateBudget: (category: string, limit: number) => Promise<void>;
  explainExpense: (expenseId: string, explanation: string) => Promise<void>;
  simulatePlanTomorrow: () => Promise<void>;
  
  // Diary actions
  saveDiaryEntry: (content: string, mood: string, productivityScore: number) => Promise<void>;
  deleteDiaryEntry: (entryId: string) => Promise<void>;
  
  // Focus Session logging
  logFocusSession: (minutes: number, score?: number) => Promise<{ success: boolean; summary?: { todayCompletedBlocks: number; todayTotalMinutes: number } }>;

  // Undo support
  pushUndo: (description: string, execute: () => Promise<void>) => void;
  triggerUndo: () => Promise<void>;
}

function getInitialOSData(): FullOSData {
  const defaultProfile: UserProfile = {
    name: "Sabarinathan",
    email: "dsabari688@gmail.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
    budgetLimit: 1500,
    aiPersonality: "Logical",
    dailyPlanningReminderTime: "21:00",
    hasPlannedTomorrow: false,
    listeningMode: "push-to-talk",
    proactiveModeEnabled: true,
    maxProactiveNudges: 3,
    dailyReviewTime: "21:30",
    activationWord: "piggy"
  };

  try {
    const dataStr = typeof localStorage !== "undefined" ? localStorage.getItem("lifeos_data") : null;
    if (dataStr) {
      const parsed = JSON.parse(dataStr) as FullOSData;
      return {
        profile: parsed.profile || defaultProfile,
        tasks: parsed.tasks || [],
        habits: parsed.habits || [],
        goals: parsed.goals || [],
        expenses: parsed.expenses || [],
        budgets: parsed.budgets || [],
        chatHistory: parsed.chatHistory || [],
        notifications: parsed.notifications || [],
        diaryEntries: parsed.diaryEntries || []
      };
    }
  } catch (err) {
    console.warn("Failed to parse local osData, using defaults:", err);
  }

  const initial: FullOSData = {
    profile: defaultProfile,
    tasks: [],
    habits: [],
    goals: [],
    expenses: [],
    budgets: [],
    chatHistory: [],
    notifications: [],
    diaryEntries: []
  };

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("lifeos_data", JSON.stringify(initial));
    } catch (e) {}
  }

  return initial;
}

function getOSDataFromStoreOrLocalStorage(set: any, get: () => StoreState): FullOSData {
  let data = get().osData;
  if (data) return data;

  try {
    const dataStr = typeof localStorage !== "undefined" ? localStorage.getItem("lifeos_data") : null;
    if (dataStr) {
      data = JSON.parse(dataStr) as FullOSData;
      set({ osData: data });
      return data;
    }
  } catch (e) {
    console.warn("Failed to parse lifeos_data from localStorage", e);
  }

  const defaultOSData = getInitialOSData();
  set({ osData: defaultOSData });
  return defaultOSData;
}

export const useStore = create<StoreState>((set, get) => {
  // Setup offline listeners, focus/visibility triggers & 3s live cross-device sync auto-refresh
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

    // Instant sync when user switches back to the app (phone or desktop)
    window.addEventListener("focus", () => {
      if (get && typeof get === "function" && get().token && !get().isOffline) {
        get().hydrateSystemData().catch(() => {});
      }
    });

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          if (get && typeof get === "function" && get().token && !get().isOffline) {
            get().hydrateSystemData().catch(() => {});
          }
        }
      });
    }

    // Cross-tab / cross-window broadcast channel for instant notification
    try {
      if ("BroadcastChannel" in window) {
        const syncChannel = new BroadcastChannel("bios_cross_sync");
        syncChannel.onmessage = (event) => {
          if (event.data === "data_updated" && get && typeof get === "function") {
            get().hydrateSystemData().catch(() => {});
          }
        };
      }
    } catch {}

    // 3-second rapid bidirectional poll for real-time synchronization between Windows and Mobile
    setInterval(() => {
      if (get && typeof get === "function" && get().token && !get().isOffline) {
        get().hydrateSystemData().catch(() => {});
      }
    }, 3000);
  }

  return {
    token: (() => {
      const stored = localStorage.getItem("token") || localStorage.getItem("lifeos_token");
      if (stored && stored.trim() !== "") return stored;
      const defaultToken = "mock_jwt_token_lifeos_dashboard";
      try {
        localStorage.setItem("token", defaultToken);
        localStorage.setItem("lifeos_token", defaultToken);
      } catch {}
      return defaultToken;
    })(),
    isLoggedIn: true,
    currentUser: null,
    osData: getInitialOSData(),
    isUpdatingDb: false,
    activeView: "dashboard",
    isSidebarOpen: false,
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
    systemConfig: null,
    systemConfigLoaded: false,

    setToken: (token) => {
      const effectiveToken = token || "mock_jwt_token_lifeos_dashboard";
      localStorage.setItem("token", effectiveToken);
      localStorage.setItem("lifeos_token", effectiveToken);
      set({ token: effectiveToken, isLoggedIn: true });
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

      // The local cache only carries profile, chat history and offline
      // fallbacks. Collections are hydrated from PostgreSQL via the backend.
      let cached: FullOSData | null = null;
      try {
        const dataStr = localStorage.getItem("lifeos_data");
        cached = dataStr ? (JSON.parse(dataStr) as FullOSData) : null;
      } catch {
        cached = null;
      }

      const defaultProfile: UserProfile = {
        name: "Sabarinathan",
        email: "dsabari688@gmail.com",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
        budgetLimit: 1500,
        aiPersonality: "Logical",
        dailyPlanningReminderTime: "21:00",
        hasPlannedTomorrow: false,
        listeningMode: "push-to-talk",
        proactiveModeEnabled: true,
        maxProactiveNudges: 3,
        dailyReviewTime: "21:30",
        activationWord: "piggy"
      };

      const data: FullOSData = {
        profile: cached?.profile ?? defaultProfile,
        tasks: [],
        habits: [],
        goals: [],
        expenses: [],
        budgets: [],
        chatHistory: cached?.chatHistory ?? [],
        notifications: [],
        diaryEntries: []
      };

      // Backend is the source of truth; cached values are the fallback
      // whenever a collection cannot be fetched (offline mode).
      const [tasksRes, habitsRes, goalsRes, expensesRes, budgetsRes, diaryRes, notifsRes, sysConfigRes] =
        await Promise.allSettled([
          fetchBackendTasks(),
          habitsApi.getAll(),
          fetchGoals(),
          expensesApi.getAll(),
          budgetService.getAll(),
          diaryApi.getAll(),
          notificationService.getSystemNotifications(),
          systemConfigApi.get()
        ]);

      if (tasksRes.status === "fulfilled" && tasksRes.value) {
        const backendTasks = tasksRes.value.map(backendToTask);
        for (const bt of backendTasks) {
          await taskRepository.save(bt as any, true).catch(() => {});
        }
        const repoTasks = await taskRepository.getAll();
        const mergedTasks = [...backendTasks];

        for (const local of repoTasks) {
          if (!mergedTasks.some((b) => b.id === local.id) && !(local as any)._deletedAt) {
            if ((local as any)._syncStatus === "synced") {
              await taskRepository.remove(local.id, true).catch(() => {});
            } else {
              const rawDate = local.date || new Date().toISOString();
              const dateStr = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
              const formattedLocal: Task = {
                id: local.id,
                title: local.title,
                description: local.description,
                date: dateStr,
                time: local.time || "09:00",
                endTime: local.endTime,
                category: (local.category as any) || "important-not-urgent",
                recurType: local.recurType || "none",
                status: local.status === "completed" ? "completed" : "pending",
                rescheduledCount: local.rescheduledCount || 0,
              };
              mergedTasks.push(formattedLocal);

              // Auto-sync pending local task to cloud backend so phone and laptop both receive it
              void syncCreateTask(formattedLocal).then(async (serverId) => {
                if (serverId) {
                  await taskRepository.remove(local.id, true).catch(() => {});
                  formattedLocal.id = serverId;
                  await taskRepository.save(formattedLocal as any, true).catch(() => {});
                }
              }).catch(() => {});
            }
          }
        }
        data.tasks = mergedTasks;
      } else {
        if (tasksRes.status === "rejected") {
          console.warn("Task hydration deferred/offline:", tasksRes.reason);
        }
        const repoTasks = await taskRepository.getAll();
        data.tasks = repoTasks.length > 0 ? (repoTasks.filter((t) => !(t as any)._deletedAt) as any) : (cached?.tasks ?? []);
      }

      if (habitsRes.status === "fulfilled" && Array.isArray(habitsRes.value)) {
        const backendHabits = habitsRes.value;
        for (const bh of backendHabits) {
          await habitRepository.save(bh as any, true).catch(() => {});
        }
        const localHabits = await habitRepository.getAll();
        const mergedHabits = [...backendHabits];
        for (const lh of localHabits) {
          if (!mergedHabits.some((b) => b.id === lh.id) && !(lh as any)._deletedAt) {
            if (lh._syncStatus === "synced") {
              await habitRepository.remove(lh.id, true).catch(() => {});
            } else {
              mergedHabits.push(lh as any);
              void habitsApi.create(lh as any).then(async (created) => {
                if (created && created.id) {
                  await habitRepository.remove(lh.id, true).catch(() => {});
                  await habitRepository.save(created as any, true).catch(() => {});
                }
              }).catch(() => {});
            }
          }
        }
        data.habits = mergedHabits;
      } else {
        console.warn("Habit hydration deferred/offline:", habitsRes.status === "rejected" ? habitsRes.reason : undefined);
        const localHabits = await habitRepository.getAll();
        data.habits = localHabits.filter((h) => !(h as any)._deletedAt) as any;
      }

      if (goalsRes.status === "fulfilled" && Array.isArray(goalsRes.value)) {
        const backendGoals = goalsRes.value;
        for (const bg of backendGoals) {
          await goalRepository.save(bg as any, true).catch(() => {});
        }
        const localGoals = await goalRepository.getAll();
        const mergedGoals = [...backendGoals];
        for (const lg of localGoals) {
          if (!mergedGoals.some((b) => b.id === lg.id) && !(lg as any)._deletedAt) {
            if ((lg as any)._syncStatus === "synced") {
              await goalRepository.remove(lg.id, true).catch(() => {});
            } else {
              mergedGoals.push(lg as any);
              void createGoal({
                title: lg.title,
                description: lg.description,
                targetDate: lg.targetDate,
                progress: lg.progress,
                status: lg.status
              }).then(async (created) => {
                if (created && created.id) {
                  await goalRepository.remove(lg.id, true).catch(() => {});
                  await goalRepository.save(created as any, true).catch(() => {});
                }
              }).catch(() => {});
            }
          }
        }
        data.goals = mergedGoals;
      } else {
        console.warn("Goal hydration deferred/offline:", goalsRes.status === "rejected" ? goalsRes.reason : undefined);
        const localGoals = await goalRepository.getAll();
        data.goals = localGoals.filter((g) => !(g as any)._deletedAt) as any;
      }

      if (expensesRes.status === "fulfilled" && Array.isArray(expensesRes.value)) {
        const backendExpenses = expensesRes.value;
        for (const be of backendExpenses) {
          await expenseRepository.save(be as any, true).catch(() => {});
        }
        const localExpenses = await expenseRepository.getAll();
        const mergedExpenses = [...backendExpenses];
        for (const le of localExpenses) {
          if (!mergedExpenses.some((b) => b.id === le.id) && !(le as any)._deletedAt) {
            if ((le as any)._syncStatus === "synced") {
              await expenseRepository.remove(le.id, true).catch(() => {});
            } else {
              mergedExpenses.push(le as any);
              void expensesApi.create({
                amount: le.amount,
                category: le.category,
                note: le.note,
                date: le.date,
                isImpulsive: le.isImpulsive
              }).then(async (created) => {
                if (created && created.id) {
                  await expenseRepository.remove(le.id, true).catch(() => {});
                  await expenseRepository.save(created as any, true).catch(() => {});
                }
              }).catch(() => {});
            }
          }
        }
        data.expenses = mergedExpenses;
      } else {
        console.warn("Expense hydration deferred/offline:", expensesRes.status === "rejected" ? expensesRes.reason : undefined);
        const localExpenses = await expenseRepository.getAll();
        data.expenses = localExpenses.filter((e) => !(e as any)._deletedAt) as any;
      }

      if (budgetsRes.status === "fulfilled") {
        data.budgets = budgetsRes.value;
      } else {
        console.warn("Budget hydration deferred/offline:", budgetsRes.status === "rejected" ? budgetsRes.reason : undefined);
        data.budgets = cached?.budgets ?? [];
      }

      if (diaryRes.status === "fulfilled" && Array.isArray(diaryRes.value)) {
        const backendDiary = diaryRes.value;
        for (const de of backendDiary) {
          await diaryRepository.save(de as any, true).catch(() => {});
        }
        const localDiary = await diaryRepository.getAll();
        const mergedDiary = [...backendDiary];
        for (const ld of localDiary) {
          if (!mergedDiary.some((b) => b.id === ld.id || (b.date && ld.date && b.date.slice(0, 10) === ld.date.slice(0, 10))) && !(ld as any)._deletedAt) {
            if ((ld as any)._syncStatus === "synced") {
              await diaryRepository.remove(ld.id, true).catch(() => {});
            } else {
              mergedDiary.push(ld as any);
              void diaryApi.create({
                date: ld.date,
                timestamp: ld.timestamp,
                content: ld.content,
                review: ld.review,
                mood: ld.mood,
                productivityScore: ld.productivityScore
              }).then(async (created) => {
                if (created && created.id) {
                  await diaryRepository.remove(ld.id, true).catch(() => {});
                  await diaryRepository.save(created as any, true).catch(() => {});
                }
              }).catch(() => {});
            }
          }
        }
        mergedDiary.sort((a, b) => String(b ? (b?.timestamp || (b as any)?.createdAt || "") : "").localeCompare(String(a ? (a?.timestamp || (a as any)?.createdAt || "") : "")));
        data.diaryEntries = mergedDiary;
      } else {
        console.warn("Diary hydration deferred/offline:", diaryRes.status === "rejected" ? diaryRes.reason : undefined);
        const localDiary = await diaryRepository.getAll();
        data.diaryEntries = localDiary.filter((d) => !(d as any)._deletedAt) as any;
      }

      if (notifsRes.status === "fulfilled") {
        const backendNotifications = notifsRes.value;
        const localOnly = (cached?.notifications ?? []).filter(
          (n) => !isUuid(n.id) && !backendNotifications.some((b) => b.id === n.id)
        );
        data.notifications = [...backendNotifications, ...localOnly];
      } else {
        console.warn("Notification hydration deferred/offline:", notifsRes.status === "rejected" ? notifsRes.reason : undefined);
        data.notifications = cached?.notifications ?? [];
      }

      // Merge system config into profile (backend is source of truth)
      let loadedConfig: SystemConfig | null = null;
      if (sysConfigRes.status === "fulfilled" && sysConfigRes.value) {
        loadedConfig = sysConfigRes.value;
        data.profile = {
          ...data.profile,
          name: loadedConfig.name || data.profile.name,
          email: loadedConfig.email || data.profile.email,
          aiPersonality: (loadedConfig.aiPersonality || data.profile.aiPersonality) as any,
          listeningMode: (loadedConfig.listeningMode || data.profile.listeningMode) as any,
          proactiveModeEnabled: loadedConfig.proactiveModeEnabled,
          maxProactiveNudges: loadedConfig.maxProactiveNudges,
          dailyReviewTime: loadedConfig.dailyReviewTime,
          activationWord: loadedConfig.activationWord,
          learnedPatterns: loadedConfig.learnedPatterns,
          taskReminders: loadedConfig.taskReminders,
          habitNudges: loadedConfig.habitNudges,
          goalMilestones: loadedConfig.goalMilestones,
          missedAlerts: loadedConfig.missedAlerts,
          biometrics: loadedConfig.biometrics,
          faceUnlock: loadedConfig.faceUnlock,
          darkMode: loadedConfig.darkMode ?? true,
          highContrast: loadedConfig.highContrast ?? false,
        };

        const isDark = loadedConfig.darkMode ?? true;
        if (isDark) {
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("theme", "light");
        }
      } else {
        console.warn("System config hydration deferred/offline:", sysConfigRes.status === "rejected" ? sysConfigRes.reason : undefined);
      }

      localStorage.setItem("lifeos_data", JSON.stringify(data));
      set({ osData: data, systemConfig: loadedConfig, systemConfigLoaded: true });

      if (data.profile) {
        set({
          loginUsername: data.profile.name,
          loginEmail: data.profile.email
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
      try {
        const data = getOSDataFromStoreOrLocalStorage(set, get);
        const task = data.tasks.find((t) => t.id === taskId);
        if (!task) return;

        const originalStatus = task.status;
        get().pushUndo(`Task toggle completion`, async () => {
          await get().saveTask({ ...task, status: originalStatus });
        });

        task.status = task.status === "completed" ? "pending" : "completed";
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: { ...data } });

        await taskRepository.save(task);
        get().hydrateSystemData();

        if (task.status === "completed") {
          syncCompleteTask(taskId);
        } else {
          syncSetTaskStatus(taskId, "pending");
        }
        get().showToast(`Task status adjusted.`, "success", () => get().triggerUndo());
      } catch (err) {
        console.error(err);
      }
    },

    saveTask: async (taskData) => {
      try {
        const data = getOSDataFromStoreOrLocalStorage(set, get);
        const isNew = !taskData.id;
        let savedTask: Task;
        
        if (isNew) {
          const newTask: Task = {
            id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`,
            title: taskData.title,
            category: taskData.category || "important-not-urgent",
            date: taskData.date ? (taskData.date.includes("T") ? taskData.date.split("T")[0] : taskData.date) : getLocalDateString(new Date()),
            time: taskData.time || "09:00",
            endTime: taskData.endTime,
            description: taskData.description,
            recurType: taskData.recurType || "none",
            status: taskData.status || "pending",
            rescheduledCount: taskData.rescheduledCount || 0,
            maxDeferLimit: taskData.maxDeferLimit || 3,
            deferReason: taskData.deferReason,
            deferHistory: taskData.deferHistory || []
          };
          savedTask = newTask;
          data.tasks = [...data.tasks, newTask];
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
            savedTask = data.tasks[existingIndex];
          } else {
            savedTask = taskData as Task;
          }
        }
        
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: { ...data } });

        if (savedTask) {
          await taskRepository.save(savedTask);

          if (isNew) {
            const serverId = await syncCreateTask(savedTask);
            if (serverId) {
              await taskRepository.remove(savedTask.id).catch(() => {});
              const oldId = savedTask.id;
              savedTask.id = serverId;
              await taskRepository.save(savedTask, true);
              const idx = data.tasks.findIndex((t) => t.id === oldId);
              if (idx !== -1) {
                data.tasks[idx].id = serverId;
              }
              localStorage.setItem("lifeos_data", JSON.stringify(data));
              set({ osData: { ...data } });
            }
          } else {
            syncUpdateTask(savedTask.id, savedTask);
          }

          get().hydrateSystemData();
        }

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
      try {
        const data = getOSDataFromStoreOrLocalStorage(set, get);
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

        syncUpdateTask(taskId, {
          date: task.date,
          time: task.time,
          endTime: task.endTime ?? "",
          status: task.status,
          rescheduledCount: newCount
        });

        await taskRepository.save(task);
        get().hydrateSystemData();

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
        set({ osData: { ...data } });
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
      try {
        const data = getOSDataFromStoreOrLocalStorage(set, get);
        const task = data.tasks.find((t) => t.id === taskId);
        if (!task) return;

        get().pushUndo(`Restore deleted task "${task.title}"`, async () => {
          await get().saveTask({ ...task, id: "" });
        });

        data.tasks = data.tasks.filter((t) => t.id !== taskId);
        syncDeleteTask(taskId);
        await taskRepository.remove(taskId);
        get().hydrateSystemData();

        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: { ...data } });
        get().showToast("Task decommissioned.", "warning", () => get().triggerUndo());
      } catch (err) {
        console.error(err);
      }
    },

    // Habits Actions
    toggleHabit: async (habitId, targetDateStr) => {
      try {
        const effectiveDate = targetDateStr || get().selectedDate || new Date().toISOString().split("T")[0];
        const updatedHabit = await habitService.toggle(habitId, effectiveDate);
        const data = getOSDataFromStoreOrLocalStorage(set, get);

        if (updatedHabit) {
          const index = data.habits.findIndex((habit) => habit.id === habitId);
          if (index !== -1) {
            data.habits[index] = updatedHabit;
          } else {
            data.habits.push(updatedHabit);
          }
        }

        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: { ...data } });
        get().showToast("Habit status updated.", "success");
      } catch (error) {
        console.error("Failed to toggle habit:", error);
        get().showToast("Failed to update habit.", "error");
      }
    },

    updateHabitProgress: async (habitId, delta, targetDateStr) => {
      try {
        const effectiveDate = targetDateStr || get().selectedDate || new Date().toISOString().split("T")[0];
        const updatedHabit = await habitService.updateProgress(habitId, effectiveDate, delta);
        const data = getOSDataFromStoreOrLocalStorage(set, get);

        if (updatedHabit) {
          const index = data.habits.findIndex((habit) => habit.id === habitId);
          if (index !== -1) {
            data.habits[index] = updatedHabit;
          }
        }

        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: { ...data } });

        if (updatedHabit) {
          const target = updatedHabit.targetValue || 1;
          const progress = updatedHabit.dailyProgress?.[effectiveDate] || 0;
          if (progress >= target) {
            get().showToast(`Target achieved for ${updatedHabit.name}!`, "success");
          }
        }
      } catch (error) {
        console.error("Failed to update habit progress:", error);
      }
    },

    addHabit: async (name, frequency, icon, options) => {
      try {
        const newHabit = await habitService.create(name, frequency, icon, options);
        const data = getOSDataFromStoreOrLocalStorage(set, get);
        const existingIdx = data.habits.findIndex(h => h.id === newHabit.id);
        if (existingIdx !== -1) {
          data.habits[existingIdx] = newHabit;
        } else {
          data.habits = [...data.habits, newHabit];
        }

        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: { ...data } });
        get().showToast("Routine structure installed.", "success");
      } catch (error) {
        console.error("Failed to create habit:", error);
        get().showToast("Failed to create habit.", "error");
      }
    },

    deleteHabit: async (habitId) => {
      try {
        await habitService.delete(habitId);
        const data = getOSDataFromStoreOrLocalStorage(set, get);
        data.habits = data.habits.filter((habit) => habit.id !== habitId);

        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: { ...data } });
        get().showToast("Habit routine structure removed.", "warning");
      } catch (error) {
        console.error("Failed to delete habit:", error);
        get().showToast("Failed to delete habit.", "error");
      }
    },

    // Goals Actions
    addGoal: async (title, targetDate) => {
      try {
        const newGoal = await goalService.create(title, targetDate);
        const data = getOSDataFromStoreOrLocalStorage(set, get);
        const existingIdx = data.goals.findIndex(g => g.id === newGoal.id);
        if (existingIdx !== -1) {
          data.goals[existingIdx] = newGoal;
        } else {
          data.goals = [...data.goals, newGoal];
        }

        set({ osData: { ...data } });
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        get().showToast("Strategic milestone goal instituted.", "success");
      } catch (error) {
        console.error("Failed to create goal:", error);
        get().showToast("Failed to create strategic goal.", "error");
      }
    },

    deleteGoal: async (id) => {
      try {
        await goalService.remove(id);
        const data = getOSDataFromStoreOrLocalStorage(set, get);
        data.goals = data.goals.filter((goal) => goal.id !== id);

        set({ osData: { ...data } });
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        get().showToast("Milestone decommissioned.", "warning");
      } catch (error) {
        console.error("Failed to delete goal:", error);
        get().showToast("Failed to delete strategic goal.", "error");
      }
    },

    updateGoalProgress: async (id, progress) => {
      try {
        const updatedGoal = await goalService.updateProgress(id, progress);
        const data = getOSDataFromStoreOrLocalStorage(set, get);
        const goalIndex = data.goals.findIndex((g) => g.id === id);
        if (goalIndex !== -1) {
          if (updatedGoal) {
            data.goals[goalIndex] = updatedGoal;
          } else {
            data.goals[goalIndex].progress = progress;
            if (progress >= 100) data.goals[goalIndex].status = "completed";
          }
          localStorage.setItem("lifeos_data", JSON.stringify(data));
          set({ osData: { ...data } });
          get().showToast("Strategic progression recorded.", "success");
        }
      } catch (error) {
        console.error("Failed to update goal progress:", error);
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
          activationWord: profileData.activationWord || data.profile.activationWord || "piggy",
          learnedPatterns: profileData.learnedPatterns ?? data.profile.learnedPatterns
        };
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });

        // Persist to backend database
        try {
          const saved = await systemConfigApi.update({
            name: profileData.name,
            email: profileData.email,
            aiPersonality: profileData.aiPersonality,
            listeningMode: profileData.listeningMode,
            proactiveModeEnabled: profileData.proactiveModeEnabled,
            maxProactiveNudges: profileData.maxProactiveNudges,
            dailyReviewTime: profileData.dailyReviewTime,
            activationWord: profileData.activationWord,
            learnedPatterns: profileData.learnedPatterns,
            taskReminders: profileData.taskReminders,
            habitNudges: profileData.habitNudges,
            goalMilestones: profileData.goalMilestones,
            missedAlerts: profileData.missedAlerts,
            biometrics: profileData.biometrics,
            faceUnlock: profileData.faceUnlock,
            darkMode: profileData.darkMode,
            highContrast: profileData.highContrast,
          });
          set({ systemConfig: saved });
        } catch (syncErr) {
          console.warn("System config sync deferred/offline:", syncErr);
        }

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
        // Persist read-state on the server for backend-sourced notifications.
        const unreadBackendIds = data.notifications
          .filter((n) => isUuid(n.id) && !n.read)
          .map((n) => n.id);

        data.notifications = data.notifications.map((n) => ({ ...n, read: true }));
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });

        void Promise.allSettled(
          unreadBackendIds.map((id) => notificationService.markRead(id))
        );

        get().showToast("Notifications cleared.", "info");
      } catch (err) {
        console.error(err);
      }
    },

    clearChatHistory: () => {
      const dataStr = localStorage.getItem("lifeos_data");
      const currentData = get().osData || (dataStr ? JSON.parse(dataStr) : null);
      if (!currentData) return;
      const updatedData: FullOSData = {
        ...currentData,
        chatHistory: []
      };
      localStorage.setItem("lifeos_data", JSON.stringify(updatedData));
      localStorage.removeItem("piggy_conversation_id");
      set({ osData: updatedData });
      get().showToast("Chat history cleared.", "info");
    },

    executeBridgeTool: async (toolName: string, args: any) => {
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
      const currentData: FullOSData = get().osData || (dataStr ? JSON.parse(dataStr) : {
        profile: {
          name: "Sabarinathan",
          email: "dsabari688@gmail.com",
          avatar: null,
          budgetLimit: 1500,
          aiPersonality: "Logical",
          dailyPlanningReminderTime: "21:00",
          hasPlannedTomorrow: false,
          listeningMode: "push-to-talk",
          proactiveModeEnabled: true,
          maxProactiveNudges: 3,
          dailyReviewTime: "21:30",
          activationWord: "piggy"
        },
        tasks: [],
        habits: [],
        goals: [],
        expenses: [],
        budgets: [],
        chatHistory: [],
        notifications: [],
        diaryEntries: []
      });

      const updatedHistory = [...(currentData.chatHistory || []), tempMessage];
      const data: FullOSData = {
        ...currentData,
        chatHistory: updatedHistory
      };

      // Save user message to localStorage and store state IMMEDIATELY
      localStorage.setItem("lifeos_data", JSON.stringify(data));
      set({ isUpdatingDb: true, osData: data });

      try {
        const storedConversationId = localStorage.getItem("piggy_conversation_id");
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/piggy/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationId: storedConversationId
          })
        });

        if (!res.ok) throw new Error(`Piggy backend responded ${res.status}`);

        const payload = await res.json();
        if (payload.conversationId) {
          localStorage.setItem("piggy_conversation_id", payload.conversationId);
        }

        let reply: string;
        if (payload.success) {
          reply = payload.response || "Done.";
        } else {
          reply = payload.response || "I could not process that request.";
        }

        const assistantMessage: ChatMessage = {
          id: `chat_reply_${Date.now()}`,
          role: "assistant",
          content: reply,
          timestamp: new Date().toISOString(),
          type: payload.intent ? "predictive" : "chat"
        };

        const latestData = get().osData || data;
        const finalHistory = [...(latestData.chatHistory || []), assistantMessage];
        const finalData: FullOSData = {
          ...latestData,
          chatHistory: finalHistory
        };
        localStorage.setItem("lifeos_data", JSON.stringify(finalData));
        set({ osData: finalData, isUpdatingDb: false });

        if (payload.action?.executed && typeof get().hydrateSystemData === "function") {
          await get().hydrateSystemData();
        }

        return { success: payload.success };
      } catch (err) {
        console.warn("[piggy] Direct Comms unavailable, using local fallback:", err);
      }

      // Local Fallback: Determine if user request maps to a local task/habit execution
      setTimeout(() => {
        const lowerMsg = message.toLowerCase().trim();
        const todayStr = new Date().toISOString().split("T")[0];
        const nowTimeStr = new Date().toTimeString().slice(0, 5);

        let reply = "";

        const saveDataFn = (updated: any) => {
          localStorage.setItem("lifeos_data", JSON.stringify(updated));
          set({ osData: updated });
        };

        // 1. Task Creation Detection
        if (
          (lowerMsg.startsWith("add task") || lowerMsg.startsWith("create task") || lowerMsg.startsWith("new task") || lowerMsg.startsWith("assign task") || lowerMsg.startsWith("task:"))
        ) {
          let taskTitle = message
            .replace(/^(add task|create task|new task|assign task|task:)/i, "")
            .trim();
          
          if (!taskTitle) taskTitle = "New Task";

          const toolRes = executeMCPTool("tasks_create", {
            title: taskTitle,
            category: lowerMsg.includes("urgent") || lowerMsg.includes("critical") ? "urgent-important" : "important-not-urgent",
            date: todayStr,
            time: nowTimeStr
          }, data, saveDataFn);

          if (toolRes.success) {
            reply = `Done — added task '${taskTitle}' for today.`;
          }
        }
        
        // 2. Task Completion Detection
        else if (lowerMsg.includes("complete task") || lowerMsg.includes("mark task done") || lowerMsg.includes("finished task")) {
          const match = lowerMsg.replace(/(complete task|mark task done|finished task|done task)/i, "").trim();
          const targetTask = data.tasks.find(t => t.title.toLowerCase().includes(match) || t.id === match);
          if (targetTask) {
            const toolRes = executeMCPTool("tasks_complete", { taskId: targetTask.id }, data, saveDataFn);
            if (toolRes.success) {
              reply = `Done — '${targetTask.title}' marked as completed.`;
            }
          }
        }

        // 3. Habit Log / Toggle Detection
        else if (lowerMsg.includes("log habit") || lowerMsg.includes("mark habit") || lowerMsg.includes("check habit") || lowerMsg.includes("done with habit")) {
          const habitQuery = lowerMsg.replace(/(log habit|mark habit|check habit|done with habit)/i, "").trim();
          const targetHabit = data.habits.find(h => h.name.toLowerCase().includes(habitQuery) || h.id === habitQuery);
          if (targetHabit) {
            const toolRes = executeMCPTool("habits_log", { habitId: targetHabit.id }, data, saveDataFn);
            if (toolRes.success) {
              reply = `Done — '${targetHabit.name}' logged for today! Streak is now ${targetHabit.streak} days.`;
            }
          }
        }

        // 4. Expense Logging Detection
        else if (lowerMsg.includes("add expense") || lowerMsg.includes("log expense") || lowerMsg.startsWith("spent ") || lowerMsg.includes("paid ₹") || lowerMsg.includes("bought ")) {
          const numMatch = lowerMsg.match(/(?:(?:rs\.?|₹|\$)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|inr|usd|bucks)?)/i);
          const amount = numMatch ? parseFloat(numMatch[1] || numMatch[2]) : 150;
          
          let note = message.replace(/(add expense|log expense|spent|paid|bought|for|on|₹|\$|\d+)/gi, "").trim();
          if (!note) note = "Expense";

          let category: any = "food";
          if (lowerMsg.includes("shop") || lowerMsg.includes("book") || lowerMsg.includes("cloth")) category = "shopping";
          else if (lowerMsg.includes("cab") || lowerMsg.includes("uber") || lowerMsg.includes("fuel") || lowerMsg.includes("metro")) category = "transportation";
          else if (lowerMsg.includes("course") || lowerMsg.includes("study") || lowerMsg.includes("exam")) category = "education";
          else if (lowerMsg.includes("movie") || lowerMsg.includes("game")) category = "entertainment";

          const toolRes = executeMCPTool("expenses_add", { amount, category, note }, data, saveDataFn);
          if (toolRes.success) {
            reply = `Done — logged ₹${amount} under '${note}'.`;
          }
        }

        // 5. Goal Creation Detection
        else if (lowerMsg.startsWith("new goal") || lowerMsg.startsWith("create goal") || lowerMsg.startsWith("add goal")) {
          const goalTitle = message.replace(/(new goal|create goal|add goal):?/i, "").trim() || "New Goal";
          const toolRes = executeMCPTool("goals_create", {
            title: goalTitle,
            targetDate: "2026-12-31",
            progress: 0
          }, data, saveDataFn);
          if (toolRes.success) {
            reply = `Done — goal '${goalTitle}' added.`;
          }
        }

        // Default fallback response
        if (!reply) {
          const pendingTasks = data.tasks.filter(t => t.status === "pending");
          if (lowerMsg.includes("task") || lowerMsg.includes("todo") || lowerMsg.includes("plan")) {
            if (pendingTasks.length === 0) {
              reply = "You have no pending tasks right now.";
            } else {
              const taskListStr = pendingTasks.slice(0, 4).map(t => `• ${t.title}`).join("\n");
              reply = `Here are your pending tasks:\n${taskListStr}`;
            }
          } else {
            reply = "I'm offline right now, but I can help you log tasks, habits, and expenses locally.";
          }
        }

        const assistantMessage: ChatMessage = {
          id: `chat_reply_${Date.now()}`,
          role: "assistant",
          content: reply,
          timestamp: new Date().toISOString()
        };

        const latestData = get().osData || data;
        const finalHistory = [...(latestData.chatHistory || []), assistantMessage];
        const finalData: FullOSData = {
          ...latestData,
          chatHistory: finalHistory
        };
        localStorage.setItem("lifeos_data", JSON.stringify(finalData));
        set({ osData: finalData, isUpdatingDb: false });
      }, 750);
      
      return { success: true };
    },

    logFocusSession: async (minutes, score) => {
      try {
        const todayStr = get().selectedDate || new Date().toISOString().split("T")[0];
        const data = await apiRequest<any>("/piggy/focus-log", {
          method: "POST",
          body: JSON.stringify({
            minutes,
            score,
            date: todayStr
          })
        });

        get().showToast(`Deep Work Block completed! Banked ${minutes} mins focus.`, "success");

        if (typeof get().hydrateSystemData === "function") {
          await get().hydrateSystemData();
        }

        return {
          success: true,
          summary: data?.summary || {
            todayCompletedBlocks: 1,
            todayTotalMinutes: minutes
          }
        };
      } catch (err: any) {
        console.error("Failed to log focus session:", err);
        get().showToast("Failed to log focus session to database.", "error");
        return { success: false };
      }
    },

    addExpense: async (expenseData) => {
      let newExpense: Expense;
      try {
        newExpense = await expenseService.create({
          amount: expenseData.amount,
          category: expenseData.category,
          note: expenseData.note,
          date: expenseData.date,
          isImpulsive: expenseData.isImpulsive || false
        });
      } catch (err) {
        console.error("Failed to create expense:", err);
        get().showToast("Failed to log expense.", "error");
        return;
      }

      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        data.expenses.unshift(newExpense);

        const categoryBudget = data.budgets.find((b) => b.category === newExpense.category);
        const totalSpentOnCategory = data.expenses
          .filter((e) => e.category === newExpense.category)
          .reduce((sum, e) => sum + e.amount, 0);

        if (categoryBudget && totalSpentOnCategory > categoryBudget.limit) {
          const budgetNotif: SystemNotification = {
            id: `notif_${Date.now()}`,
            title: "Critical: Budget Deficit Flagged",
            message: `The ledger limit for '${newExpense.category}' has been violated (₹${totalSpentOnCategory} spent of ₹${categoryBudget.limit} limit).`,
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
      let synced = true;
      try {
        await budgetService.upsert(category, limit);
      } catch (err) {
        synced = false;
        console.warn("Budget sync deferred/offline:", err);
      }

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
        if (!synced) {
          data.notifications = [
            {
              id: `notif_${Date.now()}`,
              title: "Budget saved locally",
              message: "Could not reach the server. The allocation will sync when you are back online.",
              timestamp: new Date().toISOString(),
              type: "warning",
              read: false
            },
            ...data.notifications
          ];
        }
        localStorage.setItem("lifeos_data", JSON.stringify(data));
        set({ osData: data });
        get().showToast(
          synced ? "Budget allocation updated." : "Budget allocation saved locally.",
          synced ? "success" : "warning"
        );
      } catch (err) {
        console.error(err);
      }
    },

    explainExpense: async (expenseId, explanation) => {
      let updatedExpense: Expense | null = null;
      try {
        updatedExpense = await expenseService.update(expenseId, { explanation });
      } catch (err) {
        console.warn("Expense explanation sync deferred/offline:", err);
      }

      const dataStr = localStorage.getItem("lifeos_data");
      if (!dataStr) return;
      try {
        const data: FullOSData = JSON.parse(dataStr);
        const exp = data.expenses.find((e) => e.id === expenseId);
        if (exp) {
          exp.explanation = explanation;
        } else if (updatedExpense) {
          data.expenses.unshift(updatedExpense);
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
        
        // Local calendar date (never shifted by UTC offset)
        const todayStr = getLocalDateString(new Date());
        const timestamp = new Date().toISOString();
        
        const totalHabits = data.habits.length;
        const completedHabits = data.habits.filter(h => safeLogs(h?.logs).includes(todayStr)).length;
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
        
        // Persist through backend (upsert by date). Falls back to a local
        // entry when offline so existing localStorage behavior is preserved.
        let savedEntry: DiaryEntry | null = null;
        try {
          savedEntry = await diaryService.create({
            date: todayStr,
            timestamp,
            content,
            review,
            mood,
            productivityScore
          });
        } catch (syncErr) {
          console.warn("Diary save deferred/offline:", syncErr);
        }

        const newEntry: DiaryEntry = savedEntry || {
          id: `diary_${Date.now()}`,
          date: todayStr,
          timestamp,
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
              try {
                await diaryService.create({
                  date: entry.date,
                  timestamp: entry.timestamp,
                  content: entry.content,
                  review: entry.review,
                  mood: entry.mood,
                  productivityScore: entry.productivityScore
                });
              } catch (syncErr) {
                console.warn("Diary restore deferred/offline:", syncErr);
              }
              const innerDataStr = localStorage.getItem("lifeos_data");
              if (innerDataStr) {
                const innerData: FullOSData = JSON.parse(innerDataStr);
                innerData.diaryEntries = innerData.diaryEntries || [];
                innerData.diaryEntries = innerData.diaryEntries.filter(e => e.date !== entry.date || e.id === entry.id);
                innerData.diaryEntries.push(entry);
                innerData.diaryEntries.sort((a, b) => String(b ? (b?.timestamp || (b as any)?.createdAt || "") : "").localeCompare(String(a ? (a?.timestamp || (a as any)?.createdAt || "") : "")));
                localStorage.setItem("lifeos_data", JSON.stringify(innerData));
                set({ osData: innerData });
              }
            });
            try {
              await diaryService.delete(entryId);
            } catch (syncErr) {
              console.warn("Diary delete deferred/offline:", syncErr);
            }
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

if (typeof window !== "undefined") {
  (window as any).useStore = useStore;
}

import React, { useState, useEffect, Suspense, lazy } from "react";
import { 
  Menu, X, Bell, User, LayoutDashboard, Calendar, RefreshCw, Target, 
  LineChart, Cpu, Clock, Settings, ShieldAlert, LogOut, CheckCircle, 
  Terminal, Sparkles, LogIn, ChevronRight, Zap, Info, Wallet, Scan,
  Sun, Moon, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { useStore } from "../store/useStore";
import { Task, Habit, Goal } from "../types";

// Modals and sidebars
import { TaskModal } from "../components/tasks/TaskModal";
import { DeferModal } from "../components/tasks/DeferModal";
import { NotificationDrawer } from "../components/notifications/NotificationDrawer";
import { DailyReviewModal } from "../components/reviews/DailyReviewModal";
import { SmartPlannerModal } from "../components/piggy/SmartPlannerModal";
import { WeeklyReviewModal } from "../components/reviews/WeeklyReviewModal";
import { OnboardingTour } from "../components/common/OnboardingTour";
import { ErrorBoundary } from "../components/common/ErrorBoundary"; // 🌟 ADDED: Our new safety net!

// Lazy views split
const DashboardView = lazy(() => import("../components/dashboard/DashboardView").then(m => ({ default: m.DashboardView })));
const AIDashboardView = lazy(() => import("../components/piggy/AIDashboardView").then(m => ({ default: m.AIDashboardView })));
const MissionsView = lazy(() => import("../components/tasks/MissionsView").then(m => ({ default: m.MissionsView })));
const HabitsView = lazy(() => import("../components/habits/HabitsView").then(m => ({ default: m.HabitsView })));
const GoalsView = lazy(() => import("../components/goals/GoalsView").then(m => ({ default: m.GoalsView })));
const AnalyticsView = lazy(() => import("../components/analytics/AnalyticsView").then(m => ({ default: m.AnalyticsView })));
const PiggyChatView = lazy(() => import("../components/piggy/PiggyChatView").then(m => ({ default: m.PiggyChatView })));
const FocusModeView = lazy(() => import("../components/focus/FocusModeView").then(m => ({ default: m.FocusModeView })));
const SettingsView = lazy(() => import("../components/settings/SettingsView").then(m => ({ default: m.SettingsView })));
const ExpensesView = lazy(() => import("../components/expenses/ExpensesView").then(m => ({ default: m.ExpensesView })));
const DiaryView = lazy(() => import("../components/diary/DiaryView").then(m => ({ default: m.DiaryView })));

export default function App() {
  const {
    token,
    isLoggedIn,
    osData,
    isUpdatingDb,
    activeView,
    isSidebarOpen,
    notificationsOpen,
    toasts,
    loginUsername,
    loginEmail,
    selectedTaskId,
    selectedTaskTitle,
    selectedHabitId,
    selectedHabitName,
    selectedDate,
    isTaskModalOpen,
    editingTask,
    isDeferModalOpen,
    deferringTask,
    isDailyReviewOpen,
    isPlannerModalOpen,
    plannerPlan,
    isWeeklyReviewOpen,
    isOffline,
    setToken,
    setIsLoggedIn,
    setCurrentUser,
    setActiveView,
    setIsSidebarOpen,
    setNotificationsOpen,
    setSelectedTaskId,
    setSelectedTaskTitle,
    setSelectedHabitId,
    setSelectedHabitName,
    setIsTaskModalOpen,
    setEditingTask,
    setIsDeferModalOpen,
    setDeferringTask,
    openDeferModal,
    setIsDailyReviewOpen,
    setIsPlannerModalOpen,
    setIsWeeklyReviewOpen,
    setPlannerPlan,
    showToast,
    dismissToast,
    hydrateSystemData,
    toggleTask,
    saveTask,
    rescheduleTask,
    deferTask,
    deleteTask,
    toggleHabit,
    updateHabitProgress,
    addHabit,
    deleteHabit,
    addGoal,
    deleteGoal,
    updateGoalProgress,
    saveProfile,
    clearNotifications,
    sendChatMessage,
    addExpense,
    updateBudget,
    explainExpense,
    simulatePlanTomorrow
  } = useStore();

  const handleSendMessage = async (text: string) => {
    await sendChatMessage(text, {});
  };

  const handleSaveProfile = async (profile: any) => {
    if (!osData) return;
    await saveProfile({
      name: profile.name,
      email: profile.email,
      budgetLimit: osData.profile.budgetLimit || 1000,
      aiPersonality: profile.aiPersonality,
      dailyPlanningReminderTime: osData.profile.dailyPlanningReminderTime || "08:00",
      dailyReviewTime: profile.dailyReviewTime || "21:30",
      listeningMode: profile.listeningMode || "push-to-talk",
      proactiveModeEnabled: profile.proactiveModeEnabled ?? true,
      maxProactiveNudges: profile.maxProactiveNudges ?? 2,
      activationWord: profile.activationWord || "piggy",
      learnedPatterns: profile.learnedPatterns,
      taskReminders: profile.taskReminders,
      habitNudges: profile.habitNudges,
      goalMilestones: profile.goalMilestones,
      missedAlerts: profile.missedAlerts,
      biometrics: profile.biometrics,
      faceUnlock: profile.faceUnlock,
      darkMode: profile.darkMode,
      highContrast: profile.highContrast,
    });
  };

  // Dark / Light Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  useEffect(() => {
    document.title = "bios";
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Splash Screen States
  const [splashStep, setSplashStep] = useState(0);
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const splashMessages = [
    "Calibrating system parameters...",
    "Synchronizing diagnostic telemetry logs...",
    "Hydrating local command matrices...",
    "Rebalancing financial allocations threshold...",
    "Piggy online. Uplink success, Sir."
  ];

  useEffect(() => {
    if (!isSplashDone) {
      const interval = setInterval(() => {
        setSplashStep((prev) => {
          if (prev >= splashMessages.length - 1) {
            clearInterval(interval);
            setTimeout(() => {
              setIsSplashDone(true);
            }, 650);
            return prev;
          }
          return prev + 1;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isSplashDone]);

  // Fetch full system state on mount or login
  useEffect(() => {
    if (isLoggedIn && token) {
      hydrateSystemData();
    }
  }, [isLoggedIn, token]);

  // 5-minute polling interval for system telemetry and warning notifications
  useEffect(() => {
    if (!token || !isLoggedIn) return;
    const intervalId = setInterval(() => {
      hydrateSystemData();
    }, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [token, isLoggedIn]);

  // Welcome tour auto-trigger
  useEffect(() => {
    if (isLoggedIn && osData) {
      const shown = localStorage.getItem(`onboarding_shown_${osData.profile.email}`);
      if (!shown) {
        setOnboardingOpen(true);
        localStorage.setItem(`onboarding_shown_${osData.profile.email}`, "true");
      }
    }
  }, [isLoggedIn, osData]);

  // Backbeat daemon monitoring clock to trigger the Nightly Review
  useEffect(() => {
    if (!osData || !isLoggedIn) return;
    
    const checkInterval = setInterval(() => {
      const now = new Date();
      const HH = now.getHours().toString().padStart(2, "0");
      const MM = now.getMinutes().toString().padStart(2, "0");
      const currentStamp = `${HH}:${MM}`;
      
      const targetReviewTime = osData.profile.dailyReviewTime || "21:30";
      const todayStr = now.toISOString().split("T")[0];
      const hasFiredReview = sessionStorage.getItem(`review_fired_${todayStr}`);
      
      if (currentStamp === targetReviewTime && !hasFiredReview) {
        sessionStorage.setItem(`review_fired_${todayStr}`, "true");
        setIsDailyReviewOpen(true);
        try {
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const speech = new SpeechSynthesisUtterance("Excuse me, Sir. It is 9:30 PM. Daily review parameters are ready for compilation.");
            speech.pitch = 0.95;
            speech.rate = 1.05;
            window.speechSynthesis.speak(speech);
          }
        } catch (e) {
          console.warn("Speech Synthesis failed", e);
        }
      }
    }, 45000);

    return () => clearInterval(checkInterval);
  }, [osData, isLoggedIn]);

  const unreadCount = React.useMemo(() => {
    if (!osData) return 0;
    return osData.notifications.filter(n => !n.read).length;
  }, [osData]);
  
  const realProductivityScore = React.useMemo(() => {
    if (!osData) return 0;
    const todayStrForScore = new Date().toISOString().split("T")[0];
    const taskScore = osData.tasks.length ? (osData.tasks.filter(t => t.status === "completed").length / osData.tasks.length) * 60 : 0;
    const habitScore = osData.habits.length ? (osData.habits.filter(h => h.logs.includes(todayStrForScore)).length / osData.habits.length) * 40 : 0;
    return Math.round(taskScore + habitScore);
  }, [osData]);

  const handleEditTaskTrigger = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleEditGoalTrigger = (id: string, progress: number) => {
    updateGoalProgress(id, progress);
  };

  // Render Splash Loading Page
  if (!isSplashDone) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="max-w-md w-full space-y-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-amber-500/[0.02] border border-amber-500/[0.04] animate-ping duration-3000 pointer-events-none" />

          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 animate-jarvis-breath mx-auto flex items-center justify-center">
            <Cpu className="w-10 h-10 text-slate-900" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-3xl tracking-widest text-amber-500 uppercase glow-text-amber">
              BIOS
            </h1>
            <p className="text-slate-500 font-mono text-[10px] tracking-widest">PERSONAL COMMAND COCKPIT</p>
          </div>

          <div className="pt-6 font-mono text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{splashMessages[splashStep]}</span>
            </div>
            
            <div className="w-48 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-300 rounded-full" 
                style={{ width: `${((splashStep + 1) / splashMessages.length) * 100}%` }}
              />
            </div>
          </div>

          <p className="border-t border-white/5 pt-4 text-[9px] text-slate-600 font-mono tracking-wider">
            PREVIEW ENGINE COGNITION BUILD VER 4.3.0
          </p>
        </div>
      </div>
    );
  }

  // Ensure database sync is finished
  if (!osData) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping mr-2" />
        Synchronizing databases files...
      </div>
    );
  }

  // 🌟 FIX (Phase 14): Wrapped the entire main view in the ErrorBoundary!
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-650 dark:text-slate-400 flex font-sans transition-colors duration-200">
        
        {/* Onboarding Tour */}
        <OnboardingTour 
          isOpen={onboardingOpen} 
          onClose={() => setOnboardingOpen(false)} 
          userName={osData.profile.name} 
        />

        {/* Futuristic Floating Vertical Rounded Sidebar (Desktop) */}
        <div className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-40 flex-col items-center bg-slate-900/95 dark:bg-slate-950/95 border border-slate-800 text-white rounded-3xl py-4 px-2.5 shadow-2xl gap-3 backdrop-blur-xl select-none max-h-[85vh]">
          {/* Decorative subtle top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-500/10 blur-md pointer-events-none" />

          {/* Core Profile Avatar Icon in bar */}
          <div className="flex flex-col items-center pb-2 border-b border-slate-800/60 w-full shrink-0">
            <div className="relative w-8 h-8 rounded-full border border-amber-500/30 overflow-hidden shadow">
              <img 
                src={osData.profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Navigation Options list */}
          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto no-scrollbar py-1">
            {[
              { key: "dashboard", label: "Mission Control", icon: LayoutDashboard },
              { key: "ai-dashboard", label: "AI Cockpit", icon: Sparkles },
              { key: "ai-core", label: "Direct Comms", icon: Terminal },
              { key: "missions", label: "Tactical Missions", icon: CheckCircle },
              { key: "habits", label: "Habit Routines", icon: RefreshCw },
              { key: "goals", label: "Strategic Vault", icon: Target },
              { key: "expenses", label: "Budget Allocations", icon: Wallet },
              { key: "diary", label: "Nightly Reflection", icon: BookOpen },
              { key: "analytics", label: "Diagnostic Logs", icon: LineChart },
              { key: "focus-timer", label: "Focus Timer", icon: Clock },
              { key: "settings", label: "System Config", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => setActiveView(item.key as any)}
                  className={`group relative p-2.5 rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-center ${
                    isActive
                      ? "bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 scale-105"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                  
                  {/* Tooltip popping to the right */}
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-2xl z-50">
                    {item.label}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="w-full h-px bg-slate-800/60 shrink-0" />

          {/* Footer Options */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {/* Theme switcher */}
            <button
              type="button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className={`p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center group relative ${
                theme === "dark"
                  ? "text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon className="w-5 h-5 shrink-0" /> : <Sun className="w-5 h-5 shrink-0" />}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-2xl z-50">
                {theme === "light" ? "Activate Dark Theme" : "Activate Light Theme"}
              </div>
            </button>

            {/* Logout */}
            <button
              onClick={() => setToken(null)}
              className="p-2.5 rounded-2xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-all cursor-pointer flex items-center justify-center group relative"
              title="Lock System"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <div className="absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-2xl z-50">
                Lock System
              </div>
            </button>
          </div>
        </div>

        {/* Mobile slide-in Rounded Drawer */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-black md:hidden"
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="fixed top-4 left-4 bottom-4 w-64 z-50 flex md:hidden flex-col bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-2xl overflow-y-auto"
              >
                {/* Mobile sidebar header */}
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 opacity-35 blur-sm animate-pulse" />
                      <div className="w-9 h-9 rounded-full border border-amber-500/30 overflow-hidden">
                        <img 
                          src={osData.profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xs text-amber-500 tracking-wider uppercase">
                        {osData.profile.name}
                      </h3>
                      <span className="text-[8px] font-mono text-slate-400 block uppercase">MOBILE CORE</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Navigation List */}
                <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
                  {[
                    { key: "dashboard", label: "Mission Control", icon: LayoutDashboard },
                    { key: "ai-dashboard", label: "AI Cockpit", icon: Sparkles },
                    { key: "ai-core", label: "Direct Comms", icon: Terminal },
                    { key: "missions", label: "Tactical Missions", icon: CheckCircle },
                    { key: "habits", label: "Habit Routines", icon: RefreshCw },
                    { key: "goals", label: "Strategic Vault", icon: Target },
                    { key: "expenses", label: "Budget Allocations", icon: Wallet },
                    { key: "diary", label: "Nightly Reflection", icon: BookOpen },
                    { key: "analytics", label: "Diagnostic Logs", icon: LineChart },
                    { key: "focus-timer", label: "Focus Timer", icon: Clock },
                    { key: "settings", label: "System Config", icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.key;

                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActiveView(item.key as any);
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full rounded-2xl px-3.5 py-3 gap-3 text-left transition-all duration-300 flex items-center ${
                          isActive 
                            ? "bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/20" 
                            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-semibold tracking-wide">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Mobile sidebar footer */}
                <div className="pt-4 border-t border-slate-800/60 space-y-2">
                  <button
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-2.5 hover:bg-slate-800/60 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    <span className="text-xs font-semibold">Visual Polarizer</span>
                  </button>

                  <button
                    onClick={() => {
                      setToken(null);
                      setIsSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-2.5 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-xs font-semibold">Lock System</span>
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Orbital System Hub Menu Overlay */}
        <AnimatePresence>
          {isHubOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/90 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden"
            >
              {/* Glowing Background Radial Accents */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] rounded-full bg-gradient-to-tr from-amber-500/10 to-indigo-500/10 blur-[80px] sm:blur-[120px] pointer-events-none" />
              
              {/* Close Button top right */}
              <button 
                onClick={() => setIsHubOpen(false)}
                className="absolute top-6 right-6 w-12 h-12 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all duration-200 cursor-pointer group"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              </button>

              {/* Title & Status */}
              <div className="absolute top-8 text-center font-mono space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="font-display font-black text-lg sm:text-xl tracking-widest text-amber-500 uppercase glow-text-amber">
                    SYSTEM ORBIT HUB
                  </h2>
                </div>
                <p className="text-slate-400 text-[9px] sm:text-[10px] tracking-wider uppercase font-mono">
                  Select active life module parameters
                </p>
              </div>

              {/* Dynamic Circular Orbit Container */}
              <div className="relative w-full max-w-4xl h-[450px] sm:h-[650px] flex items-center justify-center">
                
                {/* SVG Connecting lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  {[...Array(12)].map((_, i) => {
                    const angleRad = (i * 2 * Math.PI) / 12 - Math.PI / 2;
                    const r = windowWidth < 640 ? 115 : 240;
                    const x = Math.round(Math.cos(angleRad) * r);
                    const y = Math.round(Math.sin(angleRad) * r);
                    return (
                      <line
                        key={i}
                        x1="50%"
                        y1="50%"
                        x2={`calc(50% + ${x}px)`}
                        y2={`calc(50% + ${y}px)`}
                        className="stroke-slate-800 dark:stroke-slate-800"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    );
                  })}
                </svg>

                {/* Connecting rings */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-800 pointer-events-none w-[230px] h-[230px] sm:w-[480px] sm:h-[480px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-900 pointer-events-none w-[115px] h-[115px] sm:w-[240px] sm:h-[240px]" />
                
                {/* Core Center Hub */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", delay: 0.1, stiffness: 80 }}
                  className="absolute z-10 w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-slate-900 border border-white/10 flex flex-col items-center justify-center text-center shadow-2xl p-2 sm:p-3 select-none"
                >
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 blur-sm animate-pulse" />
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-amber-500/30 mb-1 sm:mb-1.5 shadow-md">
                    <img 
                      src={osData.profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-[9px] sm:text-xs font-bold text-white tracking-wide truncate max-w-[80px] sm:max-w-[100px]">
                    {osData.profile.name}
                  </h3>
                  <div className="font-mono text-[7px] sm:text-[8px] text-slate-400 mt-0.5 space-y-0.5 uppercase tracking-wider">
                    <div>Productivity</div>
                    <div className="text-amber-500 font-extrabold text-[9px] sm:text-[10px]">{realProductivityScore}%</div>
                  </div>
                </motion.div>

                {/* Orbital Node Buttons */}
                {[
                  { key: "dashboard", label: "Mission Control", icon: LayoutDashboard, color: "from-amber-500 to-yellow-400 text-slate-950", description: "Aggregated real-time systems summary" },
                  { key: "ai-dashboard", label: "AI Cockpit", icon: Sparkles, color: "from-indigo-500 to-purple-500 text-white", description: "Automated neural coach analysis" },
                  { key: "ai-core", label: "Direct Comms", icon: Terminal, color: "from-emerald-500 to-teal-500 text-white", description: "Interactive diagnostic console" },
                  { key: "missions", label: "Tactical Missions", icon: CheckCircle, color: "from-rose-500 to-pink-500 text-white", description: "Eisenhower operational matrix" },
                  { key: "habits", label: "Habit Routines", icon: RefreshCw, color: "from-sky-500 to-blue-500 text-white", description: "Neuroplastic routine logs" },
                  { key: "goals", label: "Strategic Vault", icon: Target, color: "from-cyan-500 to-teal-500 text-white", description: "Long-term objective protocols" },
                  { key: "expenses", label: "Budget Allocations", icon: Wallet, color: "from-orange-500 to-amber-500 text-white", description: "Ledger limits & audits" },
                  { key: "analytics", label: "Diagnostic Logs", icon: LineChart, color: "from-fuchsia-500 to-purple-500 text-white", description: "Statistical performance indices" },
                  { key: "focus-timer", label: "Focus Timer", icon: Clock, color: "from-violet-500 to-purple-500 text-white", description: "Deep work interval chronometer" },
                  { key: "settings", label: "System Config", icon: Settings, color: "from-slate-500 to-slate-400 text-white", description: "Core OS parameters tuning" },
                  { key: "theme", label: theme === "light" ? "Dark Theme" : "Light Theme", icon: theme === "light" ? Moon : Sun, color: "from-blue-500 to-indigo-600 text-white", description: "Visual interface polarization", action: "theme" },
                  { key: "logout", label: "Lock System", icon: LogOut, color: "from-rose-600 to-red-600 text-white", description: "Flush sessions & lock vault", action: "logout" }
                ].map((item, i) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.key;
                  
                  // Math for positions around the circle
                  const angleRad = (i * 2 * Math.PI) / 12 - Math.PI / 2; // Subtract PI/2 to start at top
                  const r = windowWidth < 640 ? 115 : 240;
                  const x = Math.round(Math.cos(angleRad) * r);
                  const y = Math.round(Math.sin(angleRad) * r);

                  return (
                    <motion.div
                      key={item.key}
                      initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                      animate={{ scale: 1, x, y, opacity: 1 }}
                      exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 95, 
                        damping: 15, 
                        delay: i * 0.025 
                      }}
                      className="absolute"
                    >
                      {/* Interactive circular item */}
                      <button
                        onClick={() => {
                          if (item.action === "theme") {
                            setTheme(theme === "light" ? "dark" : "light");
                          } else if (item.action === "logout") {
                            setToken(null);
                            setIsHubOpen(false);
                          } else {
                            setActiveView(item.key as any);
                            setIsHubOpen(false);
                          }
                        }}
                        className={`group w-12 h-12 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center relative cursor-pointer select-none transition-all duration-300 ${
                          isActive 
                            ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 border-2 border-amber-300 scale-110 shadow-lg shadow-amber-500/20" 
                            : "bg-slate-900/95 border border-white/10 text-slate-300 hover:text-white hover:border-amber-500/50 hover:bg-slate-800"
                        }`}
                      >
                        <div className="absolute inset-0 rounded-full border border-dashed border-transparent group-hover:border-amber-500/30 group-hover:scale-115 transition-all duration-500 animate-spin" style={{ animationDuration: '10s' }} />
                        <Icon className={`w-4 h-4 sm:w-5.5 sm:h-5.5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-slate-950" : ""}`} />
                        
                        {/* Interactive dynamic tooltip details */}
                        <div className="absolute -bottom-8 sm:-bottom-10 whitespace-nowrap bg-slate-900 border border-white/10 px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-mono text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-30">
                          {item.label}
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Interactive Module Info Indicator bottom */}
              <div className="absolute bottom-6 max-w-md w-full px-6 text-center text-slate-500 font-mono text-[8px] sm:text-[9px] tracking-wider uppercase">
                BIOS Orbit Navigation &bull; Select elements for direct parameters routing
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950 md:pl-24 transition-all duration-300">
          
          {/* Top Header navbar */}
          <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-20">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Toggle Sidebar Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 animate-jarvis-breath flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                </div>
                <span className="font-display font-black text-sm tracking-widest text-amber-500 dark:text-amber-400 uppercase shrink-0 glow-text-amber">
                  BIOS
                </span>
                <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 hidden sm:inline ml-1 uppercase">
                  v4.3.0
                </span>
              </div>
              {isOffline && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg uppercase animate-pulse flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Offline Mode
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Theme quick toggle */}
              <button
                type="button"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5 text-amber-400" />}
              </button>

              {/* Onboarding tour link */}
              <button
                onClick={() => setOnboardingOpen(true)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer font-mono hidden sm:flex"
              >
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                SYSTEM TOUR
              </button>

              {/* Notification triggers */}
              <button 
                onClick={() => setNotificationsOpen(true)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full relative hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-slate-950 font-mono text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* BIG CIRCLE NAVIGATION HUB TRIGGER */}
              <button 
                onClick={() => setIsHubOpen(true)}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 dark:from-amber-600 dark:to-yellow-500 text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-amber-500/20 relative z-30 cursor-pointer border border-amber-400/50 group"
                title="System Orbit Core"
              >
                {/* Dynamic concentric rotating rings */}
                <span className="absolute inset-0 rounded-full border border-amber-400/30 group-hover:scale-125 transition-transform duration-500 animate-spin" style={{ animationDuration: '8s' }} />
                <span className="absolute inset-1 rounded-full border border-dashed border-amber-400/20 group-hover:scale-115 transition-transform duration-500 animate-reverse-spin" style={{ animationDuration: '12s' }} />
                
                {/* Central animated icon */}
                <Cpu className="w-5 h-5 text-slate-950 animate-pulse group-hover:rotate-45 transition-transform duration-300" />
                
                {/* Glowing status dot */}
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 border-2 border-white dark:border-slate-900 rounded-full animate-bounce" />
              </button>

              {/* Profile Dropdown info */}
              <div className="flex items-center gap-2 border-l border-slate-100 dark:border-slate-800 pl-4">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                  <img 
                    src={osData.profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{osData.profile.name}</p>
                  <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{osData.profile.aiPersonality} Coach Mode</p>
                </div>
              </div>
            </div>
          </header>

          {/* Global loading telemetry indicator */}
          {isUpdatingDb && (
            <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
              <div className="h-full bg-amber-500 w-1/3 animate-progress-telemetry rounded-full" />
            </div>
          )}

          {/* Render Views split bundle */}
          <main className="flex-1 p-6 overflow-y-auto">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-400 font-display text-sm tracking-widest uppercase">Calibrating system parameters...</p>
              </div>
            }>
              {activeView === "dashboard" && (
                <DashboardView
                  data={osData}
                  token={token}
                  onToggleTask={toggleTask}
                  onEditTask={handleEditTaskTrigger}
                  onDeleteTask={deleteTask}
                  onRescheduleTaskSubmit={rescheduleTask}
                  onDeferTask={openDeferModal}
                  onNavigateToView={(view) => setActiveView(view as any)}
                  onOpenCreateTaskModal={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  onTriggerDailyReview={() => setIsDailyReviewOpen(true)}
                  onTriggerWeeklyReview={() => setIsWeeklyReviewOpen(true)}
                  selectedTaskId={selectedTaskId}
                  onFocusTask={(id, title) => {
                    setSelectedTaskId(id);
                    setSelectedTaskTitle(title);
                  }}
                  onNudgeTriggered={hydrateSystemData}
                />
              )}

              {activeView === "missions" && (
                <MissionsView
                  tasks={osData.tasks}
                  onToggleTask={toggleTask}
                  onEditTask={handleEditTaskTrigger}
                  onDeleteTask={deleteTask}
                  onOpenCreateModal={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  onRescheduleTaskSubmit={rescheduleTask}
                  onDeferTask={openDeferModal}
                  selectedTaskId={selectedTaskId}
                  onFocusTask={(id, title) => {
                    setSelectedTaskId(id);
                    setSelectedTaskTitle(title);
                  }}
                />
              )}

              {activeView === "habits" && (
                <HabitsView
                  habits={osData.habits}
                  selectedDate={selectedDate}
                  onToggleHabit={toggleHabit}
                  onUpdateHabitProgress={updateHabitProgress}
                  onAddHabit={addHabit}
                  onDeleteHabit={deleteHabit}
                  selectedHabitId={selectedHabitId}
                  onFocusHabit={(id, name) => {
                    setSelectedHabitId(id);
                    setSelectedHabitName(name);
                  }}
                />
              )}

              {activeView === "goals" && (
                <GoalsView 
                  goals={osData.goals || []}
                  onAddGoal={addGoal}
                  onDeleteGoal={deleteGoal}
                  onUpdateProgress={handleEditGoalTrigger}
                />
              )}

              {activeView === "analytics" && (
                <AnalyticsView 
                  tasks={osData.tasks} 
                  habits={osData.habits} 
                  profileName={osData.profile.name} 
                />
              )}

              {activeView === "ai-dashboard" && (
                <AIDashboardView token={token} profileName={osData.profile.name} />
              )}

              {activeView === "diary" && (
                <DiaryView />
              )}
              
              {activeView === "ai-core" && (
                <PiggyChatView
                  chatHistory={osData.chatHistory}
                  onSendMessage={handleSendMessage}
                  isLoading={isUpdatingDb}
                  token={token}
                />
              )}

              {activeView === "focus-timer" && (
                <FocusModeView defaultTaskTitle={selectedTaskTitle || undefined} token={token} />
              )}

              {activeView === "settings" && (
                <SettingsView
                  initialProfile={osData.profile}
                  onSaveProfile={handleSaveProfile}
                />
              )}
              
              {activeView === "expenses" && (
                <ExpensesView
                  expenses={osData.expenses || []}
                  budgets={osData.budgets || []}
                  token={token}
                  onAddExpense={(data: any) => addExpense(data)}
                  onUpdateBudget={updateBudget}
                  onExplainExpense={explainExpense}
                />
              )}
            </Suspense>
          </main>
        </div>

        {/* Slide-out Notification panel drawer */}
        <NotificationDrawer
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          notifications={osData.notifications}
          onClearRead={clearNotifications}
          user={osData.profile}
        />

        {/* Task Modal editing window */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          onSave={(taskData: any) => {
            saveTask({
              ...editingTask,
              ...taskData,
              id: editingTask?.id,
              status: editingTask?.status || "pending",
              rescheduledCount: editingTask?.rescheduledCount || 0
            });
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          initialTask={editingTask || undefined}
        />

        {/* Universal Defer / Procrastination Shield Modal */}
        <DeferModal
          isOpen={isDeferModalOpen}
          onClose={() => {
            setIsDeferModalOpen(false);
            setDeferringTask(null);
          }}
          task={deferringTask}
          onConfirmDefer={(taskId, options) => {
            deferTask(taskId, options);
          }}
        />

        {/* Daily Review Assessment popup modal */}
        <DailyReviewModal
          isOpen={isDailyReviewOpen}
          onClose={() => setIsDailyReviewOpen(false)}
          tasksCompleted={osData.tasks.filter(t => t.status === "completed").length}
          totalTasks={osData.tasks.length}
          habitsCompleted={osData.habits.filter(h => h.logs.includes(new Date().toISOString().split("T")[0])).length}
          totalHabits={osData.habits.length}
          activeStreak={osData.habits.length > 0 ? Math.max(...osData.habits.map(h => h.streak), 0) : 0}
          productivityScore={realProductivityScore}
          onPlanTomorrow={async () => {
            setIsDailyReviewOpen(false);
            await simulatePlanTomorrow();
            setIsPlannerModalOpen(true);
          }}
        />

        {/* Smart scheduling results dashboard */}
        <SmartPlannerModal
          isOpen={isPlannerModalOpen}
          onClose={() => setIsPlannerModalOpen(false)}
          plan={plannerPlan}
        />

        {/* Weekly review logs modal */}
        <WeeklyReviewModal
          isOpen={isWeeklyReviewOpen}
          onClose={() => setIsWeeklyReviewOpen(false)}
          token={token}
        />

        {/* Toast Alert HUD overlay */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 rounded-xl shadow-xl border flex items-center justify-between gap-3 backdrop-blur-md pointer-events-auto animate-in slide-in-from-right duration-300 font-display ${
                toast.type === "success"
                  ? "bg-emerald-950/80 border-emerald-500/20 text-emerald-300"
                  : toast.type === "error"
                  ? "bg-rose-950/80 border-rose-500/20 text-rose-300"
                  : toast.type === "warning"
                  ? "bg-amber-950/80 border-amber-500/20 text-amber-300"
                  : "bg-slate-900/80 border-slate-700/30 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4.5 h-4.5 shrink-0" />
                <span className="text-xs font-semibold leading-tight">{toast.message}</span>
              </div>
              {toast.onUndo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.onUndo?.();
                    dismissToast(toast.id);
                  }}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-mono text-[9px] rounded-lg cursor-pointer transition-all"
                >
                  Undo
                </button>
              )
              }
            </div>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}


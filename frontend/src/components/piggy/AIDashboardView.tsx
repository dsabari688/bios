import React from "react";
import { Sparkles, CheckCircle2, Flame, Target, TrendingUp, AlertCircle, Clock, Award, ShieldCheck } from "lucide-react";
import { useStore } from "../../store/useStore";
import { safeLogs } from "../../types";
import { getLocalDateString } from "../../lib/timeUtils";

interface AIDashboardViewProps {
  token: string | null;
  profileName: string;
}

export const AIDashboardView: React.FC<AIDashboardViewProps> = ({ profileName }) => {
  const { osData } = useStore();

  const tasks = osData?.tasks || [];
  const habits = osData?.habits || [];
  const goals = osData?.goals || [];
  const todayStr = getLocalDateString(new Date());

  // Task Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const overdueTasks = tasks.filter(t => t.status === "pending" && t.date < todayStr).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const nextPendingTask = tasks.find(t => t.status === "pending" && t.date === todayStr) || tasks.find(t => t.status === "pending");

  // Habit Metrics
  const totalHabits = habits.length;
  const habitsDoneToday = habits.filter(h => safeLogs(h?.logs).includes(todayStr)).length;
  const habitCompletionRate = totalHabits > 0 ? Math.round((habitsDoneToday / totalHabits) * 100) : 0;
  const longestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak || 0)) : 0;
  const bestHabit = habits.length > 0 ? [...habits].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0] : null;

  // Goal Metrics
  const totalGoals = goals.length;
  const activeGoals = goals.filter(g => g.status !== "completed");
  const completedGoals = goals.filter(g => g.status === "completed").length;
  const avgGoalProgress = totalGoals > 0 
    ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / totalGoals) 
    : 0;
  const topGoal = goals.length > 0 ? [...goals].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0] : null;

  // Single Compound Health & Momentum Score
  const overallScore = Math.round(
    (taskCompletionRate * 0.4) + 
    (habitCompletionRate * 0.35) + 
    (avgGoalProgress * 0.25)
  );

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
    if (score >= 40) return "text-amber-500 border-amber-500/20 bg-amber-500/10";
    return "text-indigo-500 border-indigo-500/20 bg-indigo-500/10";
  };

  const displayName = profileName ? profileName.split(" ")[0] : "Commander";

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight">
              AI Analysis
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
            Unified analysis of your tasks, habits, and long-term goals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {todayStr}
          </span>
        </div>
      </div>

      {/* 4 Core Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Momentum Score */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Overall Momentum</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-display font-bold text-3xl text-slate-900 dark:text-slate-100">{overallScore}</span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-2 px-2 py-0.5 rounded-full border ${getScoreColor(overallScore)}`}>
            <ShieldCheck className="w-3 h-3" />
            {overallScore >= 70 ? "OPTIMAL" : overallScore >= 40 ? "ACTIVE" : "STARTING"}
          </span>
        </div>

        {/* Task Completion Rate */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Tasks Completed</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-display font-bold text-3xl text-slate-900 dark:text-slate-100">{taskCompletionRate}%</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-2 font-mono">
            {completedTasks} of {totalTasks} finished
          </span>
        </div>

        {/* Habit Consistency */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Habit Consistency</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-display font-bold text-3xl text-amber-500">{habitCompletionRate}%</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-2 font-mono">
            {habitsDoneToday} of {totalHabits} logged today
          </span>
        </div>

        {/* Strategic Goals Progress */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Goal Progress</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-display font-bold text-3xl text-indigo-500">{avgGoalProgress}%</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-2 font-mono">
            {activeGoals.length} active objectives
          </span>
        </div>
      </div>

      {/* Coach Advice Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/10 dark:from-amber-500/15 dark:via-transparent dark:to-indigo-500/15 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm font-bold">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-0.5">
            Coach Briefing for {displayName}
          </p>
          <p>
            {overdueTasks > 0
              ? `You have ${overdueTasks} overdue task(s) needing attention. Clearing these out will immediately restore focus and reduce backlog stress.`
              : pendingTasks > 0
              ? `You have ${pendingTasks} task(s) active today. Complete your top priority first to maintain a strong daily streak.`
              : totalTasks === 0 && totalHabits === 0
              ? `Your workspace is fresh! Add your daily missions and routines to begin generating automated intelligence.`
              : `Great job maintaining clarity across your workspace! Continue checking off your daily habits to build compound momentum.`
            }
          </p>
        </div>
      </div>

      {/* 3 Clear Analysis Cards: Task, Habit, Goal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* 1. Tasks Analysis */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Tasks Analysis
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-slate-500">{taskCompletionRate}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${taskCompletionRate}%` }} 
              />
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
              <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block">Done</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{completedTasks}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block">Pending</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{pendingTasks}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block">Overdue</span>
                <span className={`font-bold text-sm ${overdueTasks > 0 ? "text-amber-500" : "text-slate-400"}`}>{overdueTasks}</span>
              </div>
            </div>
          </div>

          {/* AI Takeaway */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-xl text-xs text-slate-600 dark:text-slate-400">
            {overdueTasks > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">⚠️ Reschedule or resolve {overdueTasks} past-due tasks to keep your schedule accurate.</span>
            ) : nextPendingTask ? (
              <span>🎯 Next priority: <strong className="text-slate-800 dark:text-slate-200">"{nextPendingTask.title}"</strong></span>
            ) : totalTasks > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">✅ All missions for today are cleared!</span>
            ) : (
              <span>Add your daily tasks to track your completion rate.</span>
            )}
          </div>
        </div>

        {/* 2. Habits Analysis */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Flame className="w-4.5 h-4.5 text-amber-500" />
                <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Habits Analysis
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-amber-500">{habitCompletionRate}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                style={{ width: `${habitCompletionRate}%` }} 
              />
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
              <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block">Today</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{habitsDoneToday}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block">Total</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{totalHabits}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block">Streak</span>
                <span className="font-bold text-amber-500 text-sm">{longestStreak}d</span>
              </div>
            </div>
          </div>

          {/* AI Takeaway */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-xl text-xs text-slate-600 dark:text-slate-400">
            {habitsDoneToday === totalHabits && totalHabits > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">🔥 All habits checked in today! Consistency streak protected.</span>
            ) : bestHabit && bestHabit.streak > 0 ? (
              <span>⚡ Strongest streak on <strong className="text-slate-800 dark:text-slate-200">"{bestHabit.name}"</strong> ({bestHabit.streak} days).</span>
            ) : totalHabits > 0 ? (
              <span>⏳ {totalHabits - habitsDoneToday} routine(s) left to log today.</span>
            ) : (
              <span>Install your daily routines to track streaks and consistency.</span>
            )}
          </div>
        </div>

        {/* 3. Goals Analysis */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-4.5 h-4.5 text-indigo-500" />
                <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Goals Analysis
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-indigo-500">{avgGoalProgress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                style={{ width: `${avgGoalProgress}%` }} 
              />
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
              <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block">Active</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{activeGoals.length}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block">Done</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{completedGoals}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block">Total</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{totalGoals}</span>
              </div>
            </div>
          </div>

          {/* AI Takeaway */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-xl text-xs text-slate-600 dark:text-slate-400">
            {topGoal && topGoal.progress >= 75 ? (
              <span className="text-indigo-600 dark:text-indigo-400">🚀 <strong className="text-slate-800 dark:text-slate-200">"{topGoal.title}"</strong> is at {topGoal.progress}%! Push to cross the finish line.</span>
            ) : topGoal ? (
              <span>🎯 Highest progress: <strong className="text-slate-800 dark:text-slate-200">"{topGoal.title}"</strong> ({topGoal.progress}%).</span>
            ) : (
              <span>Define milestone goals in your Goal Vault to guide your daily priorities.</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

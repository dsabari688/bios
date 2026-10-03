import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, CheckCircle2, Clock, Flame, BarChart2 } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { analyticsApi, type DiagnosticMetrics } from "../../api/analytics.api";
import { Task, Habit, safeLogs } from "../../types";
import { getLocalDateString } from "../../lib/timeUtils";

interface AnalyticsViewProps {
  tasks: Task[];
  habits: Habit[];
  profileName: string;
}

const PERIOD_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tasks, habits, profileName }) => {
  const [periodIndex, setPeriodIndex] = useState(0);
  const [metrics, setMetrics] = useState<DiagnosticMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedDays = PERIOD_OPTIONS[periodIndex].days;
  const todayStr = getLocalDateString(new Date());

  const fetchMetrics = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);

    const computeLocalMetrics = (): DiagnosticMetrics => {
      const totalTrackedTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === "completed").length;
      const missedTasks = tasks.filter(t => t.status === "pending" && t.date < todayStr).length;
      const completionRate = totalTrackedTasks > 0 ? Math.round((completedTasks / totalTrackedTasks) * 100) : 0;

      const flow = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayTasks = tasks.filter(t => t.date === dateStr);
        const dayDone = dayTasks.filter(t => t.status === "completed").length;
        const dayRate = dayTasks.length > 0 ? Math.round((dayDone / dayTasks.length) * 100) : 0;
        flow.push({
          date: dateStr,
          totalTasks: dayTasks.length,
          completedTasks: dayDone,
          missedTasks: dayTasks.filter(t => t.status === "pending").length,
          completionRate: dayRate,
          focusBlocksCompleted: dayDone
        });
      }

      return {
        totalTrackedTasks,
        completionRate,
        missedTasks,
        focusBlocksCompleted: completedTasks,
        chronologicalFlow: flow
      };
    };

    try {
      const data = await analyticsApi.getDiagnosticMetrics(days);
      if (data && Array.isArray(data.chronologicalFlow)) {
        setMetrics(data);
      } else {
        setMetrics(computeLocalMetrics());
      }
    } catch {
      setMetrics(computeLocalMetrics());
    } finally {
      setLoading(false);
    }
  }, [tasks, todayStr]);

  useEffect(() => {
    fetchMetrics(selectedDays);
  }, [selectedDays, fetchMetrics]);

  const displayRate = metrics?.completionRate ?? 0;
  const displayMissed = metrics?.missedTasks ?? 0;
  const displayTotal = metrics?.totalTrackedTasks ?? tasks.length;
  const displayFocus = metrics?.focusBlocksCompleted ?? tasks.filter(t => t.status === "completed").length;

  const metricsDisplay = [
    { value: `${displayRate}%`, label: "Completion Rate", trend: "Period average", isPositive: displayRate >= 50 },
    { value: `${displayMissed}`, label: "Overdue Tasks", trend: displayMissed === 0 ? "All caught up" : "Action needed", isPositive: displayMissed === 0 },
    { value: `${displayTotal}`, label: "Total Tasks", trend: `Last ${selectedDays} days`, isPositive: true },
    { value: `${displayFocus}`, label: "Completed Tasks", trend: "Total done", isPositive: displayFocus > 0 }
  ];

  const barChartData = (metrics?.chronologicalFlow ?? []).map((entry) => {
    const d = new Date(entry.date + "T00:00:00");
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

    return {
      day: dayName,
      dateStr: entry.date,
      completion: entry.completionRate,
      isToday: entry.date === todayStr,
    };
  });

  // Calculate simple summary highlights
  const completedTasksCount = tasks.filter(t => t.status === "completed").length;
  const pendingTasksCount = tasks.filter(t => t.status === "pending").length;
  const habitsDoneToday = habits.filter(h => safeLogs(h?.logs).includes(todayStr)).length;
  const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak || 0)) : 0;

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Header & Period Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight">
            Analytics & Trends
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
            Review your completion rates, habits, and productivity overview.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-1 shadow-xs self-start sm:self-auto">
          {PERIOD_OPTIONS.map((opt, idx) => (
            <button
              key={opt.label}
              onClick={() => setPeriodIndex(idx)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                periodIndex === idx
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-sans text-xs">Loading analytics...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4 text-center">
          <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>
          <button
            onClick={() => fetchMetrics(selectedDays)}
            className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && metrics && (
        <>
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metricsDisplay.map((m, idx) => (
              <div 
                key={idx} 
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 p-5 shadow-xs transition-all"
              >
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">{m.label}</span>
                <span className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 block mt-1">{m.value}</span>

                <span className={`inline-flex items-center gap-1 text-[11px] font-medium mt-2 px-2 py-0.5 rounded-full border ${
                  m.isPositive 
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40' 
                    : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40'
                }`}>
                  {m.isPositive ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                  {m.trend}
                </span>
              </div>
            ))}
          </div>

          {/* Chart & Summary Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Task Completion Bar Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4.5 h-4.5 text-amber-500" />
                  <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Task Completion Rate
                  </h3>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                  Daily completion percentages over the last {selectedDays} days.
                </p>
              </div>

              <div className="h-64 w-full">
                {barChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="day"
                        tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'Plus Jakarta Sans', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'Plus Jakarta Sans', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(241, 245, 249, 0.2)' }}
                        contentStyle={{ 
                          background: '#0F172A', 
                          border: '1px solid #1E293B', 
                          borderRadius: '12px', 
                          color: '#fff', 
                          fontSize: '12px', 
                          fontFamily: 'Plus Jakarta Sans' 
                        }}
                        formatter={(val: any) => [`${val}%`, 'Completion']}
                      />
                      <Bar dataKey="completion" radius={[6, 6, 0, 0]} maxBarSize={36}>
                        {barChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.isToday ? "#F59E0B" : "#cbd5e1"}
                            className="dark:fill-slate-700 hover:opacity-80 transition-opacity"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600 text-xs">
                    No data recorded for this period
                  </div>
                )}
              </div>
            </div>

            {/* Simple Highlights & Summary Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Summary Breakdown
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Current status across tasks and habits
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Tasks breakdown */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Completed Tasks</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">{pendingTasksCount} pending</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      {completedTasksCount} / {tasks.length}
                    </span>
                  </div>

                  {/* Habits streak */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Habits Done Today</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">Longest streak: {maxStreak}d</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      {habitsDoneToday} / {habits.length}
                    </span>
                  </div>

                  {/* Overdue alert */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Pending Overdue</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">Past target date</span>
                      </div>
                    </div>
                    <span className={`font-mono font-bold text-sm ${displayMissed > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {displayMissed}
                    </span>
                  </div>
                </div>
              </div>

              {/* Friendly Takeaway */}
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300">
                {displayRate >= 70 ? (
                  <p>🌟 <strong>Great momentum!</strong> You're consistently completing most of your scheduled tasks.</p>
                ) : displayRate >= 40 ? (
                  <p>⚡ <strong>Steady progress.</strong> Focus on checking off your highest priority missions today.</p>
                ) : (
                  <p>🌱 <strong>Fresh start.</strong> Pick 1 or 2 small tasks today to get momentum going.</p>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};


import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, Activity, Sparkles, Brain } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { analyticsApi, type DiagnosticMetrics } from "../../api/analytics.api";
import { Task, Habit } from "../../types";

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

  const fetchMetrics = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getDiagnosticMetrics(days);
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(selectedDays);
  }, [selectedDays, fetchMetrics]);

  const handlePeriodChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < PERIOD_OPTIONS.length) {
      setPeriodIndex(newIndex);
    }
  };

  const displayRate = metrics?.completionRate ?? 0;
  const displayMissed = metrics?.missedTasks ?? 0;
  const displayTotal = metrics?.totalTrackedTasks ?? 0;
  const displayFocus = metrics?.focusBlocksCompleted ?? 0;

  const metricsDisplay = [
    { value: `${displayRate}%`, label: "Completion Rate", trend: "Period average", isPositive: displayRate >= 50 },
    { value: `${displayMissed}`, label: "Missed Tasks", trend: "Past due pending", isPositive: displayMissed === 0 },
    { value: `${displayTotal}`, label: "Total Tracked Tasks", trend: `Last ${selectedDays} days`, isPositive: true },
    { value: `${displayFocus}`, label: "Focus Blocks Completed", trend: "Genuine completions", isPositive: displayFocus > 0 }
  ];

  const barChartData = (metrics?.chronologicalFlow ?? []).map((entry) => {
    const d = new Date(entry.date + "T00:00:00");
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const todayStr = new Date().toISOString().split("T")[0];

    return {
      day: dayName,
      dateStr: entry.date,
      completion: entry.completionRate,
      isToday: entry.date === todayStr,
    };
  });

  const pendingTasks = tasks.filter(t => t.status === "pending").length;

  const piggyInsights = [
    {
      subject: "Task Volume Analysis",
      observation: `${profileName.split(" ")[0]}, you currently have ${pendingTasks} pending tasks in your system out of a total ${tasks.length}. Focus on clearing backlog before adding new modules.`
    },
    {
      subject: "Habit Conformance",
      observation: `Your maximum active streak across all habit structures is ${habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0} days. Consistency is key to structural integrity.`
    },
    {
      subject: "Action Item Focus",
      observation: `You have ${displayMissed} deferred tasks lingering in past dates. Re-allocate them to today or decommission them to keep the workspace clean.`
    }
  ];

  const currentPeriodLabel = PERIOD_OPTIONS[periodIndex].label;

  return (
    <div className="space-y-6">
      {/* Upper Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Analytical Metrics</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Statistical outputs derived from LifeOS modules.</p>
        </div>

        {/* Period Scroll */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-xl p-1 shadow-xs">
          <button
            onClick={() => handlePeriodChange(periodIndex - 1)}
            disabled={periodIndex === 0}
            className="p-1 px-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <span className="font-mono text-xs font-bold text-slate-700 px-3 tracking-wide">{currentPeriodLabel}</span>
          <button
            onClick={() => handlePeriodChange(periodIndex + 1)}
            disabled={periodIndex === PERIOD_OPTIONS.length - 1}
            className="p-1 px-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Loading / Error States */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs tracking-wide">COMPILING DIAGNOSTIC DATA...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <p className="text-red-600 font-mono text-xs">{error}</p>
          <button
            onClick={() => fetchMetrics(selectedDays)}
            className="mt-2 text-red-500 underline text-xs font-mono hover:text-red-700"
          >
            RETRY
          </button>
        </div>
      )}

      {!loading && !error && metrics && (
        <>
          {/* 4-Column quick read status */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metricsDisplay.map((m, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs transition-transform hover:scale-[1.01]">
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest block uppercase">{m.label}</span>
                <span className="font-display font-extrabold text-2xl text-slate-800 block mt-1">{m.value}</span>

                <span className={`flex items-center gap-1 text-[9px] font-mono font-bold mt-2 px-2.5 py-0.5 rounded-full w-max border ${
                  m.isPositive ? 'text-emerald-600 bg-emerald-50/50 border-emerald-100' : 'text-amber-600 bg-amber-50/50 border-amber-100'
                }`}>
                  {m.isPositive ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                  {m.trend}
                </span>
              </div>
            ))}
          </div>

          {/* Grid of Chart & J.A.R.V.I.S Prognosis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Weekly Completion Bar Chart representation */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="font-display font-bold text-slate-800 text-sm">Chronological Flow Metrics</h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">Completions percentage over the last {selectedDays} days.</p>
              </div>

              <div className="h-64 w-full cursor-pointer">
                {barChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="day"
                        tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                        contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '11px', fontFamily: 'Plus Jakarta Sans' }}
                      />
                      <Bar dataKey="completion" radius={[8, 8, 0, 0]} maxBarSize={38}>
                        {barChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.isToday ? "#F5A623" : "#E2E8F0"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300 font-mono text-xs">
                    NO DATA FOR THIS PERIOD
                  </div>
                )}
              </div>
            </div>

            {/* Dark Piggy Custom Insights Panel */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Brain className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h3 className="font-display font-bold text-white text-sm">Cognitive Synthesis Insights</h3>
                </div>

                <div className="space-y-4 divide-y divide-slate-800/80">
                  {piggyInsights.map((insight, idx) => (
                    <div key={idx} className={`${idx > 0 ? 'pt-4' : ''}`}>
                      <h4 className="font-mono text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-1">
                        {insight.subject}
                      </h4>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed">
                        {insight.observation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/80 font-mono text-[8px] text-slate-500 uppercase tracking-wider flex justify-between">
                <span>MODEL: LLAMA-3.1-8B-INSTANT</span>
                <span>PROBABILITY PROG: OPTIMAL</span>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

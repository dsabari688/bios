
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, Activity, Sparkles, Brain } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Task, Habit } from "../types";

interface AnalyticsViewProps {
  tasks: Task[];
  habits: Habit[];
  profileName: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tasks, habits, profileName }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  });

  const todayStr = new Date().toISOString().split("T")[0];

  // Calculate Real Global Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const globalCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate missed tasks (pending and older than today)
  const missedTasks = tasks.filter(t => t.status === "pending" && t.date < todayStr).length;

  // Focus Blocks (Mocking time for now, counting completed tasks as blocks)
  const focusBlocks = completedTasks;

  const metrics = [
    { value: `${globalCompletionRate}%`, label: "Completion Rate", trend: "Current Database Average", isPositive: true },
    { value: `${missedTasks}`, label: "Missed Tasks", trend: "Older than today", isPositive: missedTasks === 0 },
    { value: `${totalTasks}`, label: "Total Tracked Tasks", trend: "System wide volume", isPositive: true },
    { value: `${focusBlocks}`, label: "Focus Blocks Completed", trend: "Total completed blocks", isPositive: true }
  ];

  // Generate dynamic chart data for the last 7 days
  const barChartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    
    // Count how many tasks were completed on this specific day
    const tasksThatDay = tasks.filter(t => t.date === dateStr);
    const completedThatDay = tasksThatDay.filter(t => t.status === "completed").length;
    const completionPercentage = tasksThatDay.length > 0 
      ? Math.round((completedThatDay / tasksThatDay.length) * 100) 
      : 0;

    return {
      day: dayName,
      dateStr: dateStr,
      completion: completionPercentage,
      isToday: i === 6
    };
  });

  // Dynamic Insights based on actual data
  const piggyInsights = [
    {
      subject: "Task Volume Analysis",
      observation: ` ${profileName.split(" ")[0]}, you currently have ${pendingTasks} pending tasks in your system out of a total ${totalTasks}. Focus on clearing backlog before adding new modules.`
    },
    {
      subject: "Habit Conformance",
      observation: ` Your maximum active streak across all habit structures is ${habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0} days. Consistency is key to structural integrity.`
    },
    {
      subject: "Action Item Focus",
      observation: ` You have ${missedTasks} deferred tasks lingering in past dates. Re-allocate them to today or decommission them to keep the workspace clean.`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Upper Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Analytical Metrics</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Statistical outputs derived from LifeOS modules.</p>
        </div>
        
        {/* Month Scroll */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-xl p-1 shadow-xs">
          <button 
            className="p-1 px-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <span className="font-mono text-xs font-bold text-slate-700 px-3 tracking-wide">{currentMonth}</span>
          <button 
            className="p-1 px-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg font-bold transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* 4-Column quick read status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
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
            <p className="text-xs text-slate-400 font-sans mt-0.5">Completions percentage over the last 7 days.</p>
          </div>

          <div className="h-64 w-full cursor-pointer">
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
          </div>
        </div>

        {/* Dark Piggy Custom Insights Panel */}
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Brain className="w-5 h-5 text-amber-500 animate-pulse" />
              <h3 className="font-display font-bold text-white text-sm">ðŸ¤– Cognitive Synthesis Insights</h3>
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
    </div>
  );
};

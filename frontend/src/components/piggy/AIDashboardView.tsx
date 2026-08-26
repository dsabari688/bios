import React, { useState, useEffect } from "react";
import { 
  Heart, Sparkles, AlertTriangle, Zap, ArrowRight, Award, 
  Calendar, BookOpen, Clock, RefreshCw, BarChart2, Check,
  Moon, Smile, Award as TrophyIcon, RefreshCw as LoopIcon
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { useStore } from "../../store/useStore";
import { formatTimestamp12Hour } from "../../lib/timeUtils";

interface AIDashboardViewProps {
  token: string | null;
  profileName: string;
}

export const AIDashboardView: React.FC<AIDashboardViewProps> = ({ token, profileName }) => {
  const { osData } = useStore();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [coachingData, setCoachingData] = useState<any>(null);
  const [reflections, setReflections] = useState<any[]>([]);
  const [generatingReflection, setGeneratingReflection] = useState(false);
  const [activeTab, setActiveTab] = useState<"cockpit" | "habits" | "coaching" | "diary" | "achievements" | "memory">("cockpit");

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const buildJsonHeaders = () => {
    const requestHeaders = new Headers(headers);
    requestHeaders.set("Content-Type", "application/json");
    return requestHeaders;
  };

  const fetchAllData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      
      // Fetch Dashboard
      const dashRes = await fetch("/api/piggy/dashboard", { headers });
      const dash = await dashRes.json();
      if (dash.success) setDashboardData(dash);

      // Fetch Coaching
      const coachRes = await fetch("/api/piggy/coaching", { headers });
      const coach = await coachRes.json();
      if (coach.success) setCoachingData(coach);

      // Fetch Reflections
      const refRes = await fetch("/api/piggy/reflections", { headers });
      const refs = await refRes.json();
      if (refs.success) setReflections(refs.reflections);

    } catch (err) {
      console.error("Error loading Piggy AI Cockpit:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  const handleGenerateReflection = async () => {
    if (!token || generatingReflection) return;
    try {
      setGeneratingReflection(true);
      const res = await fetch("/api/piggy/reflection/generate", {
        method: "POST",
        headers: buildJsonHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setReflections(prev => [data.reflection, ...prev.filter(r => r.date !== data.reflection.date)]);
      }
    } catch (err) {
      console.error("Failed to generate reflection:", err);
    } finally {
      setGeneratingReflection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-mono tracking-widest uppercase animate-pulse">Piggy AI: Synchronizing Telemetry...</p>
      </div>
    );
  }

  const { cockpit = {}, habitsData = [], correlations = [], achievements = [] } = dashboardData || {};
  const { weeklyCoach = {}, monthlyTrends = [] } = coachingData || {};

  return (
    <div className="space-y-6">
      
      {/* Sub Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
            <span>PIGGY AI COCHPIT v3.0</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-450 font-mono mt-0.5">
            Predictive, adaptive, and explainable behavioral coach & OS.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex flex-wrap gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl font-mono">
          {(["cockpit", "habits", "coaching", "diary", "achievements", "memory"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab 
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              {tab === "diary" ? "Reflections" : tab === "memory" ? "AI Memory & Loops" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: COCKPIT OVERVIEW */}
      {activeTab === "cockpit" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Layer 17: Dashboard Widgets Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            
            {/* Health Score Circular Dial */}
            <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(rgba(245,166,35,0.02)_1px,transparent_1px)] [background-size:16px_16px]" />
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-widest z-10 self-start">Health Index Score</span>
              
              <div className="relative w-28 h-28 flex items-center justify-center my-3 z-10">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="56" cy="56" r="48" className="stroke-slate-800 fill-none" strokeWidth="6" />
                  <circle cx="56" cy="56" r="48" className="stroke-amber-500 fill-none" strokeWidth="6" 
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - (cockpit.healthScore || 0) / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-center">
                  <span className="font-display font-black text-3xl text-white glow-text-amber">{cockpit.healthScore || 0}</span>
                  <span className="text-[8px] font-mono font-bold text-amber-500 block uppercase mt-0.5">OPTIMAL</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-sans text-center z-10">Combined habit, sleep, mood, and task conformance indicator.</span>
            </div>

            {/* General metrics widgets */}
            {[
              { label: "Consistency Rate", value: `${cockpit.consistency}%`, sub: "Habits & Tasks logs", color: "text-emerald-400" },
              { label: "Habit Momentum", value: `${cockpit.momentum}%`, sub: "Trending pace", color: "text-amber-400" },
              { label: "Goal Progress", value: `${cockpit.goalProgress}%`, sub: "Strategic milestone rate", color: "text-indigo-400" },
            ].map((m, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-widest">{m.label}</span>
                <div>
                  <span className={`font-display font-black text-3xl block ${m.color} mt-2`}>{m.value}</span>
                  <span className="text-[9px] text-slate-500 block uppercase mt-1 font-mono">{m.sub}</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-slate-400" style={{ width: m.value }} />
                </div>
              </div>
            ))}

            {/* Burnout Risk Gauge */}
            <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-between shadow-lg relative overflow-hidden">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-widest self-start">Estimated Burnout Risk</span>
              
              <div className="relative w-28 h-28 flex items-center justify-center my-3 z-10">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="56" cy="56" r="48" className="stroke-slate-800 fill-none" strokeWidth="6" />
                  <circle cx="56" cy="56" r="48" className="stroke-rose-500 fill-none" strokeWidth="6" 
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - (cockpit.burnoutRisk || 0) / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-center">
                  <span className="font-display font-black text-3xl text-rose-500">{cockpit.burnoutRisk || 0}%</span>
                  <span className="text-[8px] font-mono font-bold text-rose-500 block uppercase mt-0.5">
                    {cockpit.burnoutRisk > 40 ? "ATTENTION" : "STABLE"}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-sans text-center">Derived from deep focus hours, sleep logs, and stress metrics.</span>
            </div>

          </div>

          {/* Core Telemetry — Alerts & Prediction Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Layer 2 & 9: Risk & Recommendations Engine */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                <h3 className="font-display font-bold text-white text-sm">Layer 2: Risk & Proactive Recommendation Engine</h3>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {habitsData.map((h: any) => (
                  <div key={h.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-white">{h.name}</h4>
                        <p className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">Streak: {h.streak} Days</p>
                      </div>
                      
                      {/* Risk tag */}
                      <div className="text-right">
                        <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                          h.risk.riskPercent > 50 
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                            : "bg-emerald-50/10 text-emerald-400 border-emerald-500/25"
                        }`}>
                          Risk: {h.risk.riskPercent}%
                        </span>
                        <p className="text-[8px] font-mono text-slate-500 uppercase mt-1">Confidence: {h.risk.confidencePercent}%</p>
                      </div>
                    </div>

                    {/* Explanatory Reasons */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-amber-500 uppercase tracking-wider block">Why?</span>
                      <ul className="text-[10px] text-slate-400 list-disc list-inside space-y-0.5 font-sans leading-relaxed">
                        {h.risk.reasons.map((r: string, idx: number) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    {/* recommendation */}
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block">Recommendation</span>
                          <span className="text-[10px] text-slate-200 font-medium leading-relaxed block mt-0.5">{h.risk.recommendation}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Success Est.</span>
                          <span className="text-[10px] font-bold text-emerald-400 block mt-0.5">{h.risk.successProbability}%</span>
                        </div>
                      </div>
                      
                      {/* Accept/Ignore Actions */}
                      <div className="flex justify-end gap-2 border-t border-slate-800/40 pt-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/piggy/feedback", {
                                method: "POST",
                                headers: buildJsonHeaders(),
                                body: JSON.stringify({
                                  text: h.risk.recommendation,
                                  type: "habit_timing",
                                  status: "accepted",
                                  habitId: h.id
                                })
                              });
                              if (res.ok) {
                                fetchAllData();
                              }
                            } catch (e) {
                              console.error("Failed to accept recommendation", e);
                            }
                          }}
                          className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded text-[9px] font-mono text-emerald-400 font-bold uppercase transition-all cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/piggy/feedback", {
                                method: "POST",
                                headers: buildJsonHeaders(),
                                body: JSON.stringify({
                                  text: h.risk.recommendation,
                                  type: "habit_timing",
                                  status: "ignored",
                                  habitId: h.id
                                })
                              });
                              if (res.ok) {
                                fetchAllData();
                              }
                            } catch (e) {
                              console.error("Failed to ignore recommendation", e);
                            }
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[9px] font-mono text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Layer 3 & 4: Energy prediction & Habit Correlation */}
            <div className="space-y-6">
              
              {/* Energy Prediction */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h3 className="font-display font-bold text-white text-sm">Layer 3: Energy Level Predictions</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Most Productive window", value: cockpit.energyData?.peakWindow, desc: "Schedule heavy focus studies" },
                    { label: "Least Productive window", value: cockpit.energyData?.leastProductiveWindow, desc: "Take a break or run errands" },
                    { label: "Deep Work window", value: cockpit.energyData?.deepWorkWindow, desc: "Commit code / core reviews" },
                    { label: "Best study duration", value: `${cockpit.energyData?.bestStudyDuration} Minutes`, desc: "Highest focus score return" }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block">{item.label}</span>
                      <span className="text-xs font-bold text-white block mt-1.5">{item.value}</span>
                      <span className="text-[9px] text-slate-500 block font-sans mt-0.5">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Habit Correlation */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <LoopIcon className="w-5 h-5 text-indigo-400 animate-spin-slow" />
                  <h3 className="font-display font-bold text-white text-sm">Layer 4: Behavior Correlation Insights</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {correlations.map((c: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-200">{c.cause}</span>
                        <div className="flex items-center gap-1 my-1">
                          <ArrowRight className="w-3 h-3 text-amber-500" />
                          <span className="text-[9px] text-slate-400 font-sans">{c.effect}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-mono font-black ${c.change > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {c.change > 0 ? `+${c.change}%` : `${c.change}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB 2: HABIT COMPLIANCE & PATTERNS */}
      {activeTab === "habits" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {habitsData.map((h: any) => (
              <div key={h.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                      <BookOpen className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{h.name}</h4>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mt-0.5">Aggregated compliance stats</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-slate-400 block uppercase">Overall Completion</span>
                    <span className="text-xl font-display font-black text-white">{h.patterns.overallCompletion}%</span>
                  </div>
                </div>

                {/* Key stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
                    <span className="text-[8px] font-mono text-slate-500 uppercase block">Streak</span>
                    <span className="text-sm font-bold text-white block mt-1">{h.streak} Days</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
                    <span className="text-[8px] font-mono text-slate-500 uppercase block">Best Weekday</span>
                    <span className="text-[10px] font-bold text-emerald-400 block mt-1">{h.patterns.bestWeekday}</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
                    <span className="text-[8px] font-mono text-slate-500 uppercase block">Worst Weekday</span>
                    <span className="text-[10px] font-bold text-rose-400 block mt-1">{h.patterns.worstWeekday}</span>
                  </div>
                </div>

                {/* Time of Day Distribution */}
                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block">Time Distribution</span>
                  <div className="space-y-1.5 font-display text-[10px]">
                    {[
                      { label: "Morning (5AM - 12PM)", percent: h.patterns.morningPercent, color: "bg-amber-500" },
                      { label: "Afternoon (12PM - 5PM)", percent: h.patterns.afternoonPercent, color: "bg-orange-500" },
                      { label: "Night (5PM - 5AM)", percent: h.patterns.nightPercent, color: "bg-indigo-500" }
                    ].map((time, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-slate-400 font-sans">{time.label}</span>
                          <span className="font-mono text-slate-200">{time.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div className={`h-full ${time.color} rounded-full`} style={{ width: `${time.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Streaks & Consistency */}
                <div className="flex items-center justify-between text-[10px] border-t border-slate-800/80 pt-3">
                  <span className="text-slate-500 font-sans">Consistency Score: <strong className="font-mono text-slate-300">{h.patterns.consistencyScore}/100</strong></span>
                  <span className={`flex items-center gap-1 font-mono uppercase text-[9px] px-2 py-0.5 rounded-full border ${
                    h.patterns.momentum === "Increasing" 
                      ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10"
                      : "text-slate-400 bg-slate-800/50 border-slate-700/50"
                  }`}>
                    Momentum: {h.patterns.momentum}
                  </span>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 3: COACHING COCKPIT */}
      {activeTab === "coaching" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Weekly Coach Report */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                  <Heart className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h3 className="font-display font-bold text-white text-sm">Layer 11: Weekly Performance Butler Coaching</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Completion Ratio</span>
                    <span className="text-3xl font-display font-black text-white block mt-1">{weeklyCoach.completionRate}%</span>
                    <span className="text-[9px] text-slate-400 block font-sans mt-0.5">Aggregate performance metrics.</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Best Habit Routine</span>
                    <span className="text-sm font-bold text-amber-500 block mt-1.5">{weeklyCoach.bestHabit}</span>
                    <span className="text-[9px] text-slate-500 block font-sans mt-0.5">Maximum consistency output.</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Weakest Routine Link</span>
                    <span className="text-sm font-bold text-rose-400 block mt-1.5">{weeklyCoach.weakestHabit}</span>
                    <span className="text-[9px] text-slate-500 block font-sans mt-0.5">Vulnerable to skip breakdowns.</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Most Improved</span>
                    <span className="text-sm font-bold text-indigo-400 block mt-1.5">{weeklyCoach.mostImproved}</span>
                    <span className="text-[9px] text-slate-500 block font-sans mt-0.5">Highest positive trend.</span>
                  </div>
                </div>

                {/* Wins & Watchouts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-xl">
                    <span className="text-[8px] font-mono text-emerald-400 uppercase block font-black">Performance Win</span>
                    <p className="text-[11px] text-emerald-100 font-medium block mt-1">{weeklyCoach.wins}</p>
                  </div>
                  <div className="bg-rose-950/20 border border-rose-900/30 p-3 rounded-xl">
                    <span className="text-[8px] font-mono text-rose-400 uppercase block font-black">Skip Warning</span>
                    <p className="text-[11px] text-rose-100 font-medium block mt-1">{weeklyCoach.watchOut}</p>
                  </div>
                </div>
              </div>

              {/* Butler recommendation */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-3 mt-4">
                <div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase block">Weekly Focus recommendation</span>
                  <span className="text-xs text-slate-200 font-semibold block mt-0.5">{weeklyCoach.recommendedFocus}</span>
                </div>
                <span className="text-[10px] font-mono text-amber-500 uppercase shrink-0">Butler Priority</span>
              </div>
            </div>

            {/* Monthly Coach Trends */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                  <BarChart2 className="w-5 h-5 text-amber-500" />
                  <h3 className="font-display font-bold text-white text-sm">Layer 12: Monthly Compliance Trends</h3>
                </div>

                <div className="h-64 w-full cursor-pointer">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 'bold' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 'bold' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                        contentStyle={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                      />
                      <Bar dataKey="completion" radius={[8, 8, 0, 0]} maxBarSize={38}>
                        {monthlyTrends.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.month.includes("Current") ? "#F5A623" : "#1E293B"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-sans flex justify-between border-t border-slate-800 pt-3 mt-4">
                <span>Long-term trend direction:</span>
                <span className="font-mono text-emerald-400 font-bold uppercase">IMPROVING (+8.0%)</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 4: NIGHTLY reflections */}
      {activeTab === "diary" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-display font-bold text-white text-sm">Layer 13: Nightly AI reflections Diary</h3>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Piggy synthesizes every evening's metrics into an automated reflection journal.</p>
                </div>
              </div>
              
              <button
                onClick={handleGenerateReflection}
                disabled={generatingReflection}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-display font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer shrink-0"
              >
                {generatingReflection ? "Compiling Diary..." : "Generate Today's Reflection"}
              </button>
            </div>

            {/* List of Reflections */}
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {reflections.length > 0 ? (
                reflections.map((ref: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-3 relative overflow-hidden">
                    
                    {/* Timestamp & Date */}
                    <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-900 pb-2">
                      <span className="text-amber-500 font-bold">{ref.date}</span>
                      <span className="text-slate-500">{formatTimestamp12Hour(ref.timestamp)}</span>
                    </div>

                    {/* Stats summary banner */}
                    <div className="flex flex-wrap gap-3 text-[10px] font-mono">
                      <span className="text-slate-400">Habits completed: <strong className="text-slate-200">{ref.completedHabitsCount}/{ref.totalHabitsCount}</strong></span>
                      <span className="text-slate-700">|</span>
                      <span className="text-slate-400">Mood state: <strong className="text-slate-200 uppercase">{ref.mood}</strong></span>
                      <span className="text-slate-700">|</span>
                      <span className="text-slate-400">Focus mode: <strong className="text-slate-200">{ref.focusMinutes} Mins</strong></span>
                    </div>

                    {/* Content text */}
                    <p className="text-xs text-slate-300 font-sans leading-relaxed italic border-l-2 border-amber-500/40 pl-3.5 my-2">
                      "{ref.reflectionText}"
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-slate-950 border border-slate-800 rounded-xl">
                  <Moon className="w-8 h-8 text-slate-650 mx-auto opacity-30 mb-2 animate-bounce" />
                  <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">No reflections logged in current memory reserve, Sir.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 5: ACHIEVEMENT BADGES */}
      {activeTab === "achievements" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <TrophyIcon className="w-5 h-5 text-amber-500 animate-bounce" />
              <div>
                <h3 className="font-display font-bold text-white text-sm">Layer 19: Gamification & Achievements Cockpit</h3>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">Unlock rewards by executing habits, coding focus sessions, and saving budget caps.</p>
              </div>
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((ach: any) => (
                <div 
                  key={ach.id} 
                  className={`border p-5 rounded-2xl flex items-center gap-4 transition-all relative overflow-hidden ${
                    ach.unlocked 
                      ? "bg-slate-950 border-amber-500/25 shadow-md shadow-amber-500/5 hover:scale-[1.01]" 
                      : "bg-slate-950/40 border-slate-850 opacity-40"
                  }`}
                >
                  {/* Glowing background for unlocked achievements */}
                  {ach.unlocked && (
                    <div className="absolute top-1/2 left-4 w-12 h-12 rounded-full bg-amber-500/10 blur-md pointer-events-none" />
                  )}

                  {/* Icon indicator */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    ach.unlocked 
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                      : "bg-slate-900 border-slate-800 text-slate-550"
                  }`}>
                    {ach.id === "30_day_reader" && <BookOpen className="w-6 h-6" />}
                    {ach.id === "consistency_master" && <RefreshCw className="w-6 h-6 animate-spin-slow" />}
                    {ach.id === "deep_work_50" && <Clock className="w-6 h-6" />}
                    {ach.id === "expense_saver" && <Heart className="w-6 h-6" />}
                  </div>

                  {/* text details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{ach.title}</h4>
                      {ach.unlocked && (
                        <span className="bg-emerald-500/15 text-emerald-400 font-mono text-[8px] px-1.5 py-0.5 rounded border border-emerald-500/25 uppercase font-bold tracking-wider">
                          UNLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans leading-relaxed">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}

      {/* TAB 6: AI MEMORY & ADAPTIVE LOOPS */}
      {activeTab === "memory" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Deadline Context & Calendar Alerts */}
          {dashboardData?.deadlines && dashboardData.deadlines.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4.5 h-4.5 animate-pulse" />
                <span>Active Calendar Context & Stress Mitigation Warnings</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {dashboardData.deadlines.map((dl: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-rose-500/10 flex justify-between items-center text-slate-355 text-white">
                    <div>
                      <span className="font-semibold block">{dl.title}</span>
                      <span className="text-[9px] font-mono text-slate-500 block mt-0.5">DUE: {dl.dueDate} ({dl.type.toUpperCase()})</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-rose-400 shrink-0 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                      {dl.daysLeft} Days Left
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-slate-400 italic">
                💡 Piggy Butler Note: To mitigate exam stress, non-essential habit failure risks have been dynamically increased, and study focus buffers have been padded by +15%.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* AI Memory facts List & form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <h3 className="font-display font-bold text-white text-sm">Layer 8: Persistent Conversational Memory</h3>
                </div>
                <span className="text-[9px] font-mono text-slate-500 uppercase">Memory Vault</span>
              </div>

              {/* Add Memory Fact Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const fact = formData.get("fact") as string;
                const category = formData.get("category") as string;
                if (!fact || !category) return;
                
                try {
                  const res = await fetch("/api/piggy/memory", {
                    method: "POST",
                    headers: buildJsonHeaders(),
                    body: JSON.stringify({ fact, category })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setDashboardData((prev: any) => ({
                      ...prev,
                      aiMemory: [...(prev.aiMemory || []), data.fact]
                    }));
                    form.reset();
                  }
                } catch(e) {
                  console.error(e);
                }
              }} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                <div className="md:col-span-2 font-mono">
                  <label className="text-[9px] font-mono text-slate-400 uppercase block mb-1">New Fact to remember</label>
                  <input required name="fact" type="text" placeholder="e.g. Flight to Paris on July 4th" className="w-full bg-slate-900 border border-slate-850 rounded-lg p-1.5 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-amber-500 font-sans" />
                </div>
                <div className="font-mono">
                  <label className="text-[9px] font-mono text-slate-400 uppercase block mb-1">Category</label>
                  <select name="category" className="w-full bg-slate-900 border border-slate-850 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
                    <option value="preference">Preference</option>
                    <option value="deadline">Deadline</option>
                    <option value="exam">Exam</option>
                    <option value="constraint">Constraint</option>
                    <option value="goal">Goal</option>
                  </select>
                </div>
                <button type="submit" className="md:col-span-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer">
                  Save Fact to memory
                </button>
              </form>

              {/* Memory Fact list */}
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {(dashboardData?.aiMemory || []).map((m: any) => (
                  <div key={m.id} className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex justify-between items-center gap-3 hover:bg-slate-950/80 transition-all">
                    <div>
                      <p className="text-xs text-slate-200 text-white font-medium font-sans leading-relaxed">"{m.fact}"</p>
                      <div className="flex flex-wrap gap-2 items-center mt-1.5 font-mono">
                        <span className="text-[8px] font-bold text-amber-500 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 block w-max">
                          {m.category}
                        </span>
                        {m.timestamp && (
                          <span className="text-[8px] text-slate-500">
                            Saved: {new Date(m.timestamp).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/piggy/memory/${m.id}`, { method: "DELETE", headers });
                          if (res.ok) {
                            setDashboardData((prev: any) => ({
                              ...prev,
                              aiMemory: (prev.aiMemory || []).filter((item: any) => item.id !== m.id)
                            }));
                          }
                        } catch(e) { console.error(e); }
                      }}
                      className="text-[9px] font-mono text-slate-500 hover:text-rose-400 font-bold border border-slate-800 hover:border-rose-500/25 px-2 py-1 rounded transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Adaptive loops & ROI outcomes */}
            <div className="space-y-6">
              
              {/* ROI Outcomes */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Heart className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-display font-bold text-white text-sm">Layer 10: Outcome Suggestion Tracking (ROI)</h3>
                </div>

                <div className="space-y-3.5 max-h-[200px] overflow-y-auto pr-1">
                  {(dashboardData?.recommendationsFeedback || []).filter((f: any) => f.status === "accepted").map((f: any) => {
                    const diff = (f.targetMetricAfter || f.baselineRateBefore) - f.baselineRateBefore;
                    return (
                      <div key={f.id} className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-slate-200 font-sans font-semibold leading-relaxed">"{f.text}"</span>
                          <p className="text-[9px] font-mono text-slate-500 uppercase mt-1">Suggested timing boost tracker</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-mono text-slate-500 block">Consistency ROI</span>
                          <span className="text-xs font-mono font-black text-emerald-400 block mt-0.5">+{diff}% improvement</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Adaptive learning profile */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <LoopIcon className="w-5 h-5 text-amber-500 animate-spin-slow" />
                  <h3 className="font-display font-bold text-white text-sm">Layer 18: Adaptive Learning & Interaction Feedback</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-center">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Accepted suggestions</span>
                    <span className="text-2xl font-display font-black text-emerald-400 block mt-1.5">
                      {(dashboardData?.recommendationsFeedback || []).filter((f: any) => f.status === "accepted").length}
                    </span>
                    <span className="text-[8px] text-slate-550 block mt-0.5">suggestions executed</span>
                  </div>
                  
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-center">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Ignored/skipped nudges</span>
                    <span className="text-2xl font-display font-black text-rose-400 block mt-1.5">
                      {(dashboardData?.recommendationsFeedback || []).filter((f: any) => f.status === "ignored").length}
                    </span>
                    <span className="text-[8px] text-slate-550 block mt-0.5">recommendations skipped</span>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-[10px] text-slate-400 font-sans leading-relaxed">
                  📢 <strong className="text-amber-500 font-mono text-[9px] uppercase tracking-wider block mt-0.5">LEARNING OVERRIDE ACTIVE</strong>
                  Piggy noticed you ignored morning workout prompts twice. Workout timing recommendations have been shifted from morning to evening slots automatically.
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

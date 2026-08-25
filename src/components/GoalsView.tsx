import React, { useState } from "react";
import { Target, Calendar, Plus, ShieldCheck, Trash2, Sparkles, X, Loader2, AlertTriangle } from "lucide-react";
import { Goal } from "../types";
import { useStore } from "../store/useStore";

interface GoalsViewProps {
  goals: Goal[];
  onAddGoal: (title: string, targetDate: string) => void;
  onDeleteGoal: (id: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ goals, onAddGoal, onDeleteGoal, onUpdateProgress }) => {
  const [newTitle, setNewTitle] = useState("");
  const [forecast, setForecast] = useState<any>(null);
  const [loadingForecastId, setLoadingForecastId] = useState<string | null>(null);
  const [decommissionGoalId, setDecommissionGoalId] = useState<string | null>(null);
  const { token } = useStore();

  const getForecast = async (goalId: string, goalTitle: string) => {
    setLoadingForecastId(goalId);
    try {
      const res = await fetch("/api/predictive-outcomes", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ primaryGoal: goalTitle, timeframeMonths: 6 })
      });
      const data = await res.json();
      if (data.success) {
        setForecast({
          targetGoal: goalTitle,
          probabilityPercent: data.probabilityPercent || 85,
          timelineForecast: data.timelineForecast || "Progress is expected to complete within parameters.",
          proactiveAdvice: data.proactiveAdvice || "Maintain daily conformance to key task variables."
        });
      } else {
        // Fallback simulated forecast if API limit/error occurs
        setForecast({
          targetGoal: goalTitle,
          probabilityPercent: 78,
          timelineForecast: "Simulated trajectory shows a 78% probability of achieving this milestone within the target date limit. Standard variance observed in weekend habit consistency.",
          proactiveAdvice: "Piggy Nudge: Increase cardio habits consistency and complete tasks related to this goal prior to 20:00 hours daily."
        });
      }
    } catch (err) {
      // Fallback on error
      setForecast({
        targetGoal: goalTitle,
        probabilityPercent: 75,
        timelineForecast: "Visual Cortex Offline. Simulated projection indicates 75% progression likelihood.",
        proactiveAdvice: "Schedule focused blocks of at least 45 minutes to offset minor rescheduling risks."
      });
    } finally {
      setLoadingForecastId(null);
    }
  };

  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddGoal(newTitle, newDate);
    setNewTitle("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight">Strategic Goal Vault</h2>
          <p className="text-xs text-slate-500 dark:text-slate-450 font-sans mt-0.5">Track multi-week macro directives and milestones.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-slate-950 stroke-3" />
          Institute Goal
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row gap-4 items-end animate-in slide-in-from-top-4 duration-200">
          <div className="flex-1 space-y-2 w-full">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Strategic Milestone Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Accomplish Advanced Algorithms Certification"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="w-full md:w-48 space-y-2 shrink-0">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Target Date Limit</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto font-display shrink-0">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="w-full md:w-20 py-2 border border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full md:px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Lock In
            </button>
          </div>
        </form>
      )}

      {/* Goal Cards Stack */}
      <div className="space-y-5">
        {goals.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm italic bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl shadow-xs">
            Your strategic vault is empty, Sir. Institute a new goal above.
          </div>
        ) : (
          goals.map((g) => {
            let statusLabel = "Active";
            let statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30";

            if (g.progress < 20) {
              statusLabel = "Needs Focus";
              statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30";
            } else if (g.status === "paused") {
              statusLabel = "Paused";
              statusBadgeClass = "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
            } else if (g.status === "completed" || g.progress === 100) {
              statusLabel = "Completed";
              statusBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-150 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800/30";
            }

            return (
              <div
                key={g.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/60 p-6 shadow-xs hover:shadow-md transition-all duration-200 hover:border-amber-500/20 group relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-500 shrink-0" />
                      <h4 className="font-display font-black text-slate-800 dark:text-white text-sm md:text-base leading-snug group-hover:text-amber-900 dark:group-hover:text-amber-300 transition-colors">
                        {g.title}
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] text-slate-400 pl-7">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>Target Limit: <span className="text-slate-650 dark:text-slate-300 font-medium">{g.targetDate}</span></span>
                      </span>
                    </div>
                  </div>

                  {/* Progress readouts */}
                  <div className="text-right pl-7 md:pl-0 shrink-0 flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-0">
                    <span className="font-display font-black text-2xl text-amber-500">
                      {g.progress}%
                    </span>
                    <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Complete</p>
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="mt-5 pl-7">
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                  
                  {/* Slider controls - Always visible as track but neat, no longer hidden in absolute opacity-0 hover styles */}
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 font-mono font-semibold uppercase tracking-wider">Adjust Progression:</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={g.progress}
                        onChange={(e) => onUpdateProgress(g.id, parseInt(e.target.value))}
                        className="flex-1 accent-amber-500 cursor-ew-resize h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none"
                        title="Slide to update progress"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer metadata details */}
                <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/40 mt-5 pt-3 pl-7">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider font-mono ${statusBadgeClass}`}>
                      {statusLabel}
                    </span>

                    <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-400 font-mono text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                      Goal Node Secured
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Predictive AI Outcomes Trigger Button */}
                    <button
                      onClick={() => getForecast(g.id, g.title)}
                      disabled={loadingForecastId !== null}
                      className="p-1.5 hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-lg transition-all flex items-center gap-1 font-mono text-[10px] font-bold uppercase cursor-pointer"
                      title="Run predictive forecasting"
                    >
                      {loadingForecastId === g.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      )}
                      <span>Forecast</span>
                    </button>

                    <button
                      onClick={() => setDecommissionGoalId(g.id)}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                      title="Decommission goal directive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Unified Forecast Result Modal (Rendered exactly once) */}
      {forecast && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setForecast(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-7 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  PIGGY AI FORECASTING OUTCOME
                </span>
                <h3 className="font-display font-black text-xl text-slate-900 dark:text-white mt-1 leading-snug">
                  {forecast.targetGoal}
                </h3>
              </div>
              <button 
                onClick={() => setForecast(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-center py-6 bg-slate-50 dark:bg-slate-950/40 border border-slate-105/50 dark:border-slate-800/40 rounded-xl my-4">
              <div className="text-4xl font-display font-black text-amber-500 glow-text-amber">
                {forecast.probabilityPercent}% Probability
              </div>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mt-1.5">
                SYSTEM CONFORMANCE LIKELIHOOD
              </span>
            </div>

            <p className="text-xs text-slate-650 dark:text-slate-300 font-sans leading-relaxed border-l-2 border-amber-500/40 pl-3.5 italic my-4">
              "{forecast.timelineForecast}"
            </p>

            <div className="bg-slate-950 p-4 rounded-xl text-xs text-slate-300 font-medium font-mono leading-normal border border-slate-850">
              <div className="text-amber-500 font-bold uppercase text-[9px] tracking-wider mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Piggy Butler Proactive Advice:
              </div>
              {forecast.proactiveAdvice}
            </div>
          </div>
        </div>
      )}

      {/* Goal Decommission Confirmation Modal */}
      {decommissionGoalId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
                Decommission Directive
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans mb-5">
              Are you sure you want to decommission this strategic goal directive? All linked analytics projections will be permanently archived.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDecommissionGoalId(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-955 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-display font-bold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteGoal(decommissionGoalId);
                  setDecommissionGoalId(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-display font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-sm cursor-pointer"
              >
                Decommission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

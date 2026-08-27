import React, { useState, useEffect } from "react";
import { X, Sparkles, TrendingUp, CheckCircle, RefreshCw, AlertCircle, ShieldAlert, Award, IndianRupee } from "lucide-react";

interface WeeklyReviewData {
  tasksCompleted: number;
  tasksSkipped: number;
  habitConsistency: number;
  bestHabit: string;
  worstHabit: string;
  moneySpent: number;
  budgetStatus: string;
  goalProgress: Array<{ title: string; progress: number; status: string }>;
  piggyInsight: string;
}

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
}

export const WeeklyReviewModal: React.FC<WeeklyReviewModalProps> = ({
  isOpen,
  onClose,
  token
}) => {
  const [data, setData] = useState<WeeklyReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !token) return;
    setLoading(true);
    fetch("/api/analytics/weekly-review", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(payload => {
        setData(payload);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading weekly review:", err);
        setLoading(false);
      });
  }, [isOpen, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="w-full max-w-2xl bg-white text-slate-800 rounded-2xl shadow-2xl p-6 space-y-6 relative animate-in fade-in zoom-in-95 duration-200 z-10 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            <h3 className="font-display font-black text-base uppercase tracking-wider text-slate-900">
              Weekly Performance Review
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
            <span className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            Compiling diagnostic analytics...
          </div>
        ) : data ? (
          <div className="space-y-6">
            
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Task Stat Card */}
              <div className="border border-slate-100 p-4 rounded-xl space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[9px] font-bold font-mono uppercase tracking-widest">Tasks Executed</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-display font-black text-slate-800">{data.tasksCompleted}</span>
                  <span className="text-[10px] text-slate-400 font-mono">done</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {data.tasksSkipped} deferred or rescheduled.
                </p>
              </div>

              {/* Habit Consistency Card */}
              <div className="border border-slate-100 p-4 rounded-xl space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[9px] font-bold font-mono uppercase tracking-widest">Habit Coherence</span>
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-display font-black text-slate-800">{data.habitConsistency}%</span>
                  <span className="text-[10px] text-slate-400 font-mono">avg</span>
                </div>
                <p className="text-[10px] text-slate-500 block truncate" title={`Best: ${data.bestHabit}`}>
                  Best: {data.bestHabit !== "None" ? data.bestHabit : "N/A"}
                </p>
              </div>

              {/* Expense Card */}
              <div className="border border-slate-100 p-4 rounded-xl space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[9px] font-bold font-mono uppercase tracking-widest">Aggregate Costs</span>
                  <IndianRupee className="w-4 h-4 text-rose-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-display font-black text-slate-800">₹{data.moneySpent.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">spent</span>
                </div>
                <p className="text-[10px] text-slate-500 block truncate" title={data.budgetStatus}>
                  Status: {data.budgetStatus}
                </p>
              </div>
            </div>

            {/* Strategic Goals List */}
            {data.goalProgress && data.goalProgress.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest">// Strategic Vault Progress</h4>
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden bg-slate-50/20">
                  {data.goalProgress.map((goal, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs gap-3">
                      <span className="font-semibold text-slate-700 truncate">{goal.title}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[10px] text-slate-500">{goal.progress}%</span>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${goal.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* J.A.R.V.I.S Piggy butler analysis */}
            {data.piggyInsight && (
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-1">
                <span className="font-mono text-[9px] font-bold text-amber-500 uppercase tracking-widest block">// J.A.R.V.I.S Butler Analysis</span>
                <p className="text-xs text-slate-205 italic font-sans leading-relaxed">
                  "{data.piggyInsight}"
                </p>
              </div>
            )}

          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 text-xs font-mono">
            Could not query weekly metrics. Sir.
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Acknowledge diagnostics
          </button>
        </div>

      </div>
    </div>
  );
};


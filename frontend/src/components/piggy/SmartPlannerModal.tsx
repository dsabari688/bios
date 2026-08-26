import React from "react";
import { Clock, Calendar, Check, X, Sparkles } from "lucide-react";
import { formatTo12Hour } from "../../lib/timeUtils";

interface TimelineItem {
  timeSlot: string;
  taskTitle: string;
  category: string; // Focus, Workout, Rest, Nourish, Study, etc.
}

interface SmartPlannerPlan {
  heading: string;
  timeline: TimelineItem[];
  butlerAdvice: string;
}

interface SmartPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SmartPlannerPlan | null;
}

export const SmartPlannerModal: React.FC<SmartPlannerModalProps> = ({
  isOpen,
  onClose,
  plan
}) => {
  if (!isOpen || !plan) return null;

  const getCategoryStyles = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes("focus")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    if (c.includes("workout") || c.includes("exercise") || c.includes("gym")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (c.includes("rest") || c.includes("sleep") || c.includes("relax")) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
    if (c.includes("nourish") || c.includes("eat") || c.includes("meal")) {
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    }
    if (c.includes("study") || c.includes("code") || c.includes("learn")) {
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }
    return "bg-slate-800 text-slate-300 border-slate-700/50";
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="w-full max-w-xl bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-5 relative animate-in fade-in zoom-in-95 duration-200 z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-display font-black text-sm uppercase tracking-wider text-amber-500">
              {plan.heading || "Tactical Day Planner"}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline body */}
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {plan.timeline && plan.timeline.length > 0 ? (
            plan.timeline.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.03] p-3 rounded-xl hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-1.5 shrink-0 text-slate-400 font-mono text-[10px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTo12Hour(item.timeSlot)}</span>
                </div>
                <div className="h-4 w-px bg-white/10 shrink-0" />
                <span className="text-xs font-semibold text-slate-205 flex-1 leading-snug">
                  {item.taskTitle}
                </span>
                <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${getCategoryStyles(item.category)}`}>
                  {item.category}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-6 font-mono">No sequence allocations computed, Sir.</p>
          )}
        </div>

        {/* Butler Advice */}
        {plan.butlerAdvice && (
          <div className="bg-slate-950/50 rounded-xl p-4 border border-white/5 space-y-1">
            <span className="font-mono text-[9px] font-bold text-amber-500 uppercase tracking-widest block">// J.A.R.V.I.S Butler Advice</span>
            <p className="text-xs text-slate-300 italic font-sans leading-relaxed">
              "{plan.butlerAdvice}"
            </p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Acknowledge Plan
          </button>
        </div>

      </div>
    </div>
  );
};

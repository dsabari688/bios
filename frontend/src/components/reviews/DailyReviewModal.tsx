import React from "react";
import { CheckCircle, Award, Hourglass, Zap, Star, X } from "lucide-react";

interface DailyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasksCompleted: number;
  totalTasks: number;
  habitsCompleted: number;
  totalHabits: number;
  activeStreak: number;
  productivityScore: number;
  onPlanTomorrow: () => void;
}

export const DailyReviewModal: React.FC<DailyReviewModalProps> = ({
  isOpen,
  onClose,
  tasksCompleted,
  totalTasks,
  habitsCompleted,
  totalHabits,
  activeStreak,
  productivityScore,
  onPlanTomorrow
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-250 relative">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Decorative Ambient Banner */}
        <div className="bg-slate-900 px-6 py-8 text-center border-b border-slate-800 relative overflow-hidden">
          {/* Pulsing visual circles inside banner */}
          <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-amber-500/10 blur-xl" />
          <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-amber-500/5 blur-xl" />

          {/* Glowing Animated Small Amber Orb */}
          <div className="mx-auto w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 animate-jarvis-breath flex items-center justify-center shadow-lg shadow-amber-500/25 mb-3">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>

          <h2 className="font-display font-bold text-2xl text-white tracking-tight">Daily Cognitive Synthesis</h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Diagnostic calculations complete, Sir. Rebuilding productivity indices.
          </p>
        </div>

        {/* Body content */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Score Circle & High Level Summary */}
          <div className="flex flex-col md:flex-row items-center justify-around gap-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
            {/* SVG Ring Score */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle 
                  cx="56" cy="56" r="48" 
                  className="stroke-slate-100 fill-none" 
                  strokeWidth="8"
                />
                <circle 
                  cx="56" cy="56" r="48" 
                  className="stroke-amber-500 fill-none transition-all duration-1000 ease-out" 
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - productivityScore / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <span className="font-display font-extrabold text-3xl text-slate-900">{productivityScore}</span>
                <p className="text-[9px] font-mono font-bold text-amber-600 tracking-wider block uppercase">Life Score</p>
              </div>
            </div>

            {/* Verdict */}
            <div className="text-center md:text-left space-y-1">
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-mono font-semibold text-[10px] px-2 py-0.5 rounded-full border border-amber-200">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                Excellent Starcraft Rating
              </span>
              <h3 className="font-display font-bold text-lg text-slate-800">
                {productivityScore >= 80 ? "Sovereign Alignment Complete" : "Minor Cognitive Divergence"}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs font-sans leading-relaxed">
                You successfully managed {tasksCompleted} of your {totalTasks} tactical blocks and synchronized {habitsCompleted} daily behaviors today.
              </p>
            </div>
          </div>

          {/* 2x2 Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-100 flex items-center gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block uppercase font-mono">Tasks Complete</span>
                <span className="font-display font-bold text-slate-800 text-base">
                  {tasksCompleted} <span className="text-xs text-slate-400 font-normal">/ {totalTasks}</span>
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-100 flex items-center gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block uppercase font-mono">Habits Kept</span>
                <span className="font-display font-bold text-slate-800 text-base">
                  {habitsCompleted} <span className="text-xs text-slate-400 font-normal">/ {totalHabits}</span>
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-100 flex items-center gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block uppercase font-mono">Active Streak</span>
                <span className="font-display font-bold text-amber-600 text-base">
                  {activeStreak} <span className="text-xs text-slate-400 font-normal font-sans">days</span>
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-100 flex items-center gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <Hourglass className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block uppercase font-mono">Divergence Level</span>
                <span className="font-display font-bold text-slate-800 text-base">
                  {Math.max(0, totalTasks - tasksCompleted)} <span className="text-xs text-slate-400 font-normal">skipped</span>
                </span>
              </div>
            </div>
          </div>

          {/* J.A.R.V.I.S Bullet Advice */}
          <div className="bg-slate-900 rounded-xl p-4 text-white">
            <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest block mb-2">🤖 J.A.R.V.I.S. Prognosis</span>
            <p className="text-xs font-sans text-slate-300 leading-relaxed italic">
              "Sir, statistics confirm that completing 2 key habits inside the 2:00 PM time frame guarantees a 94% overall compliance level. I recommend locking tomorrow's critical study papers study early to capitalize on morning neural activity."
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 font-display pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onPlanTomorrow();
                onClose();
              }}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              Plan Tomorrow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


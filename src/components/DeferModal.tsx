import React, { useState, useEffect } from "react";
import { Calendar, Clock, AlertTriangle, ChevronRight, CheckCircle, ShieldAlert, History, Sparkles, X } from "lucide-react";
import { Task, DeferRecord } from "../types";
import { formatTimeRange, formatTo12Hour, formatTimestamp12Hour } from "../lib/timeUtils";

interface DeferModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onConfirmDefer: (
    taskId: string,
    options: {
      newDate: string;
      newTime?: string;
      newEndTime?: string;
      reason: string;
      maxDeferLimit?: number;
    }
  ) => void;
}

const COMMON_REASONS = [
  "🔋 Low Cognitive Energy / Fatigue",
  "🚧 External Blocker / Waiting on Dependency",
  "🎯 Prioritizing Higher Urgency Milestone",
  "⏳ Meeting / Routine Schedule Overrun",
  "🌧️ Sick / Physical Recovery Required",
  "✍️ Custom Tactical Adjustment"
];

const DEFER_LIMIT_OPTIONS = [
  { value: 1, label: "1 time (Strict Commitment)" },
  { value: 2, label: "2 times (Standard)" },
  { value: 3, label: "3 times (Recommended)" },
  { value: 5, label: "5 times (Flexible)" }
];

export const DeferModal: React.FC<DeferModalProps> = ({
  isOpen,
  onClose,
  task,
  onConfirmDefer
}) => {
  if (!isOpen || !task) return null;

  // Compute tomorrow's date by default
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultTomorrowStr = tomorrow.toISOString().split("T")[0];

  const [targetDate, setTargetDate] = useState<string>(defaultTomorrowStr);
  const [targetTime, setTargetTime] = useState<string>(task.time || "09:00");
  const [targetEndTime, setTargetEndTime] = useState<string>(task.endTime || "");
  const [selectedReasonChip, setSelectedReasonChip] = useState<string>(COMMON_REASONS[0]);
  const [customReasonText, setCustomReasonText] = useState<string>("");
  const [maxDeferLimit, setMaxDeferLimit] = useState<number>(task.maxDeferLimit || 3);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [hasAcknowledgedLimit, setHasAcknowledgedLimit] = useState<boolean>(false);

  useEffect(() => {
    if (task) {
      // If task date is today or earlier, default to tomorrow
      const nowStr = new Date().toISOString().split("T")[0];
      if (task.date <= nowStr) {
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1);
        setTargetDate(nextDay.toISOString().split("T")[0]);
      } else {
        const nextDay = new Date(task.date + "T12:00:00");
        nextDay.setDate(nextDay.getDate() + 1);
        setTargetDate(nextDay.toISOString().split("T")[0]);
      }
      setTargetTime(task.time || "09:00");
      setTargetEndTime(task.endTime || "");
      setSelectedReasonChip(COMMON_REASONS[0]);
      setCustomReasonText("");
      setMaxDeferLimit(task.maxDeferLimit || 3);
      setHasAcknowledgedLimit(false);
    }
  }, [task, isOpen]);

  const handleQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setTargetDate(d.toISOString().split("T")[0]);
  };

  const handleQuickTime = (timeStr: string) => {
    setTargetTime(timeStr);
  };

  const isLimitReached = task.rescheduledCount >= maxDeferLimit;
  const effectiveReason = customReasonText.trim() ? customReasonText.trim() : selectedReasonChip;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDate) return;
    if (isLimitReached && !hasAcknowledgedLimit) return;

    onConfirmDefer(task.id, {
      newDate: targetDate,
      newTime: targetTime,
      newEndTime: targetEndTime || undefined,
      reason: effectiveReason,
      maxDeferLimit
    });
    onClose();
  };

  // Format dates for display
  let formattedCurrentDate = task.date;
  let formattedTargetDate = targetDate;
  try {
    const curD = new Date(task.date + "T12:00:00");
    formattedCurrentDate = curD.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const tarD = new Date(targetDate + "T12:00:00");
    formattedTargetDate = tarD.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  } catch {}

  const deferHistory: DeferRecord[] = task.deferHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Defer Tactical Mission
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Accountability & Procrastination Shield
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Summary Banner */}
        <div className="px-6 py-3.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block">
              Mission Selected
            </span>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {task.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400">
              <span>Scheduled: {formattedCurrentDate}</span>
              <span>&bull;</span>
              <span>{formatTimeRange(task.time, task.endTime)}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`inline-block px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border ${
              task.rescheduledCount > 0 
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
            }`}>
              Deferred {task.rescheduledCount}x
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* 1. Target Defer Date */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-display">
                1. Which date to defer to?
              </label>
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                {formattedTargetDate}
              </span>
            </div>

            {/* Quick date chips */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDate(1)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all text-center cursor-pointer"
              >
                Tomorrow (+1d)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(2)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all text-center cursor-pointer"
              >
                In 2 Days (+2d)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(3)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all text-center cursor-pointer"
              >
                In 3 Days (+3d)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(7)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all text-center cursor-pointer"
              >
                Next Week (+7d)
              </button>
            </div>

            {/* Custom Date Input */}
            <div className="relative">
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>
          </div>

          {/* 2. Target Execution Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-display">
                Execution Time Window (12-Hour)
              </label>
              <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                {formatTimeRange(targetTime, targetEndTime)}
              </span>
            </div>

            {/* Quick time slots */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickTime("09:00")}
                className={`flex-1 py-1 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${
                  targetTime === "09:00"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                9:00 AM (Morning)
              </button>
              <button
                type="button"
                onClick={() => handleQuickTime("14:00")}
                className={`flex-1 py-1 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${
                  targetTime === "14:00"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                2:00 PM (Afternoon)
              </button>
              <button
                type="button"
                onClick={() => handleQuickTime("19:00")}
                className={`flex-1 py-1 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${
                  targetTime === "19:00"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                7:00 PM (Evening)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] font-mono text-slate-400 block mb-1">Start Time</span>
                <input
                  type="time"
                  value={targetTime}
                  onChange={(e) => setTargetTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <span className="text-[9px] font-mono text-slate-400 block mb-1">End Time (Optional)</span>
                <input
                  type="time"
                  value={targetEndTime}
                  onChange={(e) => setTargetEndTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Reason for Deferral ("Why?") */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-display">
              2. Why are you deferring? (Accountability Reason)
            </label>
            
            <div className="space-y-1.5">
              {COMMON_REASONS.map((reason) => {
                const isSelected = selectedReasonChip === reason && !customReasonText;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setSelectedReasonChip(reason);
                      setCustomReasonText("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-semibold"
                        : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{reason}</span>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <input
                type="text"
                placeholder="Or specify custom reason details..."
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900"
              />
            </div>
          </div>

          {/* 4. How many times you want to defer / Deferral Allowance Limit */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-display">
                3. Maximum Deferral Allowance
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                Current: {task.rescheduledCount} / {maxDeferLimit} times
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
              Set the maximum number of times you permit yourself to defer this mission before hard commitment is enforced.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {DEFER_LIMIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMaxDeferLimit(opt.value)}
                  className={`px-2 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                    maxDeferLimit === opt.value
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Limit Reached Warning & Accountability Check */}
          {isLimitReached && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 animated-in fade-in duration-150">
              <div className="flex items-start gap-2.5 text-rose-800 dark:text-rose-300">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>
                  <h5 className="text-xs font-bold font-display">
                    Deferral Threshold Reached ({task.rescheduledCount} of {maxDeferLimit} Allowed)
                  </h5>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300/90 mt-0.5 leading-relaxed font-sans">
                    You have reached or exceeded your set deferral allowance for this mission. You can still defer if necessary, but please acknowledge your commitment to complete it on the new date.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAcknowledgedLimit}
                  onChange={(e) => setHasAcknowledgedLimit(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                />
                <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                  I acknowledge the deferral cap and commit to executing on {formattedTargetDate}.
                </span>
              </label>
            </div>
          )}

          {/* History Accordion if previously deferred */}
          {deferHistory.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full text-[11px] font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  View Past Deferral Audit Log ({deferHistory.length})
                </span>
                <span>{showHistory ? "▲ Hide" : "▼ Show"}</span>
              </button>

              {showHistory && (
                <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  {deferHistory.map((item, idx) => (
                    <div key={idx} className="text-[10px] font-mono text-slate-600 dark:text-slate-400 border-b border-slate-200/40 dark:border-slate-700/40 pb-1 last:border-0">
                      <div className="flex justify-between text-slate-500">
                        <span>Deferral #{item.deferIndex || idx + 1}</span>
                        <span>{formatTimestamp12Hour(item.timestamp)}</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-sans mt-0.5">
                        Moved from <span className="font-mono font-semibold">{item.fromDate}</span> to <span className="font-mono font-semibold">{item.toDate}</span>
                      </p>
                      <p className="italic text-slate-500 text-[9px] mt-0.5">
                        Reason: {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLimitReached && !hasAcknowledgedLimit}
              className={`px-5 py-2.5 rounded-xl font-display text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                isLimitReached && !hasAcknowledgedLimit
                  ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/20 active:scale-98"
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Confirm & Reschedule Mission
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

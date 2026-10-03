import React, { useState, useEffect } from "react";
import { Task, TaskPriority } from "../../types";
import { getLocalDateString } from "../../lib/timeUtils";
import { useStore } from "../../store/useStore";
import { taskCategoryToFront } from "../../api/tasks.api";

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path strokeLinecap="round" d="M16 3v4M8 3v4M3 10h18" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M12 7v5l3 2" />
  </svg>
);

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: {
    title: string;
    category: TaskPriority;
    date: string;
    time: string;
    endTime?: string;
    durationMinutes?: number;
    description?: string;
    recurType: 'none' | 'daily' | 'weekly';
  }) => void;
  initialTask?: Task | null;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; activeClass: string; borderClass: string }[] = [
  { value: "urgent-important", label: "High", activeClass: "bg-red-500 text-white", borderClass: "border-red-500" },
  { value: "important-not-urgent", label: "Medium", activeClass: "bg-amber-500 text-white", borderClass: "border-amber-500" },
  { value: "not-urgent-not-important", label: "Low", activeClass: "bg-emerald-500 text-white", borderClass: "border-emerald-500" }
];

const DURATION_PRESETS = [
  { label: "15 min", h: 0, m: 15 },
  { label: "30 min", h: 0, m: 30 },
  { label: "45 min", h: 0, m: 45 },
  { label: "1 hr", h: 1, m: 0 },
  { label: "1.5 hr", h: 1, m: 30 },
  { label: "2 hr", h: 2, m: 0 },
  { label: "3 hr", h: 3, m: 0 }
];

function computeEndTime(startTime: string, durationMins: number): string {
  try {
    const [sh, sm] = (startTime || "09:00").split(":").map(Number);
    const startM = (isNaN(sh) ? 9 : sh) * 60 + (isNaN(sm) ? 0 : sm);
    const endTotal = (startM + durationMins) % (24 * 60);
    const eh = Math.floor(endTotal / 60).toString().padStart(2, "0");
    const em = (endTotal % 60).toString().padStart(2, "0");
    return `${eh}:${em}`;
  } catch {
    return "10:00";
  }
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, initialTask }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskPriority>("important-not-urgent");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [durationHours, setDurationHours] = useState<number>(1);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [recurType, setRecurType] = useState<'none' | 'daily' | 'weekly'>("none");

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setCategory(taskCategoryToFront(initialTask.category));
      setDate(initialTask.date);
      setTime(initialTask.time || "09:00");
      setDescription(initialTask.description || "");
      setRecurType(initialTask.recurType);

      // Extract duration in minutes from existing task
      let totalMins = 60;
      if (initialTask.durationMinutes && initialTask.durationMinutes > 0) {
        totalMins = initialTask.durationMinutes;
      } else if (initialTask.time && initialTask.endTime) {
        try {
          const [sh, sm] = initialTask.time.split(":").map(Number);
          const [eh, em] = initialTask.endTime.split(":").map(Number);
          if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
            let diff = (eh * 60 + em) - (sh * 60 + sm);
            if (diff < 0) diff += 24 * 60;
            if (diff > 0) totalMins = diff;
          }
        } catch {}
      }
      setDurationHours(Math.floor(totalMins / 60));
      setDurationMinutes(totalMins % 60);
    } else {
      setTitle("");
      setCategory("important-not-urgent");
      const initialDate = useStore.getState().selectedDate || getLocalDateString(new Date());
      setDate(initialDate);
      setTime("09:00");
      setDescription("");
      setRecurType("none");
      setDurationHours(1);
      setDurationMinutes(0);
    }
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const formattedDuration = () => {
    const h = Math.max(0, durationHours || 0);
    const m = Math.max(0, durationMinutes || 0);
    if (h === 0 && m === 0) return "0 min";
    if (h > 0 && m > 0) return `${h} hr ${m} min`;
    if (h > 0) return `${h} hr`;
    return `${m} min`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const totalMins = Math.max(5, (durationHours || 0) * 60 + (durationMinutes || 0));
    const baseTime = time || "09:00";
    const calculatedEndTime = computeEndTime(baseTime, totalMins);

    onSave({
      title: title.trim(),
      category,
      date,
      time: baseTime,
      endTime: calculatedEndTime,
      durationMinutes: totalMins,
      description: description.trim() || undefined,
      recurType
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            {initialTask ? "Edit Task" : "Assign New Task"}
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-display">
              Task Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Complete math exercises, review code..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 text-sm font-sans"
            />
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-display">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold font-display text-center transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                    category === opt.value
                      ? `${opt.activeClass} border-transparent shadow-xs scale-[1.02]`
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    category === opt.value ? "bg-white" : 
                    opt.value === "urgent-important" ? "bg-red-500" :
                    opt.value === "important-not-urgent" ? "bg-amber-500" : "bg-emerald-500"
                  }`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date and Duration Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Execution Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-display">
                Execution Date
              </label>
              <div className="relative">
                <div className="absolute left-3 top-3 text-slate-400">
                  <CalendarIcon />
                </div>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700 dark:text-slate-200 text-xs font-mono"
                />
              </div>
            </div>

            {/* Time Needed (Duration in Hours and Minutes) */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-display">
                  Time Needed
                </label>
                <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ClockIcon />
                  {formattedDuration()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={durationHours}
                    onChange={(e) => setDurationHours(Math.max(0, parseInt(e.target.value || "0", 10)))}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 text-xs font-mono"
                  />
                  <span className="absolute right-3 text-xs font-semibold text-slate-400 pointer-events-none font-mono">
                    hr
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(0, Math.min(59, parseInt(e.target.value || "0", 10))))}
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 text-xs font-mono"
                  />
                  <span className="absolute right-3 text-xs font-semibold text-slate-400 pointer-events-none font-mono">
                    min
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Duration Preset Pills */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider mr-1">
                Quick Set:
              </span>
              {DURATION_PRESETS.map((preset) => {
                const isSelected = durationHours === preset.h && durationMinutes === preset.m;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setDurationHours(preset.h);
                      setDurationMinutes(preset.m);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs scale-105"
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description field */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-display">
              Description (Optional)
            </label>
            <textarea
              placeholder="Provide any details, notes, or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 dark:text-slate-100 text-sm font-sans resize-none"
            />
          </div>

          {/* Recurrence Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-display">
              Recurrence Cycle
            </label>
            <div className="flex gap-2">
              {(["none", "daily", "weekly"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecurType(r)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all cursor-pointer ${
                    recurType === r
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-400 font-semibold"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750"
                  }`}
                >
                  {r === "none" ? "Single Task" : r}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 font-display">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              {initialTask ? "Save Changes" : "Save Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { Task, TaskPriority } from "../../types";
import { formatTo12Hour, getLocalDateString } from "../../lib/timeUtils";
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

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, initialTask }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskPriority>("important-not-urgent");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [recurType, setRecurType] = useState<'none' | 'daily' | 'weekly'>("none");

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setCategory(taskCategoryToFront(initialTask.category));
      setDate(initialTask.date);
      setTime(initialTask.time);
      setEndTime(initialTask.endTime || "");
      setDescription(initialTask.description || "");
      setRecurType(initialTask.recurType);
    } else {
      setTitle("");
      setCategory("important-not-urgent");
      const initialDate = useStore.getState().selectedDate || getLocalDateString(new Date());
      setDate(initialDate);
      setTime("09:00");
      setEndTime("");
      setDescription("");
      setRecurType("none");
    }
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      category,
      date,
      time,
      endTime: endTime || undefined,
      description: description.trim() || undefined,
      recurType
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-display text-lg font-semibold text-slate-900">
            {initialTask ? "Modify Strategic Mission" : "Assign New Mission"}
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-display">
              Mission Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Architect Core Cache Sync Protocols"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 text-sm font-sans"
            />
          </div>

          {/* Eisenhower Matrix Segmented Priority Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-display">
              Mission Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold font-display text-center transition-all duration-150 flex items-center justify-center gap-2 ${
                    category === opt.value
                      ? `${opt.activeClass} border-transparent shadow-xs scale-[1.02]`
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
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

          {/* Date and Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-display">
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-display">
                  Start Time
                </label>
                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  {formatTo12Hour(time)}
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-3 text-slate-400">
                  <ClockIcon />
                </div>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-display">
                  End Time
                </label>
                {endTime && (
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    {formatTo12Hour(endTime)}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-3 top-3 text-slate-400">
                  <ClockIcon />
                </div>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Description field */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-display">
              Mission Description
            </label>
            <textarea
              placeholder="Provide mission-specific details, guidelines, or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 text-sm font-sans resize-none"
            />
          </div>

          {/* Recurrence Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-display">
              Recurrence Cycle
            </label>
            <div className="flex gap-2">
              {(["none", "daily", "weekly"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecurType(r)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all ${
                    recurType === r
                      ? "bg-amber-50 border-amber-500 text-amber-700 font-semibold"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {r === "none" ? "Single Mission" : r}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 font-display">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
            >
              {initialTask ? "Apply Modifications" : "Lock In Mission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


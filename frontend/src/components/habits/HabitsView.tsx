import React, { useState } from "react";
import { Plus, Flame, CheckCircle2, Circle, Trash2, Sparkles } from "lucide-react";
import { Habit, safeLogs } from "../../types";
import { getLocalDateString } from "../../lib/timeUtils";

interface HabitsViewProps {
  habits: Habit[];
  selectedDate?: string;
  onToggleHabit: (habitId: string, dateStr?: string) => void;
  onUpdateHabitProgress?: (habitId: string, delta: number, dateStr?: string) => void;
  onAddHabit: (
    name: string,
    frequency: "daily" | "weekly",
    icon?: string,
    options?: Partial<Omit<Habit, "id" | "name" | "frequency" | "streak" | "logs" | "skippedDaysCount">>
  ) => void;
  onDeleteHabit: (habitId: string) => void;
  selectedHabitId?: string | null;
  onFocusHabit?: (id: string, name: string) => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  habits,
  selectedDate,
  onToggleHabit,
  onUpdateHabitProgress,
  onAddHabit,
  onDeleteHabit,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [habitName, setHabitName] = useState("");
  const [targetCount, setTargetCount] = useState<number>(1);
  const [habitDescription, setHabitDescription] = useState("");

  const effectiveDate = selectedDate || getLocalDateString(new Date());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = habitName.trim();
    if (!trimmedName) return;

    const count = Math.max(1, Number(targetCount) || 1);

    onAddHabit(trimmedName, "daily", "⚡", {
      targetValue: count,
      unit: "times",
      stepIncrement: 1,
      notes: habitDescription.trim() || undefined,
    });

    setHabitName("");
    setTargetCount(1);
    setHabitDescription("");
    setShowAddForm(false);
  };

  const completedTodayCount = habits.filter((h) => {
    const isDone = safeLogs(h?.logs).includes(effectiveDate);
    const target = h.targetValue || 1;
    const progress = h.dailyProgress?.[effectiveDate] ?? 0;
    return isDone || progress >= target;
  }).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100">
            Habits
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
            {habits.length === 0
              ? "No habits added yet"
              : `${completedTodayCount} of ${habits.length} completed today`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? "Cancel" : "Add Habit"}</span>
        </button>
      </div>

      {/* Simple Add Habit Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 animate-in slide-in-from-top-3 duration-200"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
              New Habit
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Habit Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-display">
                Habit Name
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Drink Water, Read 20 Pages, Workout"
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-sans"
              />
            </div>

            {/* How Many Times */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-display">
                How Many Times
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={targetCount}
                  onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0 font-sans">
                  / day
                </span>
              </div>
            </div>
          </div>

          {/* Quick Times Presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider mr-1">
              Quick:
            </span>
            {[1, 2, 3, 5, 8].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setTargetCount(num)}
                className={`px-2 py-0.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  targetCount === num
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {num}x
              </button>
            ))}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-display">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 1 glass in morning, 1 afternoon, 1 at night..."
              value={habitDescription}
              onChange={(e) => setHabitDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-sans resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 font-display">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Save Habit
            </button>
          </div>
        </form>
      )}

      {/* Habits List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden">
        {habits.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No habits added yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto font-sans">
              Click the button below to add your first habit.
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Habit</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {habits.map((item) => {
              const target = item.targetValue || 1;
              const isDoneToday = safeLogs(item?.logs).includes(effectiveDate);
              const loggedProgress = item.dailyProgress?.[effectiveDate] ?? 0;
              const currentCount = isDoneToday ? Math.max(loggedProgress, target) : loggedProgress;
              const isCompleted = isDoneToday || currentCount >= target;

              return (
                <div
                  key={item.id}
                  className={`p-4 flex items-center justify-between gap-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                    isCompleted ? "bg-slate-50/30 dark:bg-slate-950/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Completion Checkbox / Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleHabit(item.id, effectiveDate)}
                      className="cursor-pointer shrink-0 transition-transform active:scale-90"
                      title={isCompleted ? "Completed - click to unmark" : "Mark completed"}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/40" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-amber-500 transition-colors" />
                      )}
                    </button>

                    {/* Habit Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => onToggleHabit(item.id, effectiveDate)}
                          className={`text-sm cursor-pointer select-none transition-all break-words ${
                            isCompleted
                              ? "line-through text-slate-400 dark:text-slate-500"
                              : "text-slate-800 dark:text-slate-100 font-medium"
                          }`}
                        >
                          {item.name}
                        </span>

                        {/* Times badge */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                          {currentCount} / {target} {target > 1 ? "times" : "time"}
                        </span>

                        {/* Streak Badge */}
                        {item.streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded shrink-0">
                            <Flame className="w-3 h-3 fill-amber-500" />
                            {item.streak}d streak
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate font-sans">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Progress increment & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* If multi-count habit, allow incrementing by +1 */}
                    {target > 1 && !isCompleted && onUpdateHabitProgress && (
                      <button
                        type="button"
                        onClick={() => onUpdateHabitProgress(item.id, 1, effectiveDate)}
                        className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="Add 1 time"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+1</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteHabit(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Delete Habit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

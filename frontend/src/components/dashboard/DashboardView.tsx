import React, { useState } from "react";
import { CheckCircle2, Circle, Plus, Edit3, Trash2, ListTodo, Clock } from "lucide-react";
import { Task, FullOSData } from "../../types";
import { getLocalDateString, formatDisplayDate } from "../../lib/timeUtils";
import { useStore } from "../../store/useStore";
import { UniversalDateNavigator } from "../common/UniversalDateNavigator";

interface DashboardViewProps {
  data: FullOSData;
  onToggleTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onRescheduleTaskSubmit?: (taskId: string, newDate: string) => void;
  onDeferTask?: (task: Task) => void;
  onNavigateToView?: (view: string) => void;
  onOpenCreateTaskModal: () => void;
  onOpenAddHabitModal?: () => void;
  onOpenCreateGoalModal?: () => void;
  onTriggerDailyReview?: () => void;
  selectedTaskId?: string | null;
  onFocusTask?: (id: string, title: string) => void;
  token?: string | null;
  onNudgeTriggered?: () => void;
  onTriggerWeeklyReview?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onOpenCreateTaskModal,
}) => {
  const { tasks } = data;
  const { selectedDate, saveTask } = useStore();
  const [quickTitle, setQuickTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = getLocalDateString(new Date());
  const isSelectedDateToday = selectedDate === todayStr;

  // Filter tasks for the selected date
  const dayTasks = tasks.filter((t) => {
    const taskDateStr = t.date ? (t.date.includes("T") ? t.date.split("T")[0] : t.date) : "";
    return taskDateStr === selectedDate;
  });

  // Sort: pending tasks first, completed tasks last
  const sortedDayTasks = [...dayTasks].sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    return 0;
  });

  const completedCount = dayTasks.filter((t) => t?.status === "completed").length;
  const totalCount = dayTasks.length;
  const formattedSelectedDate = formatDisplayDate(selectedDate);

  const getTaskDurationText = (t: Task): string | null => {
    if (t.durationMinutes && t.durationMinutes > 0) {
      const h = Math.floor(t.durationMinutes / 60);
      const m = t.durationMinutes % 60;
      if (h > 0 && m > 0) return `${h} hr ${m} min`;
      if (h > 0) return `${h} hr`;
      return `${m} min`;
    }
    if (t.time && t.endTime) {
      try {
        const [sh, sm] = t.time.split(":").map(Number);
        const [eh, em] = t.endTime.split(":").map(Number);
        if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
          let diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff < 0) diff += 24 * 60;
          if (diff > 0) {
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            if (h > 0 && m > 0) return `${h} hr ${m} min`;
            if (h > 0) return `${h} hr`;
            return `${m} min`;
          }
        }
      } catch {}
    }
    return null;
  };

  // Handle quick inline task creation
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await saveTask({
        title: trimmed,
        category: "important-not-urgent",
        date: selectedDate || todayStr,
        time: "09:00",
      });
      setQuickTitle("");
    } catch (err) {
      console.error("Failed to quick add task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100">
              {isSelectedDateToday ? "Today's Tasks" : `Tasks for ${formattedSelectedDate}`}
            </h2>
            {isSelectedDateToday && (
              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md">
                Today
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
            {totalCount === 0
              ? "No tasks scheduled"
              : `${completedCount} of ${totalCount} completed (${Math.round((completedCount / totalCount) * 100)}%)`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <UniversalDateNavigator compact />
          <button
            type="button"
            onClick={onOpenCreateTaskModal}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Main Tasks Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Quick Add Input Row */}
        <form onSubmit={handleQuickAdd} className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center gap-3">
          <div className="text-slate-400 dark:text-slate-500 pl-1">
            <Plus className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Add a new task and press Enter..."
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-sans"
          />
          {quickTitle.trim() && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-all cursor-pointer"
            >
              Add
            </button>
          )}
        </form>

        {/* Task List */}
        {sortedDayTasks.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
              <ListTodo className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No tasks for {isSelectedDateToday ? "today" : formattedSelectedDate}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto font-sans">
                Type above to quickly add a task or click the button below.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCreateTaskModal}
              className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedDayTasks.map((task) => {
              const isCompleted = task.status === "completed";
              const durationText = getTaskDurationText(task);

              return (
                <div
                  key={task.id}
                  className={`group p-4 flex items-center justify-between gap-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                    isCompleted ? "bg-slate-50/30 dark:bg-slate-950/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox button */}
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className="cursor-pointer shrink-0 transition-transform active:scale-90"
                      title={isCompleted ? "Mark as pending" : "Mark as completed"}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/40" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-amber-500 transition-colors" />
                      )}
                    </button>

                    {/* Task Title & Duration */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => onToggleTask(task.id)}
                          className={`text-sm cursor-pointer select-none transition-all break-words ${
                            isCompleted
                              ? "line-through text-slate-400 dark:text-slate-500"
                              : "text-slate-800 dark:text-slate-100 font-medium"
                          }`}
                        >
                          {task.title}
                        </span>
                        {durationText && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                            <Clock className="w-3 h-3 text-amber-500" />
                            {durationText}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate font-sans">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Task"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {onDeleteTask && (
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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

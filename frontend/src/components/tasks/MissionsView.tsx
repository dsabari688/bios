import React, { useEffect, useState } from "react";
import { Search, Plus, Trash2, Calendar, Edit3, CheckCircle, ChevronDown, Repeat, Clock } from "lucide-react";
import { Task, TaskPriority } from "../../types";
import { formatTimeRange, getLocalDateString, formatDisplayDate, getRelativeDateLabel } from "../../lib/timeUtils";
import { useStore } from "../../store/useStore";
import { UniversalDateNavigator } from "../common/UniversalDateNavigator";
import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MissionsViewProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenCreateModal: () => void;
  onRescheduleTaskSubmit: (taskId: string, date: string) => void;
  onDeferTask?: (task: Task) => void;
  selectedTaskId?: string | null;
  onFocusTask?: (id: string, title: string) => void;
}

const SortableTask = ({ task, children }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({
    id: task.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

type FilterTab = "all" | "today" | "date" | "upcoming" | "past" | "pending" | "completed" | "rescheduled" | "recurring";

export const MissionsView: React.FC<MissionsViewProps> = ({
  tasks,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onOpenCreateModal,
  onRescheduleTaskSubmit,
  onDeferTask,
  selectedTaskId,
  onFocusTask
}) => {
  const { selectedDate, setSelectedDate } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [rescheduleInputMap, setRescheduleInputMap] = useState<Record<string, string>>({});
  const [showRescheduleFormMap, setShowRescheduleFormMap] = useState<Record<string, boolean>>({});
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  const todayStr = getLocalDateString(new Date());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = localTasks.find((task) => task.id === active.id);
    const targetTask = localTasks.find((task) => task.id === over.id);
    if (!activeTask || !targetTask) return;

    if (activeTask.date !== targetTask.date) {
      onRescheduleTaskSubmit(activeTask.id, targetTask.date);
    } else {
      const oldIndex = localTasks.findIndex((task) => task.id === active.id);
      const newIndex = localTasks.findIndex((task) => task.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setLocalTasks((prevTasks) => arrayMove(prevTasks, oldIndex, newIndex));
      }
    }
  };

  const normalizeDate = (d: string | undefined | null) => (d ? (d.includes("T") ? d.split("T")[0] : d) : "");

  // Tab counts
  const counts: Record<FilterTab, number> = {
    all: localTasks.length,
    today: localTasks.filter((t) => normalizeDate(t.date) === todayStr).length,
    date: localTasks.filter((t) => normalizeDate(t.date) === selectedDate).length,
    upcoming: localTasks.filter((t) => normalizeDate(t.date) > todayStr).length,
    past: localTasks.filter((t) => normalizeDate(t.date) < todayStr).length,
    pending: localTasks.filter((t) => t.status === "pending").length,
    completed: localTasks.filter((t) => t.status === "completed").length,
    rescheduled: localTasks.filter((t) => (t.rescheduledCount || 0) > 0).length,
    recurring: localTasks.filter((t) => t.recurType && t.recurType !== "none").length,
  };

  // Filter tasks
  const filteredTasks = localTasks.filter((t) => {
    const titleMatch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    if (!titleMatch) return false;

    const taskDate = normalizeDate(t.date);
    if (activeTab === "today") return taskDate === todayStr;
    if (activeTab === "date") return taskDate === selectedDate;
    if (activeTab === "upcoming") return taskDate > todayStr;
    if (activeTab === "past") return taskDate < todayStr;
    if (activeTab === "pending") return t.status === "pending";
    if (activeTab === "completed") return t.status === "completed";
    if (activeTab === "rescheduled") return (t.rescheduledCount || 0) > 0;
    if (activeTab === "recurring") return t.recurType && t.recurType !== "none";

    return true; 
  });

  // Sort and group tasks by Date
  const sortedFilteredTasks = [...filteredTasks].sort((a, b) => {
    const aDate = normalizeDate(a?.date);
    const bDate = normalizeDate(b?.date);
    const dateCompare = aDate.localeCompare(bDate);
    if (dateCompare !== 0) return dateCompare;
    
    const aIsCritical = a?.category === "urgent-important" || (a?.category as string) === "important-urgent";
    const bIsCritical = b?.category === "urgent-important" || (b?.category as string) === "important-urgent";
    if (aIsCritical !== bIsCritical) {
      return aIsCritical ? -1 : 1;
    }
    
    const aTime = String(a?.time || "09:00");
    const bTime = String(b?.time || "09:00");
    return aTime.localeCompare(bTime);
  });

  const groupedTasks: Record<string, Task[]> = {};
  sortedFilteredTasks.forEach((task) => {
    const taskDateKey = normalizeDate(task?.date);
    if (!groupedTasks[taskDateKey]) {
      groupedTasks[taskDateKey] = [];
    }
    groupedTasks[taskDateKey].push(task);
  });

  const sortedDates = Object.keys(groupedTasks).sort((a, b) => String(a || "").localeCompare(String(b || "")));

  const toggleRescheduleForm = (taskId: string, defaultDate: string) => {
    setShowRescheduleFormMap((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
    if (!rescheduleInputMap[taskId]) {
      setRescheduleInputMap((prev) => ({ ...prev, [taskId]: defaultDate }));
    }
  };

  const handleRescheduleSubmitLocal = (taskId: string) => {
    const targetDate = rescheduleInputMap[taskId];
    if (targetDate) {
      onRescheduleTaskSubmit(taskId, targetDate);
      setShowRescheduleFormMap((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  // FULL HELPER FUNCTION WITH ALL BUTTONS
  const renderTaskCard = (task: Task, isMission: boolean) => {
    const isCompleted = task.status === "completed";
    const isCritical = task.category === "urgent-important" || (task.category as string) === "important-urgent";
    const isImportant = task.category === "important-not-urgent";
    const isUrgentMinor = task.category === "urgent-not-important" || (task.category as string) === "not-important-urgent";

    let priorityLabel = "Low";
    let priorityBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-150";

    if (isCritical) {
      priorityLabel = "High";
      priorityBadgeColor = "bg-rose-50 text-rose-700 border-rose-150";
    } else if (isImportant || isUrgentMinor) {
      priorityLabel = "Medium";
      priorityBadgeColor = "bg-amber-50 text-amber-700 border-amber-150";
    }

    const isSelected = selectedTaskId === task.id;

    return (
      <SortableTask task={task} key={task.id}>
        <div
          onClick={() => onFocusTask?.(task.id, task.title)}
          className={`bg-white rounded-2xl border transition-all p-5 shadow-xs cursor-pointer ${
            isSelected
              ? "border-l-4 border-l-amber-500 border-slate-200/50 bg-amber-500/[0.015] shadow-[0_4px_16px_rgba(245,166,35,0.06)]"
              : "border-slate-100 hover:shadow-md"
          } ${isCompleted ? "opacity-75 bg-slate-50/20" : ""}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              {/* Toggle */}
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTask(task.id);
                }}
                className="mt-1 shrink-0 text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                {isCompleted ? (
                  <CheckCircle className="w-5.5 h-5.5 text-emerald-500 fill-emerald-50" />
                ) : (
                  <div className="w-5.5 h-5.5 rounded-full border-2 border-slate-300 hover:border-amber-500 hover:scale-105 transition-all" />
                )}
              </button>

              <div className="min-w-0">
                <h4
                  className={`font-display font-bold text-sm text-slate-800 leading-snug flex items-center gap-2 flex-wrap ${
                    isCompleted ? "line-through text-slate-400" : ""
                  }`}
                >
                  {task.title}
                  {isSelected && (
                    <span className="font-mono text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-xs border border-amber-200 uppercase tracking-widest animate-pulse">
                      &bull; FOCUSED
                    </span>
                  )}
                </h4>
                {task.description && (
                  <p className="text-xs text-slate-500 mt-1 font-sans">{task.description}</p>
                )}
                
                {/* Meta information indicators */}
                <div className="flex flex-wrap items-center gap-3 mt-2.5 font-mono text-[10px]">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatTimeRange(task.time, task.endTime)}
                  </span>

                  <span className="text-slate-400 font-sans">|</span>

                  <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${priorityBadgeColor}`}>
                    {priorityLabel}
                  </span>

                  {task.recurType !== "none" && (
                    <>
                      <span className="text-slate-400 font-sans">|</span>
                      <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">
                        <Repeat className="w-3 h-3" />
                        {task.recurType}
                      </span>
                    </>
                  )}

                  {task.rescheduledCount > 0 && (
                    <>
                      <span className="text-slate-400 font-sans">|</span>
                      <span 
                        title={task.deferReason ? `Last reason: ${task.deferReason}` : undefined}
                        className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                      >
                        deferred x{task.rescheduledCount}{task.maxDeferLimit ? ` / ${task.maxDeferLimit}` : ""}
                        {task.deferReason && <span className="opacity-75 lowercase font-normal italic truncate max-w-[120px]">&bull; {task.deferReason}</span>}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions buttons container */}
            <div 
              className="flex items-center gap-1 shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask(task);
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-mono cursor-pointer flex items-center gap-0.5 transition-colors"
                title="Modify Strategic Mission (Edit)"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDeferTask) {
                    onDeferTask(task);
                  } else {
                    toggleRescheduleForm(task.id, task.date);
                  }
                }}
                className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded text-amber-700 dark:text-amber-300 text-[11px] font-mono font-bold cursor-pointer transition-colors"
                title="Defer Tactical Mission"
              >
                Defer
              </button>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(task.id);
                }}
                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Decommission Mission (Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Inline Deferral Form Modal-like widget */}
          {showRescheduleFormMap[task.id] && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 max-w-sm flex items-end gap-3 animated-in fade-in duration-200">
              <div className="flex-1">
                <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase mb-1">
                  Select new date
                </label>
                <input
                  type="date"
                  value={rescheduleInputMap[task.id] || task.date}
                  onChange={(e) =>
                    setRescheduleInputMap((prev) => ({
                      ...prev,
                      [task.id]: e.target.value
                    }))
                  }
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRescheduleSubmitLocal(task.id);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      </SortableTask>
    );
  };

  return (
    <div className="relative pb-24 space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Tactical Operations</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Full mission matrix — review today's priorities, past operational history, and future schedules.
          </p>
        </div>
        
        {/* Top Date Navigation & Global Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <UniversalDateNavigator
            compact
            onDateChange={() => {
              if (activeTab !== "date") {
                setActiveTab("date");
              }
            }}
          />
        </div>
      </div>

      {/* Pill Search Input */}
      <div className="relative font-sans">
        <input
          type="text"
          placeholder="Filter tactical missions by keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700 text-sm shadow-xs transition-shadow"
        />
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
      </div>

      {/* Filter Chips Bar */}
      <div className="w-full font-display">
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none items-center w-full">
          {(
            [
              { key: "all", label: "All Tasks" },
              { key: "today", label: "Today" },
              { key: "date", label: "Date Focus" },
              { key: "upcoming", label: "Upcoming" },
              { key: "past", label: "Past History" },
              { key: "pending", label: "Pending" },
              { key: "completed", label: "Completed" },
              { key: "rescheduled", label: "Rescheduled" },
              { key: "recurring", label: "Recurring" }
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === tab.key
                  ? "bg-amber-500 border-amber-500 text-slate-950 shadow-xs font-bold"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.key ? "bg-slate-950 text-amber-400 font-bold" : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Cards Grid/Stack */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={sortedFilteredTasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-8">
            {sortedDates.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm space-y-2">
                <p className="font-semibold text-slate-700">No missions found under current filter.</p>
                <p className="text-xs text-slate-400">
                  {activeTab === "today" && "No missions scheduled for today."}
                  {activeTab === "date" && `No missions scheduled for ${formatDisplayDate(selectedDate)}.`}
                  {activeTab === "upcoming" && "No future missions scheduled yet."}
                  {activeTab === "past" && "No past mission history recorded."}
                  {activeTab === "pending" && "All missions are completed!"}
                  {activeTab === "completed" && "No missions completed yet."}
                </p>
                <button
                  type="button"
                  onClick={onOpenCreateModal}
                  className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer inline-block"
                >
                  + Assign New Mission
                </button>
              </div>
            ) : (
              sortedDates.map((dateStr) => {
                const dateTasks = groupedTasks[dateStr];
                const formattedDate = formatDisplayDate(dateStr, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
                const relInfo = getRelativeDateLabel(dateStr);
                const isDateToday = dateStr === todayStr;
                const isDatePast = dateStr < todayStr;
                const isDateFuture = dateStr > todayStr;

                return (
                  <div key={dateStr} className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 px-2 gap-2">
                      <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
                        <span className={isDateToday ? "text-amber-600" : isDateFuture ? "text-indigo-600" : "text-slate-500"}>
                          // {formattedDate}
                        </span>
                        {isDateToday ? (
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[9px] uppercase tracking-wider rounded-sm font-bold">
                            TODAY
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 border text-[9px] uppercase tracking-wider rounded-sm font-bold ${
                            isDateFuture ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-100 border-slate-200 text-slate-500"
                          }`}>
                            {relInfo.label}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {dateTasks.filter(t => t.status === "completed").length}/{dateTasks.length} Completed
                      </span>
                    </div>
                    <div className="space-y-4">
                      {dateTasks.map((task) => renderTaskCard(task, task.category === "urgent-important"))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Floating Action Button */}
      <button
        onClick={onOpenCreateModal}
        className="fixed bottom-6 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center p-0 cursor-pointer shadow-lg hover:shadow-xl active:scale-[0.98] transition-all z-29"
        title="Formulate New Task Module"
      >
        <Plus className="w-6 h-6 stroke-3" />
      </button>
    </div>
  );
};


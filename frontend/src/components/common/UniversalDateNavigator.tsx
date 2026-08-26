import React from "react";
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from "lucide-react";
import { useStore } from "../../store/useStore";
import { getLocalDateString, formatDisplayDate, getRelativeDateLabel } from "../../lib/timeUtils";

interface UniversalDateNavigatorProps {
  compact?: boolean;
  className?: string;
  showQuickJumps?: boolean;
  onDateChange?: (date: string) => void;
}

export const UniversalDateNavigator: React.FC<UniversalDateNavigatorProps> = ({
  compact = false,
  className = "",
  showQuickJumps = true,
  onDateChange
}) => {
  const { selectedDate, setSelectedDate, changeSelectedDate, resetSelectedDateToToday } = useStore();
  const todayStr = getLocalDateString(new Date());
  
  const isToday = selectedDate === todayStr;
  const relInfo = getRelativeDateLabel(selectedDate);
  const formattedDisplay = formatDisplayDate(selectedDate, {
    weekday: compact ? "short" : "short",
    month: "short",
    day: "numeric",
    year: selectedDate.slice(0, 4) !== todayStr.slice(0, 4) ? "numeric" : undefined
  });

  const handleSetDate = (newDate: string) => {
    if (!newDate) return;
    setSelectedDate(newDate);
    if (onDateChange) onDateChange(newDate);
  };

  const handleChangeOffset = (offset: number) => {
    changeSelectedDate(offset);
  };

  const handleResetToday = () => {
    resetSelectedDateToToday();
    if (onDateChange) onDateChange(todayStr);
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-900/90 p-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-xs ${className}`}
      >
        <button
          type="button"
          onClick={() => handleChangeOffset(-1)}
          className="w-7 h-7 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"
          title="Previous Day"
          aria-label="Previous Day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetToday}
          className={`h-7 px-3 flex items-center justify-center rounded-full text-xs font-mono font-bold leading-none transition-all cursor-pointer select-none shrink-0 ${
            isToday
              ? "bg-amber-500 text-slate-950 shadow-xs"
              : "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
          }`}
          title={isToday ? "Current Day: Today" : "Jump to Today"}
        >
          <span>{isToday ? "Today" : formattedDisplay}</span>
        </button>

        <button
          type="button"
          onClick={() => handleChangeOffset(1)}
          className="w-7 h-7 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"
          title="Next Day"
          aria-label="Next Day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 my-auto mx-0.5 shrink-0" />

        <div className="relative w-7 h-7 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shrink-0">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleSetDate(e.target.value)}
            className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-10"
            title="Choose custom date"
          />
          <Calendar className="w-3.5 h-3.5 pointer-events-none" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Step controls */}
      <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-900/90 p-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-xs">
        <button
          type="button"
          onClick={() => handleChangeOffset(-1)}
          className="h-7 px-2.5 flex items-center justify-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer text-xs font-mono font-bold"
          title="Previous Day"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        <button
          type="button"
          onClick={handleResetToday}
          className={`h-7 px-3.5 flex items-center justify-center gap-1.5 rounded-full text-xs font-mono font-bold leading-none transition-all cursor-pointer ${
            isToday
              ? "bg-amber-500 text-slate-950 shadow-xs"
              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-400"
          }`}
          title="Reset to Today"
        >
          <span>Today</span>
          {!isToday && <RotateCcw className="w-3 h-3 text-slate-400" />}
        </button>

        <button
          type="button"
          onClick={() => handleChangeOffset(1)}
          className="h-7 px-2.5 flex items-center justify-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer text-xs font-mono font-bold"
          title="Next Day"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Date Picker Input */}
      <div className="relative flex items-center">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => handleSetDate(e.target.value)}
          className="h-9 px-3 bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer shadow-xs"
          title="Pick a specific date"
        />
      </div>

      {/* Relative Badge */}
      {!isToday && (
        <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full">
          {relInfo.label}
        </span>
      )}
    </div>
  );
};

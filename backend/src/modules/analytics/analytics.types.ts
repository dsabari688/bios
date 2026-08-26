export interface HabitSummaryEntry {
  id: string;
  name: string;
  frequency: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionsInPeriod: number;
  completionRate: number;
  periodUnits: number;
  targetValue?: number | null;
  unit?: string | null;
}

export interface HabitAnalyticsSummary {
  periodDays: number;
  totalHabits: number;
  overallCompletionRate: number;
  dailyCompletionCounts: Record<string, number>;
  habits: HabitSummaryEntry[];
}

export interface ChronologicalFlowEntry {
  date: string;
  totalTasks: number;
  completedTasks: number;
  missedTasks: number;
  completionRate: number;
  focusBlocksCompleted: number;
}

export interface DiagnosticMetrics {
  totalTrackedTasks: number;
  completionRate: number;
  missedTasks: number;
  focusBlocksCompleted: number;
  chronologicalFlow: ChronologicalFlowEntry[];
}

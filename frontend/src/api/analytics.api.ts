import { apiRequest } from "./client";

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

export const analyticsApi = {
  async getHabitSummary(
    days = 30,
  ): Promise<HabitAnalyticsSummary> {
    return apiRequest<HabitAnalyticsSummary>(
      `/analytics/habits/summary?days=${days}`,
    );
  },

  async getWeeklyReview(): Promise<{
    tasksCompleted: number;
    tasksSkipped: number;
    habitConsistency: number;
    bestHabit: string;
    worstHabit: string;
    moneySpent: number;
    budgetStatus: string;
    goalProgress: Array<{ title: string; progress: number; status: string }>;
    piggyInsight: string;
  }> {
    return apiRequest("/analytics/weekly-review");
  },

  async getDiagnosticMetrics(
    days = 7,
  ): Promise<DiagnosticMetrics> {
    return apiRequest<DiagnosticMetrics>(
      `/analytics/metrics?days=${days}`,
    );
  },
};


export const BUDGET_PERIODS = [
  "monthly",
  "weekly",
] as const;

export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export interface CreateBudgetInput {
  category: string;
  limitAmount: number;
  period: BudgetPeriod;
}

export interface UpdateBudgetInput {
  category?: string;
  limitAmount?: number;
  period?: BudgetPeriod;
}

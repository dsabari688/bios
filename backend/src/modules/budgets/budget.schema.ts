import {
  BUDGET_PERIODS,
  type BudgetPeriod,
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from "./budget.types.js";

function validateLimitAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("Limit amount must be a number greater than 0");
  }

  return value;
}

function validateCategory(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Category is required");
  }

  return value.trim();
}

function validatePeriod(value: unknown): BudgetPeriod {
  if (!BUDGET_PERIODS.includes(value as any)) {
    throw new Error('Period must be either "weekly" or "monthly"');
  }

  return value as BudgetPeriod;
}

export function validateCreateBudget(input: unknown): CreateBudgetInput {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;

  return {
    category: validateCategory(body.category),
    limitAmount: validateLimitAmount(body.limitAmount),
    period: validatePeriod(body.period),
  };
}

export function validateUpdateBudget(input: unknown): UpdateBudgetInput {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;
  const result: UpdateBudgetInput = {};

  if (body.category !== undefined) {
    result.category = validateCategory(body.category);
  }

  if (body.limitAmount !== undefined) {
    result.limitAmount = validateLimitAmount(body.limitAmount);
  }

  if (body.period !== undefined) {
    result.period = validatePeriod(body.period);
  }

  return result;
}

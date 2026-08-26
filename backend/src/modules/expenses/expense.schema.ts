import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from "./expense.types.js";

function validateAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("Amount must be a number greater than 0");
  }

  return value;
}

function validateTransactionDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Transaction date is required");
  }

  if (Number.isNaN(new Date(value).getTime())) {
    throw new Error("Transaction date must be a valid date");
  }

  return value;
}

function validateCategory(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Category is required");
  }

  return value.trim();
}

function validateOptionalString(
  key: string,
  value: unknown,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (value !== undefined && typeof value !== "string") {
    throw new Error(`${key} must be a string or null`);
  }

  return value as string | null | undefined;
}

export function validateCreateExpense(input: unknown): CreateExpenseInput {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;

  const amount = validateAmount(body.amount);
  const category = validateCategory(body.category);
  const transactionDate = validateTransactionDate(body.transactionDate);

  const description = validateOptionalString(
    "Description",
    body.description,
  );
  const paymentMethod = validateOptionalString(
    "Payment method",
    body.paymentMethod,
  );

  if (
    body.isImpulsive !== undefined &&
    typeof body.isImpulsive !== "boolean"
  ) {
    throw new Error("Is impulsive must be a boolean");
  }

  const explanation = validateOptionalString(
    "Explanation",
    body.explanation,
  );

  return {
    amount,
    category,
    description:
      description === undefined ? undefined : description ?? null,
    transactionDate,
    paymentMethod:
      paymentMethod === undefined ? undefined : paymentMethod ?? null,
    isImpulsive: body.isImpulsive === undefined ? false : body.isImpulsive,
    explanation:
      explanation === undefined ? undefined : explanation ?? null,
  };
}

export function validateUpdateExpense(input: unknown): UpdateExpenseInput {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;
  const result: UpdateExpenseInput = {};

  if (body.amount !== undefined) {
    result.amount = validateAmount(body.amount);
  }

  if (body.category !== undefined) {
    result.category = validateCategory(body.category);
  }

  if (body.transactionDate !== undefined) {
    result.transactionDate = validateTransactionDate(body.transactionDate);
  }

  if (body.description !== undefined) {
    result.description = validateOptionalString(
      "Description",
      body.description,
    ) as string | null;
  }

  if (body.paymentMethod !== undefined) {
    result.paymentMethod = validateOptionalString(
      "Payment method",
      body.paymentMethod,
    ) as string | null;
  }

  if (body.isImpulsive !== undefined) {
    if (typeof body.isImpulsive !== "boolean") {
      throw new Error("Is impulsive must be a boolean");
    }

    result.isImpulsive = body.isImpulsive;
  }

  if (body.explanation !== undefined) {
    result.explanation = validateOptionalString(
      "Explanation",
      body.explanation,
    ) as string | null;
  }

  return result;
}

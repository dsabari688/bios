import { expenseService } from "../../modules/expenses/expense.service.js";
import type {
  PiggyToolDefinition,
  PiggyToolResult,
} from "./habitTools.js";

export const expenseToolDefinitions: PiggyToolDefinition[] = [
  {
    name: "piggy_expenses_list",
    description:
      "List recent expenses with amount, category and transaction date (newest first).",
    category: "expenses",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "piggy_expense_create",
    description:
      "Log a new expense. Amount must be positive; date defaults to now.",
    category: "expenses",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Expense amount (> 0)" },
        category: {
          type: "string",
          description: "Spending category (e.g. food, transport)",
        },
        description: { type: "string", description: "Optional note" },
        transactionDate: {
          type: "string",
          description: "ISO datetime of the transaction (defaults to now)",
        },
        isImpulsive: {
          type: "boolean",
          description: "Whether this was an impulsive purchase",
          default: false,
        },
      },
      required: ["amount", "category"],
    },
  },
  {
    name: "piggy_expense_delete",
    description:
      "Permanently delete an expense by id.",
    category: "expenses",
    inputSchema: {
      type: "object",
      properties: {
        expenseId: { type: "string", description: "ID of the expense" },
      },
      required: ["expenseId"],
    },
  },
];

export const expenseTools = {
  async piggy_expenses_list(): Promise<PiggyToolResult> {
    const expenses = await expenseService.findAll();

    const total = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    return {
      success: true,
      data: expenses,
      message: `Retrieved ${expenses.length} expenses totalling ${total.toFixed(2)}.`,
    };
  },

  async piggy_expense_create(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    const amount = Number(args.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        error: "amount must be a number greater than 0",
        message: "Failed to log expense.",
      };
    }

    if (
      typeof args.category !== "string" ||
      !args.category.trim()
    ) {
      return {
        success: false,
        error: "category is required",
        message: "Failed to log expense.",
      };
    }

    const expense = await expenseService.create({
      amount,
      category: args.category.trim(),
      transactionDate:
        typeof args.transactionDate === "string" &&
        args.transactionDate.trim()
          ? args.transactionDate
          : new Date().toISOString(),
      ...(typeof args.description === "string"
        ? { description: args.description }
        : {}),
      ...(typeof args.isImpulsive === "boolean"
        ? { isImpulsive: args.isImpulsive }
        : {}),
    });

    return {
      success: true,
      data: expense,
      message: `Logged expense of ${expense.amount.toFixed(2)} in ${expense.category}.`,
    };
  },

  async piggy_expense_delete(
    args: Record<string, unknown>,
  ): Promise<PiggyToolResult> {
    if (typeof args.expenseId !== "string") {
      return {
        success: false,
        error: "expenseId is required",
        message: "Failed to delete expense.",
      };
    }

    await expenseService.delete(args.expenseId);

    return {
      success: true,
      message: "Expense deleted.",
    };
  },
};

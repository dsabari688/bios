import { randomUUID } from "node:crypto";
import { pool } from "../../db/postgres.js";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from "./expense.types.js";

interface ExpenseRow {
  id: string;
  amount: string;
  category: string;
  description: string | null;
  transactionDate: Date;
  paymentMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: ExpenseRow) {
  return {
    ...row,
    amount: Number(row.amount),
    transactionDate: new Date(row.transactionDate),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export const expenseRepository = {
  async create(input: CreateExpenseInput) {
    const result = await pool.query(
      `
      INSERT INTO "expense"
      (
        "id",
        "amount",
        "category",
        "description",
        "transactionDate",
        "paymentMethod",
        "isImpulsive",
        "explanation",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        randomUUID(),
        input.amount,
        input.category,
        input.description ?? null,
        new Date(input.transactionDate),
        input.paymentMethod ?? null,
        input.isImpulsive ?? false,
        input.explanation ?? null,
        new Date(),
      ],
    );

    return mapRow(result.rows[0]);
  },

  async findAll() {
    const result = await pool.query(`
      SELECT *
      FROM "expense"
      ORDER BY
        "transactionDate" DESC,
        "createdAt" DESC
    `);

    return result.rows.map(mapRow);
  },

  async findById(id: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM "expense"
      WHERE "id" = $1
      `,
      [id],
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  async update(id: string, input: UpdateExpenseInput) {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.amount !== undefined) {
      fields.push(`"amount" = $${values.length + 1}`);
      values.push(input.amount);
    }

    if (input.category !== undefined) {
      fields.push(`"category" = $${values.length + 1}`);
      values.push(input.category);
    }

    if (input.description !== undefined) {
      fields.push(`"description" = $${values.length + 1}`);
      values.push(input.description);
    }

    if (input.transactionDate !== undefined) {
      fields.push(`"transactionDate" = $${values.length + 1}`);
      values.push(new Date(input.transactionDate));
    }

    if (input.paymentMethod !== undefined) {
      fields.push(`"paymentMethod" = $${values.length + 1}`);
      values.push(input.paymentMethod);
    }

    if (input.isImpulsive !== undefined) {
      fields.push(`"isImpulsive" = $${values.length + 1}`);
      values.push(input.isImpulsive);
    }

    if (input.explanation !== undefined) {
      fields.push(`"explanation" = $${values.length + 1}`);
      values.push(input.explanation);
    }

    fields.push(`"updatedAt" = $${values.length + 1}`);
    values.push(new Date());

    values.push(id);

    const result = await pool.query(
      `
      UPDATE "expense"
      SET ${fields.join(", ")}
      WHERE "id" = $${values.length}
      RETURNING *
      `,
      values,
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  async delete(id: string) {
    const result = await pool.query(
      `
      DELETE FROM "expense"
      WHERE "id" = $1
      RETURNING "id"
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },
};

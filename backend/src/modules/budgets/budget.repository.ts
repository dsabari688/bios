import { randomUUID } from "node:crypto";
import { pool } from "../../db/postgres.js";
import type {
  CreateBudgetInput,
  UpdateBudgetInput,
} from "./budget.types.js";

interface BudgetAllowanceRow {
  id: string;
  category: string;
  limitAmount: string;
  period: string;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: BudgetAllowanceRow) {
  return {
    ...row,
    limitAmount: Number(row.limitAmount),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export const budgetRepository = {
  async create(input: CreateBudgetInput) {
    const result = await pool.query(
      `
      INSERT INTO "budget_allowance"
      (
        "id",
        "category",
        "limitAmount",
        "period",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        randomUUID(),
        input.category,
        input.limitAmount,
        input.period,
        new Date(),
      ],
    );

    return mapRow(result.rows[0]);
  },

  async findAll() {
    const result = await pool.query(`
      SELECT *
      FROM "budget_allowance"
      ORDER BY
        "createdAt" DESC
    `);

    return result.rows.map(mapRow);
  },

  async findById(id: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM "budget_allowance"
      WHERE "id" = $1
      `,
      [id],
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  async update(id: string, input: UpdateBudgetInput) {
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of ["category", "limitAmount", "period"] as const) {
      const value = input[key];

      if (value !== undefined) {
        fields.push(`"${key}" = $${values.length + 1}`);
        values.push(value);
      }
    }

    fields.push(`"updatedAt" = $${values.length + 1}`);
    values.push(new Date());

    values.push(id);

    const result = await pool.query(
      `
      UPDATE "budget_allowance"
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
      DELETE FROM "budget_allowance"
      WHERE "id" = $1
      RETURNING "id"
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },
};

import { randomUUID } from "node:crypto";
import { pool } from "../../db/postgres.js";
import type {
  CreateGoalInput,
  UpdateGoalInput,
} from "./goal.types.js";

export const goalRepository = {
  async create(input: CreateGoalInput) {
    const result = await pool.query(
      `
      INSERT INTO "goal"
      (
        "id",
        "title",
        "description",
        "targetDate",
        "progress",
        "status",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        randomUUID(),
        input.title,
        input.description ?? null,
        input.targetDate ?? null,
        input.progress ?? 0,
        input.status ?? "active",
        new Date(),
      ],
    );

    return result.rows[0];
  },

  async findAll() {
    const result = await pool.query(`
      SELECT *
      FROM "goal"
      ORDER BY
        CASE
          WHEN "status" = 'active' THEN 0
          WHEN "status" = 'completed' THEN 1
          ELSE 2
        END,
        "targetDate" ASC NULLS LAST,
        "createdAt" DESC
    `);

    return result.rows;
  },

  async findById(id: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM "goal"
      WHERE "id" = $1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },

  async update(id: string, input: UpdateGoalInput) {
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(input)) {
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
      UPDATE "goal"
      SET ${fields.join(", ")}
      WHERE "id" = $${values.length}
      RETURNING *
      `,
      values,
    );

    return result.rows[0] ?? null;
  },

  async delete(id: string) {
    const result = await pool.query(
      `
      DELETE FROM "goal"
      WHERE "id" = $1
      RETURNING "id"
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },
};

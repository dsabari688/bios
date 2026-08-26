import { randomUUID } from "node:crypto";
import { pool } from "../../db/postgres.js";
import type {
  CreateHabitInput,
  UpdateHabitInput,
} from "./habit.types.js";

export const habitRepository = {
  async create(input: CreateHabitInput) {
    const result = await pool.query(
      `
      INSERT INTO "habit" (
        "id",
        "name",
        "frequency",
        "streak",
        "logs",
        "skippedDaysCount",
        "icon",
        "category",
        "targetValue",
        "unit",
        "stepIncrement",
        "dailyProgress",
        "notes"
      )
      VALUES (
        $1,
        $2,
        $3,
        0,
        '[]'::jsonb,
        0,
        $4,
        $5,
        $6,
        $7,
        $8,
        '{}'::jsonb,
        $9
      )
      RETURNING *
      `,
      [
        randomUUID(),
        input.name,
        input.frequency,
        input.icon ?? "book-open",
        input.category ?? "general",
        input.targetValue ?? null,
        input.unit ?? null,
        input.stepIncrement ?? null,
        input.notes ?? null,
      ],
    );

    return result.rows[0];
  },

  async findAll() {
    const result = await pool.query(`
      SELECT *
      FROM "habit"
      ORDER BY "createdAt" DESC
    `);

    return result.rows;
  },

  async findById(id: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM "habit"
      WHERE "id" = $1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },

  async findByName(name: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM "habit"
      WHERE LOWER(TRIM("name")) = LOWER(TRIM($1))
      LIMIT 1
      `,
      [name],
    );

    return result.rows[0] ?? null;
  },

  async update(
    id: string,
    input: UpdateHabitInput,
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        fields.push(`"${key}" = $${values.length + 1}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`"updatedAt" = NOW()`);

    values.push(id);

    const result = await pool.query(
      `
      UPDATE "habit"
      SET ${fields.join(", ")}
      WHERE "id" = $${values.length}
      RETURNING *
      `,
      values,
    );

    return result.rows[0] ?? null;
  },

  async updateProgress(
    id: string,
    logs: string[],
    streak: number,
    dailyProgress: Record<string, number>,
  ) {
    const result = await pool.query(
      `
      UPDATE "habit"
      SET
        "logs" = $1::jsonb,
        "streak" = $2,
        "dailyProgress" = $3::jsonb,
        "updatedAt" = NOW()
      WHERE "id" = $4
      RETURNING *
      `,
      [
        JSON.stringify(logs),
        streak,
        JSON.stringify(dailyProgress),
        id,
      ],
    );

    return result.rows[0] ?? null;
  },

  async delete(id: string) {
    const result = await pool.query(
      `
      DELETE FROM "habit"
      WHERE "id" = $1
      RETURNING "id"
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },
};
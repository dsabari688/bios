import { randomUUID } from "node:crypto";
import { pool } from "../../db/postgres.js";
import type { CreateTaskInput, UpdateTaskInput } from "./task.types.js";

export const taskRepository = {
  async create(input: CreateTaskInput) {
    const result = await pool.query(
      `
      INSERT INTO "task"
      (
        "id",
        "title",
        "description",
        "date",
        "endTime",
        "status",
        "category",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        randomUUID(),
        input.title,
        input.description ?? null,
        input.date,
        input.endTime ?? null,
        input.status ?? "pending",
        input.category ?? "important-not-urgent",
        new Date(),
      ],
    );

    return result.rows[0];
  },

  async findAll() {
    const result = await pool.query(`
      SELECT *, to_char("date" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as "dateStr"
      FROM "task"
      ORDER BY "date" ASC
    `);

    return result.rows.map((r: any) => {
      if (r.dateStr) { r.date = r.dateStr; delete r.dateStr; }
      return r;
    });
  },

  async findToday(start: Date, end: Date) {
    const result = await pool.query(
      `
      SELECT *
      FROM "task"
      WHERE "date" >= $1
        AND "date" < $2
      ORDER BY "date" ASC
      `,
      [start, end],
    );

    return result.rows;
  },

  async findById(id: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM "task"
      WHERE "id" = $1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },

  async update(id: string, input: UpdateTaskInput) {
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
      UPDATE "task"
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
      DELETE FROM "task"
      WHERE "id" = $1
      RETURNING "id"
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },

  async complete(id: string) {
    const result = await pool.query(
      `
      UPDATE "task"
      SET
        "status" = 'completed',
        "updatedAt" = $1
      WHERE "id" = $2
      RETURNING *
      `,
      [new Date(), id],
    );

    return result.rows[0] ?? null;
  },
};

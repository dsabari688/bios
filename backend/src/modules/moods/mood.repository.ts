import { randomUUID } from "node:crypto";
import { pool } from "../../db/postgres.js";
import type { CreateMoodInput } from "./mood.types.js";

export const moodRepository = {
  async create(input: CreateMoodInput & { id?: string }, score: number) {
    const id = typeof input.id === "string" && input.id.trim() !== "" ? input.id : randomUUID();
    const result = await pool.query(
      `
      INSERT INTO "mood" (
        "id",
        "mood",
        "score",
        "note"
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("id") DO UPDATE SET
        "mood" = EXCLUDED."mood",
        "score" = EXCLUDED."score",
        "note" = EXCLUDED."note",
        "updatedAt" = NOW()
      RETURNING
        "id",
        "mood",
        "score",
        "note",
        "loggedAt",
        "createdAt",
        "updatedAt"
      `,
      [
        id,
        input.mood,
        score,
        input.note ?? null,
      ],
    );

    return result.rows[0];
  },

  async findAll() {
    const result = await pool.query(`
      SELECT
        "id",
        "mood",
        "score",
        "note",
        "loggedAt",
        "createdAt",
        "updatedAt"
      FROM "mood"
      ORDER BY "loggedAt" DESC
    `);

    return result.rows;
  },

  async findTrend(limit: number) {
    const result = await pool.query(
      `
      SELECT
        "id",
        "mood",
        "score",
        "loggedAt"
      FROM "mood"
      ORDER BY "loggedAt" DESC
      LIMIT $1
      `,
      [limit],
    );

    return result.rows;
  },
};

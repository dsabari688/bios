import { randomUUID } from "node:crypto";
import { pool } from "../../db/postgres.js";
import type { CreateNotificationInput } from "./notification.types.js";

export const notificationRepository = {
  async create(input: CreateNotificationInput) {
    const result = await pool.query(
      `
      INSERT INTO "notification" (
        "id",
        "type",
        "title",
        "message",
        "dedupeKey"
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT ("dedupeKey") DO NOTHING
      RETURNING *
      `,
      [
        randomUUID(),
        input.type,
        input.title,
        input.message,
        input.dedupeKey ?? null,
      ],
    );

    return result.rows[0] ?? null;
  },

  async findByDedupeKey(dedupeKey: string) {
    const result = await pool.query(
      `
      SELECT *
      FROM "notification"
      WHERE "dedupeKey" = $1
      `,
      [dedupeKey],
    );

    return result.rows[0] ?? null;
  },

  async findAll(limit = 50) {
    const result = await pool.query(
      `
      SELECT *
      FROM "notification"
      ORDER BY "createdAt" DESC
      LIMIT $1
      `,
      [limit],
    );

    return result.rows;
  },

  async markRead(id: string) {
    const result = await pool.query(
      `
      UPDATE "notification"
      SET "read" = TRUE
      WHERE "id" = $1
      RETURNING *
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },
};

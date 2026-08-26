import { randomUUID } from "node:crypto";
import { pool } from "../db/postgres.js";
import type { HabitSyncItem } from "./sync.types.js";

export const syncRepository = {
  async upsertHabit(item: HabitSyncItem) {
    const id =
      typeof item.id === "string" && item.id.length > 0
        ? item.id
        : randomUUID();

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
        "notes",
        "updatedAt"
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::jsonb,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12::jsonb,
        $13,
        COALESCE($14::timestamptz, NOW())
      )
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "frequency" = EXCLUDED."frequency",
        "streak" = EXCLUDED."streak",
        "logs" = EXCLUDED."logs",
        "skippedDaysCount" = EXCLUDED."skippedDaysCount",
        "icon" = EXCLUDED."icon",
        "category" = EXCLUDED."category",
        "targetValue" = EXCLUDED."targetValue",
        "unit" = EXCLUDED."unit",
        "stepIncrement" = EXCLUDED."stepIncrement",
        "dailyProgress" = EXCLUDED."dailyProgress",
        "notes" = EXCLUDED."notes",
        "updatedAt" = EXCLUDED."updatedAt"
      RETURNING *
      `,
      [
        id,
        item.name,
        item.frequency ?? "daily",
        Number(item.streak) || 0,
        JSON.stringify(Array.isArray(item.logs) ? item.logs : []),
        Number(item.skippedDaysCount) || 0,
        item.icon ?? null,
        item.category ?? "general",
        item.targetValue ?? null,
        item.unit ?? null,
        item.stepIncrement ?? null,
        JSON.stringify(
          item.dailyProgress &&
            typeof item.dailyProgress === "object"
            ? item.dailyProgress
            : {},
        ),
        item.notes ?? null,
        item.updatedAt ?? null,
      ],
    );

    return result.rows[0] ?? null;
  },

  async countHabits() {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM "habit"`,
    );

    return result.rows[0]?.count ?? 0;
  },
};

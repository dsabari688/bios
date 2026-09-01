import { randomUUID } from "node:crypto";
import { pool } from "../db/postgres.js";
import type { HabitSyncItem } from "./sync.types.js";

export const syncRepository = {
  async upsertHabit(item: HabitSyncItem) {
    const id = typeof item.id === "string" && item.id.length > 0 ? item.id : randomUUID();

    const result = await pool.query(
      `
      INSERT INTO "habit" (
        "id", "name", "frequency", "streak", "logs", "skippedDaysCount",
        "icon", "category", "targetValue", "unit", "stepIncrement",
        "dailyProgress", "notes", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, NOW()
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
        "updatedAt" = NOW()
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
        JSON.stringify(item.dailyProgress && typeof item.dailyProgress === "object" ? item.dailyProgress : {}),
        item.notes ?? null,
      ]
    );

    return result.rows[0] ?? null;
  },

  async upsertTask(payload: any) {
    const id = payload.id || randomUUID();
    const safeDate = (v: any) => (v && typeof v === "string" && v.trim() !== "" ? v : null);

    // CRITICAL: Extract YYYY-MM-DD from date to prevent timezone shifting
    const normalizeToDateOnly = (v: any): string => {
      if (v && typeof v === "string" && v.trim() !== "") {
        const match = v.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
      }
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    };

    const normalizeCategory = (cat: any): string => {
      if (!cat || typeof cat !== "string") return "important-not-urgent";
      const map: Record<string, string> = {
        "urgent-important": "important-urgent",
        "important-urgent": "important-urgent",
        "important-not-urgent": "important-not-urgent",
        "urgent-not-important": "not-important-urgent",
        "not-important-urgent": "not-important-urgent",
        "not-urgent-not-important": "not-important-not-urgent",
        "not-important-not-urgent": "not-important-not-urgent",
      };
      return map[cat] || "important-not-urgent";
    };

    const dateOnly = normalizeToDateOnly(payload.date);
    const endTimeRaw = safeDate(payload.endTime);
    const category = normalizeCategory(payload.category);

    const result = await pool.query(
      `
      INSERT INTO "task" (
        "id", "title", "description", "status", "category", "date", "endTime", "rescheduledCount", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, $5, ($6::text)::timestamptz, $7::timestamptz, $8, NOW()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "title" = EXCLUDED."title",
        "description" = EXCLUDED."description",
        "status" = EXCLUDED."status",
        "category" = EXCLUDED."category",
        "date" = EXCLUDED."date",
        "endTime" = EXCLUDED."endTime",
        "rescheduledCount" = EXCLUDED."rescheduledCount",
        "updatedAt" = NOW()
      RETURNING *, to_char("date" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as "dateStr"
      `,
      [
        id,
        payload.title || "Untitled Task",
        payload.description || null,
        payload.status || "pending",
        category,
        dateOnly + "T12:00:00.000Z",
        endTimeRaw,
        payload.rescheduledCount || 0,
      ]
    );
    const row = result.rows[0];
    // Override date with the clean YYYY-MM-DD string
    if (row.dateStr) {
      row.date = row.dateStr;
      delete row.dateStr;
    }
    return row;
  },

  async upsertGoal(payload: any) {
    const id = payload.id || randomUUID();
    const safeDate = (v: any) => (v && typeof v === "string" && v.trim() !== "" ? v : null);
    const result = await pool.query(
      `
      INSERT INTO "goal" (
        "id", "title", "description", "targetDate", "progress", "status", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4::timestamptz, $5, $6, NOW()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "title" = EXCLUDED."title",
        "description" = EXCLUDED."description",
        "targetDate" = EXCLUDED."targetDate",
        "progress" = EXCLUDED."progress",
        "status" = EXCLUDED."status",
        "updatedAt" = NOW()
      RETURNING *
      `,
      [
        id,
        payload.title || "Untitled Goal",
        payload.description || null,
        safeDate(payload.targetDate),
        payload.progress || 0,
        payload.status || "active",
      ]
    );
    return result.rows[0];
  },

  async upsertExpense(payload: any) {
    const id = payload.id || randomUUID();
    const safeDate = (v: any) => (v && typeof v === "string" && v.trim() !== "" ? v : null);
    const result = await pool.query(
      `
      INSERT INTO "expense" (
        "id", "amount", "category", "description", "transactionDate", "paymentMethod", "isImpulsive", "explanation", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, $5::timestamptz, $6, $7, $8, NOW()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "amount" = EXCLUDED."amount",
        "category" = EXCLUDED."category",
        "description" = EXCLUDED."description",
        "transactionDate" = EXCLUDED."transactionDate",
        "paymentMethod" = EXCLUDED."paymentMethod",
        "isImpulsive" = EXCLUDED."isImpulsive",
        "explanation" = EXCLUDED."explanation",
        "updatedAt" = NOW()
      RETURNING *
      `,
      [
        id,
        payload.amount || 0,
        payload.category || "General",
        payload.description || payload.note || null,
        safeDate(payload.transactionDate) || safeDate(payload.date) || new Date().toISOString(),
        payload.paymentMethod || "card",
        Boolean(payload.isImpulsive),
        payload.explanation || null,
      ]
    );
    return result.rows[0];
  },

  async upsertDiary(payload: any) {
    const id = payload.id || randomUUID();
    const safeDate = (v: any) => (v && typeof v === "string" && v.trim() !== "" ? v : null);
    const dateStr = payload.date ? payload.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `
      INSERT INTO "diaryEntry" (
        "id", "date", "timestamp", "content", "review", "mood", "productivityScore", "updatedAt"
      )
      VALUES (
        $1, $2::date, COALESCE($3::timestamptz, NOW()), $4, $5, $6, $7, NOW()
      )
      ON CONFLICT ("date") DO UPDATE SET
        "timestamp" = EXCLUDED."timestamp",
        "content" = EXCLUDED."content",
        "review" = EXCLUDED."review",
        "mood" = EXCLUDED."mood",
        "productivityScore" = EXCLUDED."productivityScore",
        "updatedAt" = NOW()
      RETURNING *
      `,
      [
        id,
        dateStr,
        safeDate(payload.timestamp),
        payload.content || "",
        payload.review || "",
        payload.mood || "neutral",
        payload.productivityScore || 50,
      ]
    );
    return result.rows[0];
  },

  async upsertNotification(payload: any) {
    const id = payload.id || randomUUID();
    const safeDate = (v: any) => (v && typeof v === "string" && v.trim() !== "" ? v : null);
    const result = await pool.query(
      `
      INSERT INTO "notification" (
        "id", "type", "title", "message", "read", "dedupeKey", "createdAt"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW())
      )
      ON CONFLICT ("id") DO UPDATE SET
        "title" = EXCLUDED."title",
        "message" = EXCLUDED."message",
        "read" = EXCLUDED."read"
      RETURNING *
      `,
      [
        id,
        payload.type || "system",
        payload.title || "Notification",
        payload.message || "",
        Boolean(payload.read),
        payload.dedupeKey || null,
        safeDate(payload.createdAt),
      ]
    );
    return result.rows[0];
  },

  async upsertMood(payload: any) {
    const id = payload.id || randomUUID();
    const safeDate = (v: any) => (v && typeof v === "string" && v.trim() !== "" ? v : null);
    const scoreMap: Record<string, number> = { Great: 5, Good: 4, Normal: 3, Low: 2, Bad: 1 };
    const score = typeof payload.score === "number" ? payload.score : (scoreMap[payload.mood] || 3);
    const result = await pool.query(
      `
      INSERT INTO "mood" ("id", "mood", "score", "note", "loggedAt", "updatedAt")
      VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()), NOW())
      ON CONFLICT ("id") DO UPDATE SET
        "mood" = EXCLUDED."mood",
        "score" = EXCLUDED."score",
        "note" = EXCLUDED."note",
        "updatedAt" = NOW()
      RETURNING *
      `,
      [
        id,
        payload.mood || "Normal",
        score,
        payload.note || null,
        safeDate(payload.loggedAt) || safeDate(payload.createdAt),
      ]
    );
    return result.rows[0];
  },

  async deleteEntity(table: string, id: string) {
    const validTables = new Set(["task", "habit", "goal", "expense", "diaryEntry", "notification", "mood"]);
    if (!validTables.has(table)) return;

    await pool.query(`CREATE TABLE IF NOT EXISTS "deleted_records" ("id" TEXT PRIMARY KEY, "entity" TEXT NOT NULL, "entityId" TEXT NOT NULL, "deletedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);

    const entity = table === "diaryEntry" ? "diary" : table;
    await pool.query(`DELETE FROM "${table}" WHERE "id" = $1`, [id]);
    await pool.query(
      `INSERT INTO "deleted_records" ("id", "entity", "entityId", "deletedAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT ("id") DO UPDATE SET "deletedAt" = NOW()`,
      [`del-${entity}-${id}`, entity, id]
    );
  },

  async getChangesSince(cursorTime?: string) {
    let since = "1970-01-01T00:00:00.000Z";
    if (cursorTime && !isNaN(new Date(cursorTime).getTime())) {
      const cursorMs = new Date(cursorTime).getTime();
      since = new Date(Math.max(0, cursorMs - 5000)).toISOString();
    }

    await pool.query(`CREATE TABLE IF NOT EXISTS "deleted_records" ("id" TEXT PRIMARY KEY, "entity" TEXT NOT NULL, "entityId" TEXT NOT NULL, "deletedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);

    const tasks = await pool.query(`SELECT *, to_char("date" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as "dateStr", 'task' as entity FROM "task" WHERE "updatedAt" > $1`, [since]);
    const habits = await pool.query(`SELECT *, 'habit' as entity FROM "habit" WHERE "updatedAt" > $1`, [since]);
    const goals = await pool.query(`SELECT *, 'goal' as entity FROM "goal" WHERE "updatedAt" > $1`, [since]);
    const expenses = await pool.query(`SELECT *, 'expense' as entity FROM "expense" WHERE "updatedAt" > $1`, [since]);
    const diary = await pool.query(`SELECT *, 'diary' as entity FROM "diaryEntry" WHERE "updatedAt" > $1`, [since]);
    const notifications = await pool.query(`SELECT *, 'notification' as entity FROM "notification" WHERE "createdAt" > $1`, [since]);
    const moods = await pool.query(`SELECT *, 'mood' as entity FROM "mood" WHERE "updatedAt" > $1`, [since]);
    const deleted = await pool.query(`SELECT * FROM "deleted_records" WHERE "deletedAt" > $1`, [since]);

    const changes = [
      ...tasks.rows.map(r => {
        if (r.dateStr) { r.date = r.dateStr; delete r.dateStr; }
        return { entity: "task", entityId: r.id, operation: "update", data: r, updatedAt: r.updatedAt, version: 1 };
      }),
      ...habits.rows.map(r => ({ entity: "habit", entityId: r.id, operation: "update", data: r, updatedAt: r.updatedAt, version: 1 })),
      ...goals.rows.map(r => ({ entity: "goal", entityId: r.id, operation: "update", data: r, updatedAt: r.updatedAt, version: 1 })),
      ...expenses.rows.map(r => ({ entity: "expense", entityId: r.id, operation: "update", data: r, updatedAt: r.updatedAt, version: 1 })),
      ...diary.rows.map(r => ({ entity: "diary", entityId: r.id, operation: "update", data: r, updatedAt: r.updatedAt, version: 1 })),
      ...notifications.rows.map(r => ({ entity: "notification", entityId: r.id, operation: "update", data: r, updatedAt: r.createdAt, version: 1 })),
      ...moods.rows.map(r => ({ entity: "mood", entityId: r.id, operation: "update", data: r, updatedAt: r.updatedAt, version: 1 })),
      ...deleted.rows.map(r => ({ entity: r.entity, entityId: r.entityId, operation: "delete", data: null, updatedAt: r.deletedAt, version: 1 })),
    ];

    return changes;
  },

  async countHabits() {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM "habit"`);
    return result.rows[0]?.count ?? 0;
  },
};

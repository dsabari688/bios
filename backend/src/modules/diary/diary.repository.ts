import { randomUUID } from "node:crypto";
import { pool } from "../../db/postgres.js";
import type {
  CreateDiaryEntryInput,
  UpdateDiaryEntryInput,
} from "./diary.types.js";

interface DiaryEntryRow {
  id: string;
  date: string;
  timestamp: Date;
  content: string;
  review: string;
  mood: string;
  productivityScore: number | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiaryEntryDto {
  id: string;
  date: string;
  timestamp: string;
  content: string;
  review: string;
  mood: string;
  productivityScore: number;
  createdAt: string;
  updatedAt: string;
}

// "date" is a DATE column; to_char guarantees an exact YYYY-MM-DD string
// regardless of server timezone so calendar dates never shift in transit.
const SELECT_COLUMNS = `
  "id",
  to_char("date", 'YYYY-MM-DD') AS "date",
  "timestamp",
  "content",
  "review",
  "mood",
  "productivityScore",
  "createdAt",
  "updatedAt"
`;

function mapRow(row: DiaryEntryRow): DiaryEntryDto {
  return {
    id: row.id,
    date: row.date,
    timestamp: new Date(row.timestamp).toISOString(),
    content: row.content,
    review: row.review,
    mood: row.mood,
    productivityScore: Number(row.productivityScore),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export const diaryRepository = {
  async upsertByDate(
    input: CreateDiaryEntryInput,
  ): Promise<DiaryEntryDto & { inserted: boolean }> {
    const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();

    const result = await pool.query(
      `
      INSERT INTO "diaryEntry"
      (
        "id",
        "date",
        "timestamp",
        "content",
        "review",
        "mood",
        "productivityScore",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT ("date") DO UPDATE SET
        "timestamp" = EXCLUDED."timestamp",
        "content" = EXCLUDED."content",
        "review" = EXCLUDED."review",
        "mood" = EXCLUDED."mood",
        "productivityScore" = EXCLUDED."productivityScore",
        "updatedAt" = EXCLUDED."updatedAt"
      RETURNING
        ${SELECT_COLUMNS},
        (xmax = 0) AS "inserted"
      `,
      [
        randomUUID(),
        input.date,
        timestamp,
        input.content,
        input.review,
        input.mood,
        input.productivityScore,
        new Date(),
      ],
    );

    const { inserted, ...row } = result.rows[0];

    return {
      ...mapRow(row as DiaryEntryRow),
      inserted: Boolean(inserted),
    };
  },

  async findAll(): Promise<DiaryEntryDto[]> {
    const result = await pool.query(`
      SELECT ${SELECT_COLUMNS}
      FROM "diaryEntry"
      ORDER BY
        "date" DESC,
        "createdAt" DESC
    `);

    return result.rows.map(mapRow);
  },

  async findById(id: string): Promise<DiaryEntryDto | null> {
    const result = await pool.query(
      `
      SELECT ${SELECT_COLUMNS}
      FROM "diaryEntry"
      WHERE "id" = $1
      `,
      [id],
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  async update(
    id: string,
    input: UpdateDiaryEntryInput,
  ): Promise<DiaryEntryDto | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.timestamp !== undefined) {
      fields.push(`"timestamp" = $${values.length + 1}`);
      values.push(new Date(input.timestamp));
    }

    if (input.content !== undefined) {
      fields.push(`"content" = $${values.length + 1}`);
      values.push(input.content);
    }

    if (input.review !== undefined) {
      fields.push(`"review" = $${values.length + 1}`);
      values.push(input.review);
    }

    if (input.mood !== undefined) {
      fields.push(`"mood" = $${values.length + 1}`);
      values.push(input.mood);
    }

    if (input.productivityScore !== undefined) {
      fields.push(`"productivityScore" = $${values.length + 1}`);
      values.push(input.productivityScore);
    }

    fields.push(`"updatedAt" = $${values.length + 1}`);
    values.push(new Date());

    values.push(id);

    const result = await pool.query(
      `
      UPDATE "diaryEntry"
      SET ${fields.join(", ")}
      WHERE "id" = $${values.length}
      RETURNING ${SELECT_COLUMNS}
      `,
      values,
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  async delete(id: string) {
    await pool.query(`CREATE TABLE IF NOT EXISTS "deleted_records" ("id" TEXT PRIMARY KEY, "entity" TEXT NOT NULL, "entityId" TEXT NOT NULL, "deletedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(
      `INSERT INTO "deleted_records" ("id", "entity", "entityId", "deletedAt")
       VALUES ($1, 'diary', $2, NOW())
       ON CONFLICT ("id") DO UPDATE SET "deletedAt" = NOW()`,
      [`del-diary-${id}`, id]
    );

    const result = await pool.query(
      `
      DELETE FROM "diaryEntry"
      WHERE "id" = $1
      RETURNING "id"
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },
};

import { pool } from "../db/postgres.js";

let tablesReady: Promise<void> | null = null;

async function createTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS piggy_memory (
      id TEXT PRIMARY KEY,
      fact TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'preference',
      importance INT NOT NULL DEFAULT 5,
      status TEXT NOT NULL DEFAULT 'active',
      superseded_by TEXT,
      confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
      valid_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    ALTER TABLE piggy_memory ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE piggy_memory ADD COLUMN IF NOT EXISTS superseded_by TEXT;
    ALTER TABLE piggy_memory ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0;
    ALTER TABLE piggy_memory ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE piggy_memory ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS piggy_suggestion_feedback (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      habit_id TEXT,
      baseline_rate_before DOUBLE PRECISION NOT NULL DEFAULT 0,
      target_metric_after DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS piggy_reflection (
      date TEXT PRIMARY KEY,
      timestamp BIGINT NOT NULL,
      completed_habits_count INT NOT NULL,
      total_habits_count INT NOT NULL,
      mood TEXT NOT NULL,
      focus_minutes INT NOT NULL DEFAULT 0,
      reflection_text TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS piggy_conversation_message (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      intent TEXT,
      confidence DOUBLE PRECISION,
      action_type TEXT,
      action_executed BOOLEAN,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS piggy_conv_msg_conv_idx
     ON piggy_conversation_message (conversation_id, created_at)`,
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS piggy_focus_log (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      minutes INT NOT NULL,
      score INT,
      hour_of_day INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS piggy_pending_action (
      conversation_id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      candidates JSONB NOT NULL,
      missing_args JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export function ensurePiggyTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = createTables().catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  return tablesReady;
}

export function newUuid(): string {
  return crypto.randomUUID();
}

export const piggyStore = {
  async all<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    await ensurePiggyTables();
    const result = await pool.query(sql, params);
    return result.rows as T[];
  },

  async run(sql: string, params: unknown[] = []): Promise<void> {
    await ensurePiggyTables();
    await pool.query(sql, params);
  },

  newId: newUuid,
};

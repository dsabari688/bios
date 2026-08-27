import { pool } from "../../db/postgres.js";
import type { SystemConfigData } from "./system-config.types.js";

let tableEnsured = false;

async function ensureTable() {
  if (tableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  tableEnsured = true;
}

export const systemConfigRepository = {
  async getConfig(): Promise<SystemConfigData | null> {
    await ensureTable();
    const result = await pool.query(
      `SELECT "config" FROM "system_config" WHERE "id" = $1`,
      ["default"],
    );
    return result.rows[0]?.config
      ? (result.rows[0].config as SystemConfigData)
      : null;
  },

  async upsertConfig(config: SystemConfigData) {
    await ensureTable();
    await pool.query(
      `
      INSERT INTO "system_config" ("id", "config", "updated_at")
      VALUES ($1, $2, now())
      ON CONFLICT ("id")
      DO UPDATE SET "config" = $2, "updated_at" = now()
      `,
      ["default", JSON.stringify(config)],
    );
  },
};

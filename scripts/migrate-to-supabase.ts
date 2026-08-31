/**
 * migrate-to-supabase.ts
 *
 * Safe data export & migration tool for LifeOS.
 * Step 1: Connects to local PostgreSQL database and creates a full JSON backup in scripts/backups/
 * Step 2: Reads target Supabase database URL (from process.env.SUPABASE_DATABASE_URL or process.env.DATABASE_URL)
 * Step 3: Safely upserts all records into the target database preserving IDs, foreign keys, timestamps, and schemas.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-supabase.ts
 */

import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import pg from "pg";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL || "postgresql://postgres:120071@localhost:5432/lifeos";
const TARGET_DB_URL = process.env.SUPABASE_DATABASE_URL || process.env.TARGET_DATABASE_URL;

const TABLES = [
  "user",
  "post",
  "task",
  "mood",
  "goal",
  "habit",
  "expense",
  "budget_allowance",
  "diaryEntry",
  "notification",
  "system_config",
];

async function backupLocalData() {
  console.log("\n📦 STEP 1: Creating backup of local database records...");
  const client = new pg.Client({ connectionString: LOCAL_DB_URL });

  try {
    await client.connect();
    console.log("  Connected to local database.");

    const backupDir = path.resolve(process.cwd(), "scripts/backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir, `lifeos-backup-${timestamp}.json`);
    const backupData: Record<string, any[]> = {};

    for (const table of TABLES) {
      try {
        const res = await client.query(`SELECT * FROM "${table}"`);
        backupData[table] = res.rows;
        console.log(`  - Exported ${res.rows.length} rows from table "${table}"`);
      } catch (err: any) {
        console.warn(`  ⚠️ Could not read table "${table}":`, err?.message || String(err));
        backupData[table] = [];
      }
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`\n  ✅ Backup successfully saved to:\n     ${backupFile}`);
    return { backupFile, backupData };
  } catch (err) {
    console.error("❌ Failed to connect to local database for backup:", err);
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

async function migrateToTarget(backupData: Record<string, any[]>) {
  if (!TARGET_DB_URL) {
    console.log("\n⚠️ STEP 2 SKIPPED: No target Supabase connection string found.");
    console.log("   To perform live migration to Supabase, set SUPABASE_DATABASE_URL in backend/.env");
    console.log("   Example:\n   SUPABASE_DATABASE_URL=\"postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres\"");
    return;
  }

  console.log("\n🚀 STEP 2: Migrating records to target database...");
  const targetClient = new pg.Client({ connectionString: TARGET_DB_URL, ssl: { rejectUnauthorized: false } });

  try {
    await targetClient.connect();
    console.log("  Connected to target database.");

    for (const table of TABLES) {
      const rows = backupData[table] || [];
      if (rows.length === 0) continue;

      console.log(`  Migrating ${rows.length} records into table "${table}"...`);

      for (const row of rows) {
        const keys = Object.keys(row);
        const cols = keys.map((k) => `"${k}"`).join(", ");
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
        const values = keys.map((k) => row[k]);

        const primaryKey = table === "user" || table === "post" ? "id" : "id";

        const updateAssignments = keys
          .filter((k) => k !== primaryKey)
          .map((k) => `"${k}" = EXCLUDED."${k}"`)
          .join(", ");

        const query = `
          INSERT INTO "${table}" (${cols})
          VALUES (${placeholders})
          ON CONFLICT ("${primaryKey}") DO ${updateAssignments ? `UPDATE SET ${updateAssignments}` : "NOTHING"}
        `;

        await targetClient.query(query, values);
      }
      console.log(`  ✅ ${rows.length} records upserted into "${table}".`);
    }

    console.log("\n🎉 Migration to Supabase database completed successfully!");
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await targetClient.end().catch(() => {});
  }
}

async function main() {
  console.log("=================================================");
  console.log("  LifeOS Safe Database Migration to Supabase");
  console.log("=================================================");

  const { backupData } = await backupLocalData();
  await migrateToTarget(backupData);
}

main().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});

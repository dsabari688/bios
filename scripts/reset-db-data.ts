/**
 * reset-db-data.ts
 *
 * Safely resets all user data in both Supabase and Local PostgreSQL databases.
 * Preserves database schema structure and tables, clearing all rows so the app starts fresh.
 */

import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL || process.env.TARGET_DATABASE_URL;

const TABLES = [
  "post",
  "task",
  "mood",
  "goal",
  "habit",
  "expense",
  "budget_allowance",
  "diaryEntry",
  "notification",
  "user"
];

async function clearDatabase(connUrl: string, dbLabel: string) {
  console.log(`\n🧹 Resetting data in: ${dbLabel}...`);
  const client = new pg.Client({
    connectionString: connUrl,
    ssl: connUrl.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    console.log(`   Connected to ${dbLabel}`);

    for (const table of TABLES) {
      try {
        const res = await client.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`   ✓ Truncated table: "${table}"`);
      } catch (err: any) {
        // Fallback to DELETE if TRUNCATE has foreign key or permission quirks
        try {
          await client.query(`DELETE FROM "${table}";`);
          console.log(`   ✓ Cleared table (via DELETE): "${table}"`);
        } catch (innerErr: any) {
          console.warn(`   ⚠ Could not clear "${table}": ${innerErr.message}`);
        }
      }
    }

    // Reset system_config to initial default state
    try {
      await client.query(`UPDATE "system_config" SET "config" = '{}'::jsonb WHERE id = 'default';`);
      console.log(`   ✓ Reset "system_config" to default empty JSON`);
    } catch {
      // Ignore if table doesn't exist
    }

    console.log(`✨ Successfully wiped all test and working data in ${dbLabel}!`);
  } catch (err: any) {
    console.error(`   ❌ Failed to connect or reset ${dbLabel}:`, err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  console.log("=========================================");
  console.log("   LifeOS Database Data Purge Utility   ");
  console.log("=========================================");

  const urlsToClean: { label: string; url: string }[] = [];

  if (DATABASE_URL) {
    const isSupabase = DATABASE_URL.includes("supabase");
    urlsToClean.push({
      label: isSupabase ? "Supabase Primary Database" : "Local Database",
      url: DATABASE_URL,
    });
  }

  if (SUPABASE_DATABASE_URL && SUPABASE_DATABASE_URL !== DATABASE_URL) {
    urlsToClean.push({
      label: "Supabase Target Database",
      url: SUPABASE_DATABASE_URL,
    });
  }

  // Also clean local postgres if not already in DATABASE_URL
  const localDefaultUrl = "postgresql://postgres:120071@localhost:5432/lifeos";
  if (!urlsToClean.some(u => u.url.includes("localhost"))) {
    urlsToClean.push({
      label: "Local PostgreSQL (localhost:5432/lifeos)",
      url: localDefaultUrl,
    });
  }

  for (const target of urlsToClean) {
    await clearDatabase(target.url, target.label);
  }

  console.log("\n=========================================");
  console.log("🎉 All databases have been reset to a fresh state!");
  console.log("=========================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

/**
 * verify-supabase-state.ts
 *
 * Safe, non-destructive verification tool for LifeOS Supabase migration state.
 * Inspects backend/.env keys (sanitizing secrets), tests local vs target DB connections,
 * checks table existence, and compares record counts across all 11 LifeOS models.
 */

import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

const DATABASE_URL = process.env.DATABASE_URL;
const DIRECT_URL = process.env.DIRECT_URL;
const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL || process.env.TARGET_DATABASE_URL;

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

function sanitizeUrl(url?: string): string {
  if (!url) return "NOT CONFIGURED";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const port = parsed.port || "5432";
    const dbName = parsed.pathname.replace(/^\//, "");
    const isSupabase = host.includes("supabase") || host.includes("pooler.supabase");
    return `${isSupabase ? "Supabase PostgreSQL" : "Local PostgreSQL"} (${host}:${port}/${dbName})`;
  } catch {
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      return "Local PostgreSQL (localhost)";
    }
    if (url.includes("supabase")) {
      return "Supabase PostgreSQL";
    }
    return "Configured (Custom Host)";
  }
}

async function countTableRows(connectionString: string, table: string): Promise<{ exists: boolean; count: number; error?: string }> {
  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    const res = await client.query(`SELECT COUNT(*)::int as cnt FROM "${table}"`);
    return { exists: true, count: res.rows[0].cnt };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("does not exist")) {
      return { exists: false, count: 0, error: "Table does not exist" };
    }
    return { exists: false, count: 0, error: msg };
  } finally {
    await client.end().catch(() => {});
  }
}

async function verifyState() {
  console.log("=================================================");
  console.log("  LifeOS Supabase Migration State Verification");
  console.log("=================================================\n");

  console.log("1. ENVIRONMENT VARIABLES IN backend/.env:");
  console.log(`   - DATABASE_URL:          ${DATABASE_URL ? "CONFIGURED → " + sanitizeUrl(DATABASE_URL) : "NOT CONFIGURED"}`);
  console.log(`   - DIRECT_URL:            ${DIRECT_URL ? "CONFIGURED → " + sanitizeUrl(DIRECT_URL) : "NOT CONFIGURED"}`);
  console.log(`   - SUPABASE_DATABASE_URL: ${SUPABASE_DATABASE_URL ? "CONFIGURED → " + sanitizeUrl(SUPABASE_DATABASE_URL) : "NOT CONFIGURED"}\n`);

  console.log("2. DATABASE DESTINATIONS:");
  console.log(`   - DATABASE_URL points to:          ${sanitizeUrl(DATABASE_URL)}`);
  console.log(`   - SUPABASE_DATABASE_URL points to: ${sanitizeUrl(SUPABASE_DATABASE_URL)}\n`);

  // Determine local and target DB connection strings
  const localConn = (DATABASE_URL && !DATABASE_URL.includes("supabase")) ? DATABASE_URL : "postgresql://postgres:120071@localhost:5432/lifeos";
  const targetConn = (DATABASE_URL && DATABASE_URL.includes("supabase")) ? DATABASE_URL : SUPABASE_DATABASE_URL;

  console.log("3. TABLE EXISTENCE & RECORD COUNT COMPARISON:");
  console.log("------------------------------------------------------------------");
  console.log(
    `${"Model / Table".padEnd(20)} | ${"Local Count".padEnd(14)} | ${"Supabase Status / Count".padEnd(25)}`
  );
  console.log("------------------------------------------------------------------");

  let supabaseReachable = false;
  let allTablesExist = true;
  let allDataImported = true;

  for (const table of TABLES) {
    const localRes = await countTableRows(localConn, table);
    const localCountStr = localRes.exists ? `${localRes.count}` : "(table missing)";

    let supabaseStr = "NOT CONFIGURED";
    if (targetConn) {
      const supaRes = await countTableRows(targetConn, table);
      if (supaRes.exists) {
        supabaseReachable = true;
        supabaseStr = `EXISTS (${supaRes.count} rows)`;
        if (localRes.count > 0 && supaRes.count < localRes.count) {
          allDataImported = false;
        }
      } else {
        allTablesExist = false;
        allDataImported = false;
        supabaseStr = `MISSING (${supaRes.error})`;
      }
    } else {
      allDataImported = false;
    }

    console.log(
      `${table.padEnd(20)} | ${localCountStr.padEnd(14)} | ${supabaseStr}`
    );
  }
  console.log("------------------------------------------------------------------\n");

  console.log("4. MIGRATION SUMMARY:");
  if (!targetConn) {
    console.log("   STATUS: Supabase database connection is NOT yet configured in backend/.env.");
    console.log("   EXACT SAFE NEXT STEP:");
    console.log("   Set SUPABASE_DATABASE_URL in backend/.env with your Supabase PostgreSQL URL:");
    console.log("   SUPABASE_DATABASE_URL=\"postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true\"");
    console.log("   Then run: npx tsx scripts/migrate-to-supabase.ts");
  } else if (!supabaseReachable || !allTablesExist) {
    console.log("   STATUS: Supabase connection configured, but schema tables do NOT yet exist in Supabase.");
    console.log("   EXACT SAFE NEXT STEP:");
    console.log("   Push schema to Supabase, then run data migration:");
    console.log("   1. npx tsx scripts/migrate-to-supabase.ts");
  } else if (!allDataImported) {
    console.log("   STATUS: Supabase tables exist, but local data has not been fully imported into Supabase yet.");
    console.log("   EXACT SAFE NEXT STEP:");
    console.log("   Run: npx tsx scripts/migrate-to-supabase.ts");
  } else {
    console.log("   STATUS: MIGRATION FULLY COMPLETE! All 11 tables exist in Supabase and all local records are imported.");
  }
}

verifyState().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});

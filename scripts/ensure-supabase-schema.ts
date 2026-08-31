/**
 * ensure-supabase-schema.ts
 *
 * Ensures all 11 LifeOS tables matching contract.prisma exist in Supabase PostgreSQL database.
 */

import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

const TARGET_DB_URL = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "user" (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "username" TEXT
);

CREATE TABLE IF NOT EXISTS "post" (
  "id" SERIAL PRIMARY KEY,
  "authorId" INT NOT NULL REFERENCES "user"("id"),
  "content" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "title" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "task" (
  "id" TEXT PRIMARY KEY,
  "category" TEXT NOT NULL DEFAULT 'important-not-urgent',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "date" TIMESTAMPTZ NOT NULL,
  "description" TEXT,
  "endTime" TIMESTAMPTZ,
  "rescheduledCount" INT NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "title" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "task_date_idx" ON "task"("date");
CREATE INDEX IF NOT EXISTS "task_status_idx" ON "task"("status");

CREATE TABLE IF NOT EXISTS "mood" (
  "id" TEXT PRIMARY KEY,
  "mood" TEXT NOT NULL,
  "score" INT NOT NULL,
  "note" TEXT,
  "loggedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "mood_loggedAt_idx" ON "mood"("loggedAt");

CREATE TABLE IF NOT EXISTS "goal" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "targetDate" TIMESTAMPTZ,
  "progress" INT NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "goal_status_idx" ON "goal"("status");
CREATE INDEX IF NOT EXISTS "goal_target_date_idx" ON "goal"("targetDate");

CREATE TABLE IF NOT EXISTS "habit" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "frequency" TEXT NOT NULL DEFAULT 'daily',
  "streak" INT NOT NULL DEFAULT 0,
  "logs" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "skippedDaysCount" INT NOT NULL DEFAULT 0,
  "icon" TEXT,
  "category" TEXT NOT NULL DEFAULT 'general',
  "targetValue" DOUBLE PRECISION,
  "unit" TEXT,
  "stepIncrement" DOUBLE PRECISION,
  "dailyProgress" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "habit_name_idx" ON "habit"("name");
CREATE INDEX IF NOT EXISTS "habit_frequency_idx" ON "habit"("frequency");

CREATE TABLE IF NOT EXISTS "expense" (
  "id" TEXT PRIMARY KEY,
  "amount" NUMERIC NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "transactionDate" TIMESTAMPTZ NOT NULL,
  "paymentMethod" TEXT,
  "isImpulsive" BOOLEAN NOT NULL DEFAULT FALSE,
  "explanation" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "expense_transactionDate_idx" ON "expense"("transactionDate");

CREATE TABLE IF NOT EXISTS "budget_allowance" (
  "id" TEXT PRIMARY KEY,
  "category" TEXT NOT NULL,
  "limitAmount" NUMERIC NOT NULL,
  "period" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "diaryEntry" (
  "id" TEXT PRIMARY KEY,
  "date" DATE UNIQUE NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "content" TEXT NOT NULL,
  "review" TEXT NOT NULL DEFAULT '',
  "mood" TEXT NOT NULL,
  "productivityScore" INT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "notification" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL DEFAULT 'system',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "dedupeKey" TEXT UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "notification_created_idx" ON "notification"("createdAt");
CREATE INDEX IF NOT EXISTS "notification_read_idx" ON "notification"("read");

CREATE TABLE IF NOT EXISTS "system_config" (
  "id" TEXT PRIMARY KEY DEFAULT 'default',
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function applySchema() {
  if (!TARGET_DB_URL) {
    console.error("❌ Target database URL not set.");
    process.exit(1);
  }

  console.log("Connecting to Supabase PostgreSQL database...");
  const client = new pg.Client({
    connectionString: TARGET_DB_URL,
    ssl: TARGET_DB_URL.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL!");
    console.log("Applying schema DDL for all 11 LifeOS tables...");
    await client.query(SCHEMA_SQL);
    console.log("✅ Schema DDL applied successfully to Supabase PostgreSQL!");
  } catch (err) {
    console.error("❌ Failed to apply schema DDL to Supabase:", err);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

applySchema();

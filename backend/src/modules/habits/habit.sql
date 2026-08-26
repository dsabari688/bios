CREATE TABLE IF NOT EXISTS "habit" (
  "id" UUID PRIMARY KEY,
  "name" TEXT NOT NULL,
  "frequency" TEXT NOT NULL DEFAULT 'daily',
  "streak" INTEGER NOT NULL DEFAULT 0,
  "logs" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "skippedDaysCount" INTEGER NOT NULL DEFAULT 0,
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

CREATE INDEX IF NOT EXISTS "habit_name_idx"
ON "habit" ("name");

CREATE INDEX IF NOT EXISTS "habit_frequency_idx"
ON "habit" ("frequency");

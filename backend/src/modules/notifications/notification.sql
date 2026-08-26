CREATE TABLE IF NOT EXISTS "notification" (
  "id" UUID PRIMARY KEY,
  "type" TEXT NOT NULL DEFAULT 'system',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "dedupeKey" TEXT UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "notification_created_idx"
ON "notification" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "notification_read_idx"
ON "notification" ("read");

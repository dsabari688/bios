require("dotenv").config();
const { Client } = require("pg");

const c = new Client({
  connectionString: process.env.DATABASE_URL
});

c.connect()
  .then(() => c.query(`
    CREATE TABLE IF NOT EXISTS "mood" (
      "id" text PRIMARY KEY,
      "mood" text NOT NULL,
      "score" integer NOT NULL,
      "note" text,
      "loggedAt" timestamptz NOT NULL DEFAULT now(),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS "mood_loggedAt_idx"
    ON "mood" ("loggedAt");
  `))
  .then(() => {
    console.log("MOOD TABLE CREATED");
    return c.end();
  })
  .catch(e => {
    console.error(e);
    c.end();
    process.exit(1);
  });

require("dotenv").config();
const { Client } = require("pg");

const c = new Client({
  connectionString: process.env.DATABASE_URL
});

c.connect()
  .then(() => c.query(`
    CREATE TABLE IF NOT EXISTS "diaryEntry" (
      "id" text PRIMARY KEY,
      "date" date NOT NULL,
      "timestamp" timestamptz NOT NULL DEFAULT now(),
      "content" text NOT NULL,
      "review" text NOT NULL DEFAULT '',
      "mood" text NOT NULL,
      "productivityScore" integer NOT NULL CHECK ("productivityScore" >= 0 AND "productivityScore" <= 100),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "diaryEntry_date_key"
    ON "diaryEntry" ("date");
  `))
  .then(() => {
    console.log("DIARY ENTRY TABLE CREATED");
    return c.end();
  })
  .catch(e => {
    console.error(e);
    c.end();
    process.exit(1);
  });

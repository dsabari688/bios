require("dotenv").config();
const { Client } = require("pg");

const c = new Client({
  connectionString: process.env.DATABASE_URL
});

c.connect()
  .then(() => c.query(`
    CREATE TABLE IF NOT EXISTS "expense" (
      "id" text PRIMARY KEY,
      "amount" numeric NOT NULL CHECK ("amount" > 0),
      "category" text NOT NULL,
      "description" text,
      "transactionDate" timestamptz NOT NULL,
      "paymentMethod" text,
      "isImpulsive" boolean NOT NULL DEFAULT false,
      "explanation" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS "expense_transactionDate_idx"
    ON "expense" ("transactionDate" DESC);

    CREATE TABLE IF NOT EXISTS "budget_allowance" (
      "id" text PRIMARY KEY,
      "category" text NOT NULL,
      "limitAmount" numeric NOT NULL CHECK ("limitAmount" > 0),
      "period" text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
  `))
  .then(() => {
    console.log("EXPENSE AND BUDGET_ALLOWANCE TABLES CREATED");
    return c.end();
  })
  .catch(e => {
    console.error(e);
    c.end();
    process.exit(1);
  });

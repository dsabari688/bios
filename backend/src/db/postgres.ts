import "dotenv/config";
import { Pool } from "pg";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:120071@localhost:5432/lifeos";
let dbPassword = "120071";
try {
  const parsed = new URL(dbUrl);
  if (parsed.password) {
    dbPassword = String(parsed.password);
  }
} catch (e) {
  // fallback
}

export const pool = new Pool({
  connectionString: dbUrl,
  password: dbPassword,
});


import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

import { pool } from "../backend/src/db/postgres.js";

async function inspectDb() {
  console.log("=== POSTGRES DB CURRENT TASKS ===");
  const res = await pool.query(`SELECT id, title, status, date, "updatedAt" FROM "task" ORDER BY "updatedAt" DESC LIMIT 20`);
  console.table(res.rows);
  await pool.end();
  process.exit(0);
}

inspectDb();

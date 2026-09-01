import "dotenv/config";
import dns from "node:dns";
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
import { Pool } from "pg";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:120071@localhost:5432/lifeos";
const isSupabase = dbUrl.includes("supabase.co");

export const pool = new Pool({
  connectionString: dbUrl,
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
});


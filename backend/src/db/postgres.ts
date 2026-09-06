import "dotenv/config";
import dns from "node:dns";
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
import { Pool } from "pg";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:120071@localhost:5432/lifeos";
const isRemote = !dbUrl.includes("localhost") && !dbUrl.includes("127.0.0.1");

export const pool = new Pool({
  connectionString: dbUrl,
  ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
});


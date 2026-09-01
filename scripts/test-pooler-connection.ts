import { Pool } from "pg";

async function testPooler(connectionString: string, label: string) {
  console.log(`\nTesting connection to: ${label}`);
  console.log(`URL: ${connectionString.replace(/:[^:@]+@/, ":****@")}`);
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000
  });

  try {
    const client = await pool.connect();
    const res = await client.query("SELECT COUNT(*)::int as count FROM task;");
    console.log(`✅ SUCCESS! Connected to ${label}. Tasks count in DB: ${res.rows[0].count}`);
    client.release();
    await pool.end();
    return true;
  } catch (err: any) {
    console.error(`❌ FAILED connection to ${label}:`, err.message);
    await pool.end();
    return false;
  }
}

async function run() {
  const password = "Sabari%40120071";
  const projectRef = "iwrygxtenneajsstbjyp";

  // Test Direct
  await testPooler(
    `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
    "Supabase Direct (db.iwrygxtenneajsstbjyp.supabase.co:5432)"
  );

  // Test Poolers in common regions
  const regions = ["ap-south-1", "us-east-1", "eu-central-1", "us-west-1", "ap-southeast-1"];
  for (const region of regions) {
    await testPooler(
      `postgresql://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`,
      `Supabase Pooler Port 6543 (${region})`
    );
    await testPooler(
      `postgresql://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
      `Supabase Session Pooler Port 5432 (${region})`
    );
  }
}

run();

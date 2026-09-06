import { Pool } from "pg";

const regions = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
  "eu-central-1", "eu-central-2", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
  "sa-east-1", "ca-central-1", "me-central-1", "af-south-1"
];

async function check() {
  const password = "Sabari%40120071";
  const project = "iwrygxtenneajsstbjyp";

  for (const region of regions) {
    for (const prefix of ["aws-0", "aws-1"]) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      try {
        const pool = new Pool({
          connectionString: `postgresql://postgres.${project}:${password}@${host}:6543/postgres?pgbouncer=true`,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 2500
        });
        const client = await pool.connect();
        console.log(`\n🎉 FOUND POOLER! Host: ${host}`);
        client.release();
        await pool.end();
        process.exit(0);
      } catch (err) {
        if (!err.message.includes("ENOTFOUND") && !err.message.includes("tenant/user")) {
          console.log(`Region ${region} (${host}) returned: ${err.message}`);
        }
      }
    }
  }
  console.log("\nFinished checking all pooler regions.");
}

check();

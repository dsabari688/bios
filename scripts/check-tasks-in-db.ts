import { pool } from "../backend/src/db/postgres.js";

async function checkTasks() {
  try {
    const res = await pool.query(`SELECT id, title, date, "updatedAt" FROM "task" ORDER BY "updatedAt" DESC LIMIT 20;`);
    console.log(`\n=================================================`);
    console.log(` Total Tasks in Database: ${res.rows.length}`);
    console.log(`=================================================`);
    res.rows.forEach((t, i) => {
      console.log(`${i + 1}. [ID: ${t.id}] Title: "${t.title}" | Date: ${t.date} | UpdatedAt: ${t.updatedAt}`);
    });
  } catch (err: any) {
    console.error("DB Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkTasks();

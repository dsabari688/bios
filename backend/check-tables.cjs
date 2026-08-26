require("dotenv").config();
const { Client } = require("pg");

const c = new Client({
  connectionString: process.env.DATABASE_URL
});

c.connect()
  .then(() => c.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `))
  .then(r => {
    console.table(r.rows);
    return c.end();
  })
  .catch(e => {
    console.error(e.message);
    c.end();
  });

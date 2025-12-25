// Query core table counts directly using minimal pg connection (no project side-effects)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
(async () => {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('DATABASE_URL not set in server/.env');
    process.exit(2);
  }
  const pool = new Pool({ connectionString: conn });
  try {
    await pool.query('SELECT 1');
  } catch (e) {
    console.error('Failed to connect to Postgres:', e.message || e);
    await pool.end().catch(()=>{});
    process.exit(3);
  }

  try {
    const tables = ['users','organizations','classes','teachers','student_enrollments','parent_student_links'];
    for (const t of tables) {
      try {
        const r = await pool.query(`SELECT COUNT(*) AS c FROM ${t}`);
        console.log(`${t}: ${r.rows[0].c}`);
      } catch (e) {
        console.log(`${t}: ERROR (${e.code || e.message})`);
      }
    }
  } finally {
    await pool.end();
  }
})();
require('dotenv').config();
const { Pool } = require('pg');

(async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query("SELECT * FROM users WHERE email = 'maneeth1302rao@gmail.com'");
        console.log('Local Postgres User:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
})();

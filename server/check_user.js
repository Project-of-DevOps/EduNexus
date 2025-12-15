
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const email = 'maneeth1302rao@gmail.com';
        const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        console.log(`User ${email} found:`, res.rows.length > 0);
        if (res.rows.length > 0) {
            console.log(res.rows[0]);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        pool.end();
    }
}

check();


require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query('SELECT gen_random_uuid() as uuid');
        console.log('UUID generated:', res.rows[0].uuid);
    } catch (e) {
        console.error('Error with gen_random_uuid:', e.message);
    } finally {
        pool.end();
    }
}

check();

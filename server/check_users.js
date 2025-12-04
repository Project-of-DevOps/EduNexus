
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkUsers() {
    try {
        const res = await pool.query('SELECT id, name, email, role FROM users');
        console.log('Existing Users:', res.rows);
    } catch (err) {
        console.error('Error querying users:', err);
    } finally {
        await pool.end();
    }
}

checkUsers();

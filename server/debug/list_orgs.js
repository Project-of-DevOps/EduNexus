const { Pool } = require('pg');
require('dotenv').config({ path: 'd:\\Nexus\\server\\.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function listOrgs() {
    try {
        const res = await pool.query('SELECT name, code FROM organizations');
        console.log('Organizations:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listOrgs();

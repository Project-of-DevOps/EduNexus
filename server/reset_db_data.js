
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function resetData() {
    try {
        const client = await pool.connect();
        console.log('Connected. Clearing data...');

        // Truncate tables but keep schema
        await client.query('TRUNCATE TABLE users, organizations, signup_queue CASCADE');

        console.log('✅ Data cleared successfully.');
        client.release();
    } catch (err) {
        console.error('❌ Error clearing data:', err);
    } finally {
        await pool.end();
    }
}

resetData();

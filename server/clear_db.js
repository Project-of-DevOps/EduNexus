
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function clearDb() {
    try {
        console.log('Clearing database...');
        // Truncate tables in order of dependency (or use CASCADE)
        await pool.query(`
      TRUNCATE TABLE 
        users, 
        org_code_requests, 
        departments, 
        classes,
        signup_syncs,
        signup_queue,
        password_resets,
        email_verifications
      RESTART IDENTITY CASCADE;
    `);
        console.log('Database cleared successfully.');
    } catch (err) {
        console.error('Error clearing database:', err);
    } finally {
        await pool.end();
    }
}

clearDb();

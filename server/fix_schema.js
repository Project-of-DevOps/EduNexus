
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixSchema() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', '005_python_auth_basics.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Applying 005_python_auth_basics.sql manually...');
        await pool.query(sql);
        console.log('✅ Schema applied.');
    } catch (e) {
        console.error('❌ Schema apply failed:', e);
    } finally {
        pool.end();
    }
}

fixSchema();

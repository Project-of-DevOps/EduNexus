
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
        console.log('Columns in users table:');
        res.rows.forEach(r => console.log(` - ${r.column_name}: Nullable=${r.is_nullable}, Default=${r.column_default}`));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        pool.end();
    }
}

check();

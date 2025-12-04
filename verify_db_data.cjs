try {
    require('dotenv').config();
} catch (e) {
    try {
        require('./server/node_modules/dotenv').config();
    } catch (e2) {
        console.error('Could not load dotenv. Please ensure dependencies are installed.');
    }
}
const { Pool } = require('pg');

const host = process.env.PGHOST || 'localhost';
const port = process.env.PGPORT || '5432';
const database = process.env.PGDATABASE || process.env.DB_NAME || 'edunexus_db';
const user = process.env.PGUSER || 'postgres';
const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'root123';

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION || `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

const pool = new Pool({
    connectionString,
});

async function verifyData() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected successfully.');

        console.log('\n--- Departments ---');
        const depts = await client.query('SELECT * FROM departments');
        if (depts.rows.length === 0) {
            console.log('No departments found.');
        } else {
            console.table(depts.rows);
        }

        console.log('\n--- Classes ---');
        const classes = await client.query('SELECT * FROM classes');
        if (classes.rows.length === 0) {
            console.log('No classes found.');
        } else {
            console.table(classes.rows);
        }

        client.release();
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await pool.end();
    }
}

verifyData();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    // ssl: { rejectUnauthorized: false } 
});

async function applyMigration() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const migrationPath = path.join(__dirname, 'migrations', '004_secure_tables.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration: 004_secure_tables.sql');
        await client.query(sql);

        console.log('Migration applied successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

applyMigration();

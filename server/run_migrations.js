const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { pool } = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations() {
    console.log('Starting migrations...');
    try {
        const files = fs.readdirSync(MIGRATIONS_DIR).sort();
        for (const file of files) {
            if (!file.endsWith('.sql')) continue;
            console.log(`Running ${file}...`);
            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
            try {
                await pool.query(sql);
            } catch (e) {
                console.error(`Error in ${file}:`, e.message);
                // Continue? strict mode: throw
                // throw e; 
            }
        }
        console.log('Migrations complete.');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();

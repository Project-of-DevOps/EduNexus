const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const migrationFile = path.join(__dirname, 'migrations', '006_fix_schema.sql');

async function run() {
    console.log('Applying migration:', migrationFile);

    // Config
    const config = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };

    let client = new Client(config);

    try {
        await client.connect();
    } catch (err) {
        if (err.message.includes('server does not support SSL')) {
            console.log('Retrying without SSL...');
            delete config.ssl;
            client = new Client(config);
            await client.connect();
        } else {
            throw err;
        }
    }

    try {
        const sql = fs.readFileSync(migrationFile, 'utf8');
        await client.query(sql);
        console.log('Migration 006 applied successfully!');
    } catch (err) {
        console.error('Migration 006 failed:', err.message);
    } finally {
        await client.end();
    }
}

run();

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const seedFile = path.join(__dirname, 'migrations', 'strict_seed.sql');

async function run() {
    console.log('Applying Seed:', seedFile);

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
        const sql = fs.readFileSync(seedFile, 'utf8');
        await client.query(sql);
        console.log('Seed applied successfully!');
    } catch (err) {
        console.error('Seed failed:', err.message);
    } finally {
        await client.end();
    }
}

run();

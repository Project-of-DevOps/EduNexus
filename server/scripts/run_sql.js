const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
// Load env from root directory (matching server/index.js logic)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });


async function createClient() {
    // Try with SSL first
    let client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database (SSL).');
        return client;
    } catch (err) {
        if (err.message.includes('server does not support SSL') || err.message.includes('The server does not support SSL connections')) {
            console.log('SSL connection failed, retrying without SSL...');
            client = new Client({
                connectionString: process.env.DATABASE_URL,
                // No SSL config
            });
            await client.connect();
            console.log('Connected to database (Non-SSL).');
            return client;
        } else {
            throw err;
        }
    }
}

async function runSqlFile(filename) {
    let client;
    try {
        client = await createClient();

        const filePath = path.join(__dirname, '..', 'migrations', filename);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const sql = fs.readFileSync(filePath, 'utf8');

        console.log(`Running SQL file: ${filename}`);
        await client.query(sql);

        console.log('SQL executed successfully!');
    } catch (err) {
        console.error('Execution failed:', err);
        process.exit(1);
    } finally {
        if (client) await client.end();
    }
}


const fileToRun = process.argv[2];
if (!fileToRun) {
    console.error('Please provide a SQL filename (e.g. master_rebuild.sql)');
    process.exit(1);
}

runSqlFile(fileToRun);

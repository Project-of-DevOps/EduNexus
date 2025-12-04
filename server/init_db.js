
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbName = 'edunexus_db';
// Connection string to 'postgres' db to create new db
const adminConnString = process.env.DATABASE_URL.replace(`/${dbName}`, '/postgres');

async function initDb() {
    console.log('Initializing database...');

    // 1. Create DB if not exists
    const client = new Client({ connectionString: adminConnString });
    try {
        await client.connect();
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        if (res.rows.length === 0) {
            console.log(`Database ${dbName} not found. Creating...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database ${dbName} created.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }
    } catch (err) {
        console.error('Error checking/creating database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }

    // 2. Run Migrations
    const dbClient = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await dbClient.connect();
        console.log('Connected to database. Running migrations...');

        const migrationsDir = path.join(__dirname, 'migrations');
        if (fs.existsSync(migrationsDir)) {
            const files = fs.readdirSync(migrationsDir).sort();
            for (const file of files) {
                if (file.endsWith('.sql')) {
                    console.log(`Running migration: ${file}`);
                    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                    await dbClient.query(sql);
                }
            }
        }
        console.log('Migrations completed.');
    } catch (err) {
        console.error('Error running migrations:', err);
    } finally {
        await dbClient.end();
    }
}

initDb();

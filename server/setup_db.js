
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_NAME = process.env.DB_NAME || 'edunexus_db';

async function setup() {
    console.log('Starting database setup...');

    // 1. Create DB if not exists
    const rootClient = new Client({
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'root123',
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT || 5432,
        database: 'postgres'
    });

    try {
        await rootClient.connect();
        const res = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`);
        if (res.rows.length === 0) {
            console.log(`Creating database ${DB_NAME}...`);
            await rootClient.query(`CREATE DATABASE ${DB_NAME}`);
        } else {
            console.log(`Database ${DB_NAME} already exists.`);
        }
    } catch (e) {
        console.error('Error checking/creating database:', e.message);
        process.exit(1);
    } finally {
        await rootClient.end();
    }

    // 2. Run Migrations
    const dbClient = new Client({
        connectionString: process.env.DATABASE_URL || `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'root123'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${DB_NAME}`
    });

    try {
        await dbClient.connect();
        console.log('Connected to database.');

        const migrationsDir = path.join(__dirname, 'migrations');
        if (fs.existsSync(migrationsDir)) {
            const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
            for (const file of files) {
                console.log(`Running migration: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                await dbClient.query(sql);
            }
        } else {
            console.log('No migrations directory found.');
        }

        console.log('Database setup complete.');
    } catch (e) {
        console.error('Error running migrations:', e);
    } finally {
        await dbClient.end();
    }
}

setup();

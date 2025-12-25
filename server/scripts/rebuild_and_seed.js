
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false // Disabled for local execution
});

async function run() {
    const schemaPath = path.join(__dirname, '..', 'migrations', '009_master_rebuild.sql');
    const seedPath = path.join(__dirname, '..', 'migrations', '010_seed_strict_simulation.sql');

    try {
        console.log('--- Connecting to DB ---');
        const client = await pool.connect();

        try {
            console.log('--- Dropping and Recreating Schema ---');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await client.query(schemaSql);
            console.log('Schema rebuilt successfully.');

            console.log('--- Seeding Strict Simulation Data ---');
            const seedSql = fs.readFileSync(seedPath, 'utf8');
            await client.query(seedSql);
            console.log('Seed data inserted successfully.');

            console.log('--- Verification Query ---');
            const res = await client.query('SELECT name, code FROM organizations');
            console.log('Organization Created:', res.rows);

            const profs = await client.query('SELECT full_name, role FROM profiles');
            console.log('Profiles Created:', profs.rowCount);

            const links = await client.query('SELECT * FROM parent_student_links');
            console.log('Parent-Student Links:', links.rowCount);

        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Migration Failed:', err);
        process.exit(1);
    } finally {
        pool.end();
    }
}

run();

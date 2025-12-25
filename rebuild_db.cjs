const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    // ssl: { rejectUnauthorized: false } // Uncomment if needed for some cloud dbs
});

async function rebuild() {
    try {
        console.log("🔌 Connecting to database...");
        await client.connect();

        // 1. Run Master Rebuild
        console.log("🏗️  Running master_rebuild.sql...");
        const masterSql = fs.readFileSync(path.join(__dirname, 'server/migrations/master_rebuild.sql'), 'utf8');
        await client.query(masterSql);
        console.log("✅ Schema rebuilt.");

        // 2. Run Grants (012)
        console.log("🔐 Running 012_grant_schema_usage.sql...");
        const grantsSql = fs.readFileSync(path.join(__dirname, 'server/migrations/012_grant_schema_usage.sql'), 'utf8');
        await client.query(grantsSql);
        console.log("✅ Schema Usage Granted.");

        // 3. Run Policies (011)
        console.log("🛡️  Running 011_security_and_policies.sql...");
        const policiesSql = fs.readFileSync(path.join(__dirname, 'server/migrations/011_security_and_policies.sql'), 'utf8');
        await client.query(policiesSql);
        console.log("✅ Policies Applied.");

        // 4. Run Seed
        console.log("🌱 Running 010_seed_strict_simulation.sql...");
        const seedSql = fs.readFileSync(path.join(__dirname, 'server/migrations/010_seed_strict_simulation.sql'), 'utf8');
        await client.query(seedSql);
        console.log("✅ Data seeded successfully.");

    } catch (err) {
        console.error("❌ Error rebuilding database:", err);
    } finally {
        await client.end();
    }
}

rebuild();

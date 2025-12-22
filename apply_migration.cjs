const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const loadEnv = () => {
    try {
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const lines = content.split(/\r?\n/); // Handle CR LF
            for (const line of lines) {
                const trimmed = line.trim();
                // Matches DATABASE_URL=... or DATABASE_URL = ...
                const match = trimmed.match(/^DATABASE_URL\s*=\s*(.*)$/);
                if (match) {
                    let val = match[1].trim();
                    // Remove quotes if present
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    return val;
                }
            }
        }
    } catch (e) {
        console.error('Error reading .env:', e);
    }
    return process.env.DATABASE_URL;
};

const run = async () => {
    const dbUrl = loadEnv();
    if (!dbUrl) {
        console.error('DATABASE_URL not found in .env');
        // Debug info
        try {
            const envPath = path.join(__dirname, '.env');
            if (fs.existsSync(envPath)) {
                console.log("Dumping .env content snippet (first 10 chars of lines starting with 'D'):");
                const content = fs.readFileSync(envPath, 'utf8');
                content.split(/\r?\n/).forEach(l => {
                    if (l.startsWith('D')) console.log(l.substring(0, 20) + "...");
                });
            }
        } catch (e) { }
        process.exit(1);
    }

    console.log('Connecting to DB...');
    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const sqlPath = path.join(__dirname, 'server', 'migrations', '011_add_is_verified_column.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log(`Reading SQL from ${sqlPath}`);
        console.log('Applying migration...');
        await pool.query(sql);
        console.log('Migration applied successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
};

run();

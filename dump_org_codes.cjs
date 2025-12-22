const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const loadEnv = () => {
    try {
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const lines = content.split(/\r?\n/);
            for (const line of lines) {
                const trimmed = line.trim();
                const match = trimmed.match(/^DATABASE_URL\s*=\s*(.*)$/);
                if (match) {
                    let val = match[1].trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    return val;
                }
            }
        }
    } catch (e) { }
    return process.env.DATABASE_URL;
};

const run = async () => {
    const dbUrl = loadEnv();
    if (!dbUrl) {
        console.error('DATABASE_URL not found');
        process.exit(1);
    }
    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
        const res = await pool.query('SELECT * FROM org_codes');
        console.log('Org Codes:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
};

run();

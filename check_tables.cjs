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

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Checking tables in public schema...');
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables found:', res.rows.map(r => r.table_name).join(', '));

        console.log('\nChecking columns in "user_dashboard_states":');
        const udsRes = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_dashboard_states'`);
        if (udsRes.rows.length === 0) console.log('Table "user_dashboard_states" NOT FOUND');
        else console.log(udsRes.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

        console.log('\nChecking columns in "user_settings":');
        const usRes = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_settings'`);
        if (usRes.rows.length === 0) console.log('Table "user_settings" NOT FOUND');
        else console.log(usRes.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

    } catch (e) {
        console.error('DB Check failed:', e);
    } finally {
        await pool.end();
    }
};

run();

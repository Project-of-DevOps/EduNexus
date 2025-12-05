require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

async function check() {
    const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    let authStatus = 'UNKNOWN';
    if (sbUrl && sbKey) {
        try {
            const supabase = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
            const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1 });
            if (!error && users) {
                authStatus = users.length > 0 ? 'YES' : 'NO';
            }
        } catch (e) {
            authStatus = 'ERROR';
        }
    } else {
        authStatus = 'UNKNOWN(NoKey)';
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    let dbStatus = 'UNKNOWN';
    try {
        const res = await pool.query('SELECT 1 FROM users LIMIT 1');
        dbStatus = res.rowCount > 0 ? 'YES' : 'NO';
    } catch (e) {
        dbStatus = 'ERROR';
    } finally {
        pool.end();
    }

    console.log(`AUTH:${authStatus} DB:${dbStatus}`);
}

check();

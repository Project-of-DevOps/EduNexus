const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
// Also load root .env if needed
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function check() {
    console.log('--- Checking Data Storage Locations ---');

    // 1. Check Local/Pool DB
    const dbUrl = process.env.DATABASE_URL;
    let poolCount = 'N/A';
    let poolHost = 'Unknown';

    if (dbUrl) {
        try {
            const url = new URL(dbUrl);
            poolHost = url.hostname;
            console.log(`DATABASE_URL Host: ${poolHost}`);

            const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
            try {
                const res = await pool.query('SELECT COUNT(*) FROM users');
                poolCount = res.rows[0].count;
                console.log(`[PG Pool] Users Count: ${poolCount}`);
            } catch (e) {
                console.log(`[PG Pool] Error: ${e.message}`);
            } finally {
                await pool.end();
            }
        } catch (e) {
            console.log(`[PG Pool] Invalid URL: ${e.message}`);
        }
    } else {
        console.log('[PG Pool] DATABASE_URL not set');
    }

    // 2. Check Supabase Client
    const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (sbUrl && sbKey) {
        console.log(`SUPABASE_URL Host: ${new URL(sbUrl).hostname}`);
        const supabase = createClient(sbUrl, sbKey);
        try {
            // Check 'users' table in public schema (if we are using public table for users)
            // Or check auth.users if we want to see auth accounts
            // Our logic uses public.users
            const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
            if (error) {
                console.log(`[Supabase Client] Error checking 'users' table: ${error.message}`);
                // Fallback: check if table exists or connection works
            } else {
                console.log(`[Supabase Client] Users table Count: ${count}`);
            }
        } catch (e) {
            console.log(`[Supabase Client] Exception: ${e.message}`);
        }
    } else {
        console.log('[Supabase Client] Credentials missing');
    }

    console.log('---------------------------------------');

    if (poolHost.includes('supabase')) {
        console.log('CONCLUSION: DATABASE_URL points to Supabase. Data SHOULD be there.');
    } else if (['localhost', '127.0.0.1'].includes(poolHost)) {
        console.log('CONCLUSION: DATABASE_URL points to Localhost. Data is NOT in Supabase cloud.');
    } else {
        console.log('CONCLUSION: DATABASE_URL points to a remote host (possibly Supabase or other).');
    }
}

check();

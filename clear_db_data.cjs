const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
try {
    require('dotenv').config();
} catch (e) {
    try {
        require('./server/node_modules/dotenv').config();
    } catch (e2) {
        console.error('Could not load dotenv. Please ensure dependencies are installed.');
    }
}

// Database connection configuration
const host = process.env.PGHOST || 'localhost';
const port = process.env.PGPORT || '5432';
const database = process.env.PGDATABASE || process.env.DB_NAME || 'edunexus_db';
const user = process.env.PGUSER || 'postgres';
const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'root123';

const connectionString = process.env.DATABASE_URL || `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

console.log('Using connection string:', connectionString.replace(/:[^:/@]+@/, ':****@'));

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function clearDatabase() {
    console.log('--- Starting Database Clean ---');
    const client = await pool.connect();
    try {
        // 1. Clear Public Tables
        console.log('Step 1: Clearing Public Tables...');
        const res = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
        `);

        const tables = res.rows.map(row => row.tablename);

        if (tables.length > 0) {
            console.log(`Found ${tables.length} tables: ${tables.join(', ')}`);
            for (const table of tables) {
                // Truncate with CASCADE
                await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
            }
            console.log('All public tables truncated.');
        } else {
            console.log('No public tables found.');
        }

        // 2. Clear Supabase Auth Users
        console.log('\nStep 2: Clearing Supabase Auth Users...');
        const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

        if (sbUrl && sbKey) {
            const supabase = createClient(sbUrl, sbKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });

            // List users (limit to 1000 for this script)
            const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });

            if (error) {
                console.error('Error fetching Supabase users:', error.message);
            } else if (users && users.length > 0) {
                console.log(`Found ${users.length} Supabase users. Deleting...`);
                for (const u of users) {
                    const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
                    if (delErr) {
                        console.error(`Failed to delete user ${u.email}:`, delErr.message);
                    } else {
                        console.log(`Deleted Supabase user: ${u.email}`);
                    }
                }
            } else {
                console.log('No Supabase users found.');
            }
        } else {
            console.warn('WARNING: Skipping Supabase Auth reset. SUPABASE_SERVICE_ROLE_KEY is missing.');
        }

        console.log('\n✅ Database Clear Complete.');

    } catch (err) {
        console.error('❌ Error clearing database:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

clearDatabase();

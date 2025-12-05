require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function reset() {
    console.log('--- Starting System Reset ---');
    try {
        // 1. Reset Local DB
        console.log('Resetting Local Postgres Tables...');
        // Truncate users and cascading tables to clear all app data
        // Added other tables just in case they exist
        await pool.query(`
        TRUNCATE TABLE 
            users, 
            departments, 
            classes, 
            teacher_profiles, 
            student_profiles, 
            user_activities, 
            audit_logs, 
            generated_reports,
            email_verifications,
            password_resets,
            org_code_requests
        RESTART IDENTITY CASCADE
     `).catch(e => console.log('Partial table truncate error (ignoring if tables missing):', e.message));

        console.log('Local DB Tables Truncated.');

        // 2. Reset Supabase Users
        const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

        if (sbUrl && sbKey) {
            console.log('Resetting Supabase Auth Users...');
            const supabase = createClient(sbUrl, sbKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });

            // List all users (pagination might be needed for large sets, assuming < 50 for dev)
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
            console.warn('WARNING: Skipping Supabase reset. SUPABASE_SERVICE_ROLE_KEY is missing in .env');
        }

        console.log('--- Reset Complete ---');

    } catch (e) {
        console.error('Reset failed:', e);
    } finally {
        pool.end();
    }
}

reset();

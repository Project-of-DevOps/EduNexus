const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function checkRLS() {
    try {
        await client.connect();

        const res = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public';
        `);

        console.log('--- Table RLS Status ---');
        let rlsMissing = false;
        res.rows.forEach(row => {
            const status = row.rowsecurity ? 'ENABLED' : 'DISABLED';
            console.log(`${row.tablename}: ${status}`);
            if (!row.rowsecurity) rlsMissing = true;
        });

        if (rlsMissing) {
            console.log('\nWARNING: Some tables have RLS disabled. This is a security risk if using Supabase client on frontend.');
        } else {
            console.log('\nAll tables have RLS enabled.');
        }

    } catch (err) {
        console.error('Error checking RLS:', err);
    } finally {
        await client.end();
    }
}

checkRLS();

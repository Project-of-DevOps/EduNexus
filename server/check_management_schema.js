const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    // ssl: { rejectUnauthorized: false } // Uncomment if needed for Supabase production
});

async function checkSchema() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // 1. Get all tables
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

        const tables = tablesRes.rows.map(row => row.table_name);
        console.log('\n--- Existing Tables ---');
        console.log(tables);

        // 2. Get detailed info for specific management tables
        const managementTables = [
            'users', 'org_code_requests', 'departments', 'classes',
            'user_activities', 'audit_logs', 'generated_reports',
            'teachers', 'students', 'roles', 'permissions'
        ];

        console.log('\n--- Management Table Constraints ---');

        for (const table of managementTables) {
            if (tables.includes(table)) {
                console.log(`\nTable: ${table}`);

                // Get Columns
                const cols = await client.query(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = $1
                `, [table]);
                console.log('  Columns:', cols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

                // Get Constraints (PK/FK)
                const constraints = await client.query(`
                    SELECT tc.constraint_name, tc.constraint_type, kcu.column_name, 
                           ccu.table_name AS foreign_table_name,
                           ccu.column_name AS foreign_column_name 
                    FROM information_schema.table_constraints tc 
                    JOIN information_schema.key_column_usage kcu 
                      ON tc.constraint_name = kcu.constraint_name 
                      AND tc.table_schema = kcu.table_schema 
                    LEFT JOIN information_schema.constraint_column_usage ccu 
                      ON tc.constraint_name = ccu.constraint_name 
                      AND tc.table_schema = ccu.table_schema 
                    WHERE tc.table_name = $1 AND tc.table_schema = 'public'
                `, [table]);

                if (constraints.rows.length > 0) {
                    constraints.rows.forEach(c => {
                        let desc = `  - ${c.constraint_type} on ${c.column_name}`;
                        if (c.constraint_type === 'FOREIGN KEY') {
                            desc += ` -> references ${c.foreign_table_name}.${c.foreign_column_name}`;
                        }
                        console.log(desc);
                    });
                } else {
                    console.log('  No constraints found.');
                }
            } else {
                console.log(`\nTable: ${table} [MISSING]`);
            }
        }

    } catch (err) {
        console.error('Error querying schema:', err);
    } finally {
        await client.end();
    }
}

checkSchema();

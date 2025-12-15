
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function reproduce() {
    try {
        const email = 'test_repro_' + Date.now() + '@example.com';
        const password = 'password123';
        const hash = await bcrypt.hash(password, 10);
        const role = 'Management';
        const extra = { uniqueId: 'ABC1234' };
        const name = 'Test User';

        // Exact values from handleSignupAsync logic for Management role
        const organizationId = null;
        const linkedStudentId = null;
        const rollNumber = null;

        console.log('Attempting INSERT...');
        const r = await pool.query(
            'INSERT INTO users (name,email,password_hash,role,extra, organization_id, linked_student_id, roll_number) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,name,email,role,created_at',
            [name, email, hash, role, extra, organizationId, linkedStudentId, rollNumber]
        );
        console.log('INSERT Success:', r.rows[0]);

    } catch (e) {
        console.error('INSERT Failed:', e.message);
        if (e.detail) console.error('Detail:', e.detail);
        if (e.code) console.error('Code:', e.code);
    } finally {
        pool.end();
    }
}

reproduce();

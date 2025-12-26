const express = require('express');
const router = express.Router();
const db = require('../db');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
// Prefer Service Role Key for Admin actions (auto-confirm email), fallback to Anon
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to create Auth User
async function createAuthUser(email, password, metadata) {
    // Try Admin API first (requires Service Role)
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata
    });

    if (error) {
        // Fallback or re-throw
        console.error("Supabase Auth Create Error:", error.message);
        throw error;
    }
    return data.user.id;
}

// 1. Teacher REQUEST Signup
router.post('/signup/teacher-request', async (req, res) => {
    const { username, password, org_code, institute_name } = req.body;

    try {
        // Validate Org Code
        const orgRes = await db.pool.query(`SELECT * FROM organizations WHERE code = $1`, [org_code]);
        if (orgRes.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid Management Code' });
        }
        const org = orgRes.rows[0];

        // Validate Org Name
        if (org.name.toLowerCase() !== institute_name.toLowerCase()) {
            return res.status(400).json({ error: 'Institute/School Name does not match the Code provided.' });
        }

        // Prepare Email
        const email = username.includes('@') ? username : `${username}@test.edu`;

        // Create Auth User
        let userId;
        try {
            userId = await createAuthUser(email, password, { name: username, role: 'teacher' });
        } catch (e) {
            // If Supabase Auth fails (duplicate), we might not get 23505, but a specific error message.
            if (e.message.includes('already registered') || e.code === 422 || e.message.includes('already been registered')) {
                return res.status(409).json({ error: 'Account with this email already exists.' });
            }
            throw e;
        }

        // Insert into USERS (Unified Table)
        try {
            await db.pool.query(
                `INSERT INTO users (id, email, name, role, username, password_hash, supabase_user_id) 
                 VALUES ($1, $2, $3, 'teacher', $4, 'supabase_managed', $1)`,
                [userId, email, username, username]
            );
        } catch (dbErr) {
            if (dbErr.code === '23505') { // Unique violation
                return res.status(409).json({ error: 'Account with this email/username already exists.' });
            }
            throw dbErr;
        }

        // Create Org Member Request
        await db.pool.query(
            `INSERT INTO org_members (user_id, org_id, status) VALUES ($1, $2, 'pending')`,
            [userId, org.id]
        );

        res.json({ success: true, message: 'Request sent to management.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Student Signup
router.post('/signup/student', async (req, res) => {
    const { username, password, org_code, class_id, name } = req.body;

    try {
        // Validate Code
        const orgRes = await db.pool.query(`SELECT * FROM organizations WHERE code = $1`, [org_code]);
        if (orgRes.rows.length === 0) return res.status(400).json({ error: 'Invalid Code' });
        const org = orgRes.rows[0];

        // Prepare Email
        const email = username.includes('@') ? username : `${username}@student.edu`;
        const actualName = name || username;

        // Create Auth User
        let userId;
        try {
            userId = await createAuthUser(email, password, { name: actualName, role: 'student' });
        } catch (e) {
            if (e.message.includes('already registered')) return res.status(409).json({ error: 'Account already exists.' });
            throw e;
        }

        try {
            await db.pool.query(
                `INSERT INTO users (id, email, name, role, username, password_hash, supabase_user_id) 
                 VALUES ($1, $2, $3, 'student', $4, 'supabase_managed', $1)`,
                [userId, email, actualName, username]
            );
        } catch (dbErr) {
            if (dbErr.code === '23505') return res.status(409).json({ error: 'Account already exists.' });
            throw dbErr;
        }

        // Enroll in Class
        // Verify class belongs to org
        const classRes = await db.pool.query(`SELECT * FROM classes WHERE id = $1 AND org_id = $2`, [class_id, org.id]);
        if (classRes.rows.length === 0) return res.status(400).json({ error: 'Invalid Class for this Institute' });

        await db.pool.query(
            `INSERT INTO student_enrollments (student_id, class_id, org_id) VALUES ($1, $2, $3)`,
            [userId, class_id, org.id]
        );

        res.json({ success: true, userId });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Parent Signup
router.post('/signup/parent', async (req, res) => {
    const { username, password, parent_email, student_email } = req.body;

    try {
        // Find Student in USERS now
        const studentRes = await db.pool.query(`SELECT * FROM users WHERE email = $1 AND role = 'student'`, [student_email]);
        if (studentRes.rows.length === 0) {
            return res.status(400).json({ error: 'Student email not found' });
        }
        const student = studentRes.rows[0];

        // Check if Parent exists
        let parentId;
        const parentRes = await db.pool.query(`SELECT * FROM users WHERE email = $1`, [parent_email]);

        if (parentRes.rows.length > 0) {
            // Link existing
            parentId = parentRes.rows[0].id;
        } else {
            // Create New Parent
            try {
                parentId = await createAuthUser(parent_email, password, { name: username, role: 'parent' });
            } catch (e) {
                if (e.message.includes('already registered')) {
                    // If auth exists but DB doesn't (rare case), recover? 
                    // Or just return conflict?
                    return res.status(409).json({ error: 'Account exists but database sync failed. Please contact support.' });
                }
                throw e;
            }

            try {
                await db.pool.query(
                    `INSERT INTO users (id, email, name, role, username, password_hash, supabase_user_id) 
                     VALUES ($1, $2, $3, 'parent', $4, 'supabase_managed', $1)`,
                    [parentId, parent_email, username, username]
                );
            } catch (dbErr) {
                if (dbErr.code === '23505') return res.status(409).json({ error: 'Account already exists' });
                throw dbErr;
            }
        }

        // Link
        await db.pool.query(
            `INSERT INTO parent_student_links (parent_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [parentId, student.id]
        );

        res.json({ success: true, parentId });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Classes for Signup (Public/Protected by Code?)
router.get('/public/classes', async (req, res) => {
    const { org_code } = req.query;
    if (!org_code) return res.status(400).json({ error: 'Code required' });

    try {
        const orgRes = await db.pool.query(`SELECT id FROM organizations WHERE code = $1`, [org_code]);
        if (orgRes.rows.length === 0) return res.status(400).json({ error: 'Invalid Code' });
        const orgId = orgRes.rows[0].id;

        const classes = await db.pool.query(`SELECT id, name FROM classes WHERE org_id = $1`, [orgId]);
        res.json(classes.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Parent Get Linked Students
router.get('/parent/students', async (req, res) => {
    const { parent_email } = req.query; // In real app, use req.user.email
    try {
        const parentRes = await db.pool.query(`SELECT id FROM users WHERE email = $1`, [parent_email]);
        if (parentRes.rows.length === 0) return res.status(404).json({ error: 'Parent not found' });
        const parentId = parentRes.rows[0].id;

        const students = await db.pool.query(`
            SELECT p.id, p.name, p.email, c.name as class_name, o.name as school_name
            FROM parent_student_links psl
            JOIN users p ON psl.student_id = p.id
            LEFT JOIN student_enrollments se ON p.id = se.student_id
            LEFT JOIN classes c ON se.class_id = c.id
            LEFT JOIN organizations o ON se.org_id = o.id
            WHERE psl.parent_id = $1
        `, [parentId]);

        res.json(students.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Management Signup (Strict Flow)
router.post('/signup/management', async (req, res) => {
    const { username, password, institute_name, title } = req.body;

    try {
        const email = username.includes('@') ? username : `${username}@management.edu`;

        // 1. Create Auth User
        let userId;
        try {
            userId = await createAuthUser(email, password, { name: username, role: 'management' });
        } catch (e) {
            if (e.message.includes('already registered')) return res.status(409).json({ error: 'Account already exists.' });
            throw e;
        }

        // 2. Insert into USERS
        try {
            await db.pool.query(
                `INSERT INTO users (id, email, name, role, username, password_hash, supabase_user_id) 
                 VALUES ($1, $2, $3, 'management', $4, 'supabase_managed', $1)`,
                [userId, email, username, username]
            );
        } catch (dbErr) {
            if (dbErr.code === '23505') return res.status(409).json({ error: 'Account already exists.' });
            throw dbErr;
        }

        // 3. Create Organization
        const prefix = institute_name.substring(0, 3).toUpperCase();
        const random = Math.floor(1000 + Math.random() * 9000);
        const code = `${prefix}-${random}`;
        const type = 'school'; // Default for now, or pass from frontend if 'institute' vs 'school' matters

        const orgRes = await db.pool.query(
            `INSERT INTO organizations (name, code, type, owner_id) VALUES ($1, $2, $3, $4) RETURNING *`,
            [institute_name, code, type, userId]
        );
        const org = orgRes.rows[0];

        // 4. Link User to Org
        await db.pool.query(
            `INSERT INTO org_members (user_id, org_id, status, assigned_role_title) VALUES ($1, $2, 'approved', $3)`,
            [userId, org.id, title]
        );

        res.json({ success: true, userId, organization: org });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

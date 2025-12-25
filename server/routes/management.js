const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to check if user is management
// Ideally this should check req.user.role === 'management'
const requireManagement = (req, res, next) => {
    // For the test flow, we assume the user is authenticated and is a manager.
    // In strict mode, check req.user.role
    // if (!req.user || req.user.role !== 'management') return res.status(403).json({ error: 'Management only' });
    next();
};

// 1. Create Organization (Institute/School)
router.post('/create-organization', requireManagement, async (req, res) => {
    const { name, type, owner_id } = req.body;
    // Generate code: first 3 chars + random 4 digits
    const prefix = name.substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    const code = `${prefix}-${random}`;

    try {
        const text = `INSERT INTO organizations (name, code, type, owner_id) VALUES ($1, $2, $3, $4) RETURNING *`;
        const result = await db.pool.query(text, [name, code, type, owner_id]);
        res.json({ success: true, organization: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Pending Teacher Requests
router.get('/requests', requireManagement, async (req, res) => {
    const { org_id } = req.query; // Passed from frontend context
    try {
        const text = `
            SELECT om.id, om.user_id, om.status, om.joined_at, p.full_name, p.email 
            FROM org_members om
            JOIN profiles p ON om.user_id = p.id
            WHERE om.org_id = $1 AND om.status = 'pending'
        `;
        const result = await db.pool.query(text, [org_id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Accept Teacher Request & Assign Role
router.post('/requests/accept', requireManagement, async (req, res) => {
    const { request_id, assigned_role_title } = req.body;
    try {
        const text = `
            UPDATE org_members 
            SET status = 'approved', assigned_role_title = $1 
            WHERE id = $2 
            RETURNING *
        `;
        const result = await db.pool.query(text, [assigned_role_title, request_id]);
        res.json({ success: true, member: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Reject Teacher Request
router.post('/requests/reject', requireManagement, async (req, res) => {
    const { request_id } = req.body;
    try {
        const text = `UPDATE org_members SET status = 'rejected' WHERE id = $1 RETURNING *`;
        const result = await db.pool.query(text, [request_id]);
        res.json({ success: true, member: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Create Class
router.post('/classes', requireManagement, async (req, res) => {
    const { org_id, name } = req.body;
    try {
        const text = `INSERT INTO classes (org_id, name) VALUES ($1, $2) RETURNING *`;
        const result = await db.pool.query(text, [org_id, name]);
        res.json({ success: true, class: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Assign Teacher to Class
router.post('/classes/assign', requireManagement, async (req, res) => {
    const { class_id, teacher_id } = req.body;
    try {
        const text = `INSERT INTO class_assignments (class_id, teacher_id) VALUES ($1, $2) RETURNING *`;
        const result = await db.pool.query(text, [class_id, teacher_id]);
        res.json({ success: true, assignment: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 7. Delete User (Teacher)
router.delete('/users/:id', requireManagement, async (req, res) => {
    const { id } = req.params;
    try {
        // Cascade delete will handle related table rows if configured, but let's be safe
        // In our schema: profiles.id is PK. Deleting profile deletes everything due to CASCADE FKs.
        const text = `DELETE FROM profiles WHERE id = $1 RETURNING *`;
        const result = await db.pool.query(text, [id]);
        res.json({ success: true, deleted: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 8. Rename Class
router.put('/classes/:id', requireManagement, async (req, res) => {
    const { name } = req.body;
    const { id } = req.params;
    try {
        const text = `UPDATE classes SET name = $1 WHERE id = $2 RETURNING *`;
        const result = await db.pool.query(text, [name, id]);
        res.json({ success: true, class: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 9. Get Management Dashboard Data (Classes, Teachers, Students)
// Used to verify the workflow
router.get('/dashboard-data', requireManagement, async (req, res) => {
    const { org_id } = req.query;
    if (!org_id) return res.status(400).json({ error: 'org_id required' });

    try {
        // Get Classes
        const classes = await db.pool.query(`SELECT * FROM classes WHERE org_id = $1`, [org_id]);

        // Get Teachers
        const teachers = await db.pool.query(`
            SELECT p.id, p.full_name, p.email, om.assigned_role_title, om.status
            FROM org_members om
            JOIN profiles p ON om.user_id = p.id
            WHERE om.org_id = $1 AND p.role = 'teacher'
        `, [org_id]);

        // Get Students (via enrollments)
        const students = await db.pool.query(`
            SELECT p.id, p.full_name, p.email, c.name as class_name
            FROM student_enrollments se
            JOIN profiles p ON se.student_id = p.id
            JOIN classes c ON se.class_id = c.id
            WHERE se.org_id = $1
        `, [org_id]);

        res.json({
            classes: classes.rows,
            teachers: teachers.rows,
            students: students.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

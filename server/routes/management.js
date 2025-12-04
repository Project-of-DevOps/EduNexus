const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const db = require('../db'); // Assuming a shared db module exists, or we use the pool from index.js if passed

// Middleware to check if user is management (placeholder, implement actual auth check)
const requireManagement = (req, res, next) => {
    // In a real app, verify JWT and check role
    // if (req.user && req.user.role === 'Management') next();
    // else res.status(403).json({ error: 'Unauthorized' });
    next();
};

// Get Dashboard Overview Stats
router.get('/stats', requireManagement, async (req, res) => {
    try {
        const teacherCount = await db.query("SELECT COUNT(*) FROM users WHERE role = 'Teacher'");
        const studentCount = await db.query("SELECT COUNT(*) FROM users WHERE role = 'Student'");
        const classCount = await db.query("SELECT COUNT(*) FROM classes"); // Assuming classes table exists
        // Active users: logged in recently or created recently (simplified)
        const activeCount = await db.query("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'");

        const roleDist = await db.query("SELECT role as name, COUNT(*) as value FROM users GROUP BY role");

        // Department distribution (assuming extra->>'department' or a joined table)
        // For now, using a simplified query or mock if schema is complex
        const deptDist = await db.query("SELECT extra->>'department' as name, COUNT(*) as value FROM users WHERE role='Teacher' GROUP BY extra->>'department'");

        res.json({
            stats: {
                totalTeachers: parseInt(teacherCount.rows[0].count),
                totalStudents: parseInt(studentCount.rows[0].count),
                totalClasses: parseInt(classCount.rows[0]?.count || 0),
                activeUsers: parseInt(activeCount.rows[0].count)
            },
            roleDistribution: roleDist.rows,
            departmentDistribution: deptDist.rows.filter(r => r.name) // Filter out null depts
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get Activity Logs
router.get('/activity-logs', requireManagement, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT l.*, u.email as userEmail 
            FROM activity_logs l 
            LEFT JOIN users u ON l.user_id = u.id 
            ORDER BY l.created_at DESC 
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Bulk Import Users
router.post('/users/bulk', requireManagement, async (req, res) => {
    const { users } = req.body; // Expects array of { name, email, role, department }
    if (!users || !Array.isArray(users)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    const client = await db.pool.connect(); // Assuming db.pool is available
    try {
        await client.query('BEGIN');
        const results = [];
        for (const user of users) {
            // Basic validation
            if (!user.email || !user.role) continue;

            // Insert user (simplified, password handling needed in real app)
            // Using a default password hash for imported users
            const defaultHash = '$2b$10$EpIxT98hP7jF.qixj.qixj.qixj.qixj.qixj.qixj.qixj.qixj';
            const insertRes = await client.query(`
                INSERT INTO users (name, email, role, password_hash, extra)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (email) DO NOTHING
                RETURNING id
            `, [user.name, user.email, user.role, defaultHash, { department: user.department }]);

            if (insertRes.rows.length > 0) {
                results.push({ email: user.email, status: 'created' });
                // Log activity
                await client.query(`
                    INSERT INTO activity_logs (action, details) 
                    VALUES ('USER_IMPORTED', $1)
                `, [`Imported user ${user.email}`]);
            } else {
                results.push({ email: user.email, status: 'skipped' });
            }
        }
        await client.query('COMMIT');
        res.json({ message: 'Import processed', results });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Import failed' });
    } finally {
        client.release();
    }
});

module.exports = router;

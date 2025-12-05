const express = require('express');
const router = express.Router();
const db = require('../db'); // Use new async DB adapter

// Middleware to check if user is management
const requireManagement = (req, res, next) => {
    // In a real app, verify JWT and check role in req.user
    // For now we assume the main index.js middleware authenticates
    next();
};

// Get Dashboard Overview Stats
router.get('/stats', requireManagement, async (req, res) => {
    try {
        const users = await db.users.all();

        // Filter based on roles using the unified users table
        const teacherCount = users.filter(u => u.role === 'Teacher').length;
        const studentCount = users.filter(u => u.role === 'Student').length;
        const classCount = 0; // Mock

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeCount = users.filter(u => new Date(u.created_at) > thirtyDaysAgo).length;

        const roleDist = {};
        users.forEach(u => {
            roleDist[u.role] = (roleDist[u.role] || 0) + 1;
        });
        const roleDistArray = Object.keys(roleDist).map(key => ({ name: key, value: roleDist[key] }));

        const deptDist = {};
        users.filter(u => u.role === 'Teacher').forEach(u => {
            const dept = (u.extra && u.extra.department) || 'Unassigned';
            deptDist[dept] = (deptDist[dept] || 0) + 1;
        });
        const deptDistArray = Object.keys(deptDist).map(key => ({ name: key, value: deptDist[key] }));

        res.json({
            stats: {
                totalTeachers: teacherCount,
                totalStudents: studentCount,
                totalClasses: classCount,
                activeUsers: activeCount
            },
            roleDistribution: roleDistArray,
            departmentDistribution: deptDistArray
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get Activity Logs
router.get('/activity-logs', requireManagement, async (req, res) => {
    try {
        const logs = [];
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Bulk Import Users
router.post('/users/bulk', requireManagement, async (req, res) => {
    const { users } = req.body;
    if (!users || !Array.isArray(users)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        const results = [];
        for (const user of users) {
            if (!user.email || !user.role) continue;

            const existing = await db.users.findByEmail(user.email);
            if (existing) {
                results.push({ email: user.email, status: 'skipped' });
                continue;
            }

            const defaultHash = '$2b$10$EpIxT98hP7jF.qixj.qixj.qixj.qixj.qixj.qixj.qixj.qixj';

            try {
                await db.users.create({
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    password_hash: defaultHash,
                    extra: { department: user.department }
                });
                results.push({ email: user.email, status: 'created' });
            } catch (err) {
                console.warn(`Skipping user ${user.email} due to DB error: ${err.message}`);
                results.push({ email: user.email, status: 'failed', reason: err.message });
            }
        }
        res.json({ message: 'Import processed', results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Import failed' });
    }
});

module.exports = router;

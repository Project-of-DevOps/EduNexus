/**
 * MANAGEMENT DASHBOARD API ENDPOINTS
 * Phase 1 Features: User Search, Bulk Import, Bulk Actions, Activity Logs, Dashboard Overview
 * 
 * Add these routes to server/index.js
 */

// ==================== USER SEARCH & FILTER ENDPOINTS ====================

/**
 * GET /api/management/users/search
 * Advanced user search with filtering
 * Query params: search, role, department, status, limit, offset
 */
export const getUsersSearchEndpoint = `
app.get('/api/management/users/search', authenticateToken, requireRole('management'), async (req, res) => {
    try {
        const { search, role, department, status, limit = 50, offset = 0 } = req.query;
        const userId = req.user.id;
        const instituteId = req.user.instituteId;

        let query = 'SELECT id, name, email, role, status, department, institute_id, created_at FROM users WHERE 1=1';
        const params = [];

        // Scope to organization
        if (instituteId) {
            query += ' AND institute_id = $' + (params.length + 1);
            params.push(instituteId);
        }

        // Search filter
        if (search) {
            const searchParam = '%' + search + '%';
            query += ' AND (name ILIKE $' + (params.length + 1) + ' OR email ILIKE $' + (params.length + 2) + ' OR id::text ILIKE $' + (params.length + 3) + ')';
            params.push(searchParam, searchParam, searchParam);
        }

        // Role filter
        if (role) {
            query += ' AND role = $' + (params.length + 1);
            params.push(role);
        }

        // Department filter
        if (department) {
            query += ' AND department = $' + (params.length + 1);
            params.push(department);
        }

        // Status filter
        if (status) {
            query += ' AND status = $' + (params.length + 1);
            params.push(status || 'active');
        }

        // Count total
        const countResult = await pool.query(query.replace('SELECT id, name, email, role, status, department, institute_id, created_at', 'SELECT COUNT(*) as count'));
        const totalCount = parseInt(countResult.rows[0].count);

        // Add pagination
        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: offset + result.rows.length < totalCount
            }
        });
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
`;

// ==================== BULK USER IMPORT ENDPOINT ====================

/**
 * POST /api/management/users/bulk-import
 * Import users from CSV data
 * Body: { users: [{ name, email, role, department?, phone?, status? }] }
 */
export const bulkImportUsersEndpoint = `
app.post('/api/management/users/bulk-import', authenticateToken, requireRole('management'), async (req, res) => {
    try {
        const { users } = req.body;
        const adminId = req.user.id;
        const instituteId = req.user.instituteId;

        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ success: false, error: 'No users provided' });
        }

        // Create bulk operation record
        const bulkOpResult = await pool.query(
            'INSERT INTO bulk_operations (admin_id, operation_type, total_records, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [adminId, 'import', users.length, 'in_progress']
        );
        const bulkOpId = bulkOpResult.rows[0].id;

        let successCount = 0;
        let failureCount = 0;
        const errors = [];

        for (const user of users) {
            try {
                const { name, email, role, department, phone, status = 'active' } = user;

                // Validate required fields
                if (!name || !email || !role) {
                    throw new Error('Missing required fields: name, email, role');
                }

                // Check if user exists
                const existingUser = await pool.query(
                    'SELECT id FROM users WHERE email = $1',
                    [email]
                );

                if (existingUser.rows.length > 0) {
                    throw new Error(\`User with email \${email} already exists\`);
                }

                // Hash password (generate temporary)
                const tempPassword = Math.random().toString(36).substring(2, 15);
                const hashedPassword = bcrypt.hashSync(tempPassword, 10);

                // Create user
                await pool.query(
                    \`INSERT INTO users (name, email, password, role, department, phone, status, institute_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())\`,
                    [name, email, hashedPassword, role, department || null, phone || null, status, instituteId || null]
                );

                // Log activity
                await logAdminAction(adminId, 'bulk_import_user', null, 'user', null, null, { email, name, role }, 'success');

                successCount++;
            } catch (error) {
                failureCount++;
                errors.push(error.message);
            }
        }

        // Update bulk operation status
        await pool.query(
            'UPDATE bulk_operations SET processed_records = $1, failed_records = $2, status = $3, completed_at = NOW() WHERE id = $4',
            [successCount, failureCount, 'completed', bulkOpId]
        );

        res.json({
            success: true,
            message: \`Imported \${successCount} users, \${failureCount} failed\`,
            stats: { successCount, failureCount, totalRequested: users.length },
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined
        });
    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
`;

// ==================== BULK ACTIONS ENDPOINTS ====================

/**
 * POST /api/management/users/bulk-action
 * Perform bulk actions on selected users
 * Body: { userIds: [id1, id2, ...], action: 'delete'|'suspend'|'activate'|'reset-password'|'change-role', roleNewRole?: 'string' }
 */
export const bulkActionsEndpoint = `
app.post('/api/management/users/bulk-action', authenticateToken, requireRole('management'), async (req, res) => {
    try {
        const { userIds, action, newRole } = req.body;
        const adminId = req.user.id;
        const instituteId = req.user.instituteId;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, error: 'No users selected' });
        }

        let successCount = 0;
        let failureCount = 0;

        for (const userId of userIds) {
            try {
                // Verify user belongs to same organization
                const userResult = await pool.query(
                    'SELECT id, status, role FROM users WHERE id = $1 AND institute_id = $2',
                    [userId, instituteId]
                );

                if (userResult.rows.length === 0) {
                    failureCount++;
                    continue;
                }

                const user = userResult.rows[0];

                switch (action) {
                    case 'delete':
                        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
                        await logAdminAction(adminId, 'bulk_delete_user', userId, 'user', null, { status: user.status }, null, 'success');
                        break;

                    case 'suspend':
                        await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['suspended', userId]);
                        await logAdminAction(adminId, 'bulk_suspend_user', userId, 'user', null, { status: user.status }, { status: 'suspended' }, 'success');
                        break;

                    case 'activate':
                        await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['active', userId]);
                        await logAdminAction(adminId, 'bulk_activate_user', userId, 'user', null, { status: user.status }, { status: 'active' }, 'success');
                        break;

                    case 'reset-password':
                        const tempPassword = Math.random().toString(36).substring(2, 15);
                        const hashedPassword = bcrypt.hashSync(tempPassword, 10);
                        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
                        // TODO: Send email with temporary password
                        await logAdminAction(adminId, 'bulk_reset_password', userId, 'user', null, null, null, 'success');
                        break;

                    case 'change-role':
                        if (!newRole) throw new Error('New role not specified');
                        await pool.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, userId]);
                        await logAdminAction(adminId, 'bulk_change_role', userId, 'user', null, { role: user.role }, { role: newRole }, 'success');
                        break;

                    default:
                        throw new Error('Unknown action');
                }

                successCount++;
            } catch (error) {
                console.error(\`Error processing user \${userId}:\`, error);
                failureCount++;
            }
        }

        res.json({
            success: true,
            message: \`Action completed: \${successCount} succeeded, \${failureCount} failed\`,
            stats: { successCount, failureCount }
        });
    } catch (error) {
        console.error('Bulk action error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
`;

// ==================== ACTIVITY LOG ENDPOINTS ====================

/**
 * GET /api/management/audit-logs
 * Retrieve audit logs with filtering
 */
export const getAuditLogsEndpoint = `
app.get('/api/management/audit-logs', authenticateToken, requireRole('management'), async (req, res) => {
    try {
        const { action, status, startDate, endDate, limit = 50, offset = 0 } = req.query;
        const adminId = req.user.id;
        const instituteId = req.user.instituteId;

        let query = \`
            SELECT 
                a.id, a.admin_id, a.action, a.target_user_id, a.resource_type,
                a.old_values, a.new_values, a.ip_address, a.status, a.created_at,
                admin.name as admin_name, target.name as target_user_name
            FROM admin_audit_logs a
            LEFT JOIN users admin ON a.admin_id = admin.id
            LEFT JOIN users target ON a.target_user_id = target.id
            WHERE 1=1
        \`;
        const params = [];

        // Filter by action
        if (action) {
            query += ' AND a.action = $' + (params.length + 1);
            params.push(action);
        }

        // Filter by status
        if (status) {
            query += ' AND a.status = $' + (params.length + 1);
            params.push(status);
        }

        // Filter by date range
        if (startDate) {
            query += ' AND a.created_at >= $' + (params.length + 1);
            params.push(new Date(startDate));
        }
        if (endDate) {
            query += ' AND a.created_at <= $' + (params.length + 1);
            params.push(new Date(endDate));
        }

        // Get total count
        const countResult = await pool.query(query.replace('SELECT .*', 'SELECT COUNT(*) as count').split('FROM')[0] + ' FROM admin_audit_logs a WHERE 1=1', params.slice(0, params.length - (startDate ? 1 : 0) - (endDate ? 1 : 0)));

        query += ' ORDER BY a.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Audit log retrieval error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
`;

// ==================== DASHBOARD OVERVIEW ENDPOINTS ====================

/**
 * GET /api/management/dashboard/overview
 * Get dashboard statistics and overview
 */
export const getDashboardOverviewEndpoint = `
app.get('/api/management/dashboard/overview', authenticateToken, requireRole('management'), async (req, res) => {
    try {
        const instituteId = req.user.instituteId;

        const stats = {};

        // Total users
        const usersResult = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE institute_id = $1',
            [instituteId]
        );
        stats.totalUsers = parseInt(usersResult.rows[0].count);

        // Users by role
        const roleResult = await pool.query(
            'SELECT role, COUNT(*) as count FROM users WHERE institute_id = $1 GROUP BY role',
            [instituteId]
        );
        const roleStats = {};
        roleResult.rows.forEach(row => {
            roleStats[row.role] = parseInt(row.count);
        });
        stats.totalTeachers = roleStats.teacher || 0;
        stats.totalStudents = roleStats.student || 0;
        stats.totalParents = roleStats.parent || 0;

        // Departments
        const deptResult = await pool.query(
            'SELECT COUNT(DISTINCT id) as count FROM departments WHERE institute_id = $1',
            [instituteId]
        );
        stats.totalDepartments = parseInt(deptResult.rows[0].count);

        // Classes
        const classResult = await pool.query(
            'SELECT COUNT(DISTINCT id) as count FROM classes WHERE institute_id = $1',
            [instituteId]
        );
        stats.totalClasses = parseInt(classResult.rows[0].count);

        // Pending approvals
        const pendingResult = await pool.query(
            'SELECT COUNT(*) as count FROM pending_org_requests WHERE status = $1 AND institute_id = $2',
            ['pending', instituteId]
        );
        stats.pendingApprovals = parseInt(pendingResult.rows[0].count);

        // Active sessions
        const sessionsResult = await pool.query(
            'SELECT COUNT(*) as count FROM session_logs WHERE is_active = TRUE AND user_id IN (SELECT id FROM users WHERE institute_id = $1)',
            [instituteId]
        );
        stats.activeSessionsCount = sessionsResult.rows[0]?.count || 0;

        // Teachers by department
        const teacherDeptResult = await pool.query(
            \`SELECT department, COUNT(*) as count FROM users 
             WHERE role = 'teacher' AND institute_id = $1 GROUP BY department\`,
            [instituteId]
        );
        const teacherByDept = {};
        teacherDeptResult.rows.forEach(row => {
            teacherByDept[row.department || 'Unassigned'] = parseInt(row.count);
        });

        // Recent activities
        const activitiesResult = await pool.query(
            \`SELECT 
                id, action, created_at, target_user_id,
                (SELECT name FROM users WHERE id = target_user_id) as target_user_name
             FROM admin_audit_logs
             WHERE admin_id IN (SELECT id FROM users WHERE institute_id = $1)
             ORDER BY created_at DESC
             LIMIT 20\`,
            [instituteId]
        );

        const recentActivities = activitiesResult.rows.map(row => ({
            id: row.id,
            type: row.action,
            description: \`Action: \${row.action} on user: \${row.target_user_name || 'Unknown'}\`,
            timestamp: row.created_at,
            icon: getActivityIcon(row.action)
        }));

        res.json({
            success: true,
            stats,
            teacherByDepartment: teacherByDept,
            recentActivities
        });
    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper function
function getActivityIcon(action) {
    if (action.includes('create')) return '➕';
    if (action.includes('delete')) return '🗑️';
    if (action.includes('update')) return '✏️';
    if (action.includes('approve')) return '✅';
    if (action.includes('reject')) return '❌';
    if (action.includes('suspend')) return '⛔';
    return '📋';
}
`;

// ==================== HELPER FUNCTION ====================

/**
 * Helper function to log admin actions
 * Call this in any admin action that should be audited
 */
export const logAdminActionHelper = `
async function logAdminAction(adminId, action, targetUserId, resourceType, resourceId, oldValues, newValues, status = 'success', errorMessage = null) {
    try {
        await pool.query(
            \`INSERT INTO admin_audit_logs 
             (admin_id, action, target_user_id, resource_type, resource_id, old_values, new_values, status, error_message, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)\`,
            [
                adminId,
                action,
                targetUserId,
                resourceType,
                resourceId,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                status,
                errorMessage,
                null // IP would be extracted from request in real implementation
            ]
        );
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
}
`;

/**
 * All exports
 */
export const allManagementEndpoints = {
    getUsersSearchEndpoint,
    bulkImportUsersEndpoint,
    bulkActionsEndpoint,
    getAuditLogsEndpoint,
    getDashboardOverviewEndpoint,
    logAdminActionHelper
};

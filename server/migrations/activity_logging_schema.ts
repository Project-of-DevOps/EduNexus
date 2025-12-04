/**
 * MIGRATION: Add User Activity Logging & Audit Trail Tables
 * This file defines the SQL schema needed for:
 * - User activity logging
 * - Audit trail (admin actions)
 * - Bulk operations tracking
 */

export const activityLoggingSchema = `
-- User Activity Log Table
-- Tracks all user actions (login, data access, modifications, etc.)
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity_logs(action);

-- Admin Audit Log Table
-- Tracks all admin/management actions for compliance
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target_user ON admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_status ON admin_audit_logs(status);

-- Bulk Operation Tracking Table
-- Tracks bulk import/export operations
CREATE TABLE IF NOT EXISTS bulk_operations (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL, -- 'import', 'export', 'delete', 'suspend', etc.
    total_records INTEGER,
    processed_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    file_name TEXT,
    status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    error_details JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for bulk operations
CREATE INDEX IF NOT EXISTS idx_bulk_ops_admin_id ON bulk_operations(admin_id);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_created_at ON bulk_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_status ON bulk_operations(status);

-- User Status History Table
-- Tracks status changes (active, suspended, deleted, etc.)
CREATE TABLE IF NOT EXISTS user_status_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_status_user_id ON user_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_created_at ON user_status_history(created_at DESC);

-- Permission Cache Table (optional, for RBAC)
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(255) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- Session Log Table (optional, for active session tracking)
CREATE TABLE IF NOT EXISTS session_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_session_is_active ON session_logs(is_active);
CREATE INDEX IF NOT EXISTS idx_session_login_at ON session_logs(login_at DESC);
`;

/**
 * Rollback script (if needed)
 */
export const rollbackActivityLoggingSchema = `
DROP TABLE IF EXISTS session_logs;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS user_status_history;
DROP TABLE IF EXISTS bulk_operations;
DROP TABLE IF EXISTS admin_audit_logs;
DROP TABLE IF EXISTS user_activity_logs;
`;

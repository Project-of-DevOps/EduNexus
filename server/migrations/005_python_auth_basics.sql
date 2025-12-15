
-- 005_python_auth_basics.sql

-- 1. Create management_manager table (if not exists)
-- Using UUID as requested
CREATE TABLE IF NOT EXISTS management_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Link to existing users table
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'Manager',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Add management_id to users if not strictly relying on organization_id
-- (User requested linked users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS management_manager_id UUID REFERENCES management_managers(id) ON DELETE SET NULL;

-- 3. Dashboard State Persistence
CREATE TABLE IF NOT EXISTS user_dashboard_states (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state_data JSONB DEFAULT '{}'::jsonb,
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Auth Audit / Login Sessions (Simplified)
CREATE TABLE IF NOT EXISTS login_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_states_user ON user_dashboard_states(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON login_sessions(user_id);

-- Create Users Table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'Management',
    extra JSONB DEFAULT '{}'::jsonb,
    two_factor_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Index on Email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create Index on Role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add comment
COMMENT ON TABLE users IS 'Core users table for EduNexus AI';

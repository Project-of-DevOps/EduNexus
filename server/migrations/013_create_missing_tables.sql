-- Ensure users table exists
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL,
    extra JSONB DEFAULT '{}',
    organization_id UUID,
    linked_student_id UUID,
    roll_number TEXT,
    two_factor_secret TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist (idempotent)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS extra JSONB DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS linked_student_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT; -- strict mode might fail if type mismatch, but usually text

-- Email Verifications
CREATE TABLE IF NOT EXISTS public.email_verifications (
    email TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Password Resets
CREATE TABLE IF NOT EXISTS public.password_resets (
    email TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Org Code Requests
CREATE TABLE IF NOT EXISTS public.org_code_requests (
    token TEXT PRIMARY KEY,
    management_email TEXT NOT NULL,
    org_type TEXT NOT NULL,
    institute_id TEXT,
    status TEXT DEFAULT 'pending', 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signup Queue
CREATE TABLE IF NOT EXISTS public.signup_queue (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL,
    password_hash TEXT,
    role TEXT,
    extra JSONB,
    status TEXT DEFAULT 'queued',
    attempts INT DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.signup_syncs (
    id SERIAL PRIMARY KEY,
    email TEXT,
    status TEXT,
    attempts INT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

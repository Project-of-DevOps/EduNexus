-- 1. Rename existing PROFILES table to USERS to serve as the single source of truth
ALTER TABLE public.profiles RENAME TO users;

-- 2. Add requested columns to match the "Users" schema requirements
ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS username TEXT,
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS supabase_user_id UUID UNIQUE,
    ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 3. Enforce Unique Constraints (Case-Insensitive)
-- This ensures no email or username is duplicated across any role (Teacher, Student, Parent, Management)

-- Remove any existing plain unique constraints if they conflict (optional, usually none on profiles.email yet)
-- CREATE UNIQUE INDEX users_unique_lower_email_idx ON public.users ((lower(email))) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_unique_lower_email_idx ON public.users ((lower(email)));

-- CREATE UNIQUE INDEX users_unique_lower_username_idx ON public.users ((lower(username))) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_unique_lower_username_idx ON public.users ((lower(username)));

-- 4. Update References in related tables?
-- Postgres automatically renames constraints when a table is renamed, so 'references profiles(id)' becomes 'references users(id)' metadata-wise.
-- However, we should verify.

-- 5. Helper function for updating timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

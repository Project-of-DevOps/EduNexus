-- 6. Ensure columns exist (Fix for previous migration failure or missing columns)
-- We use DO block to be robust
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username') THEN
        ALTER TABLE public.users ADD COLUMN username TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='supabase_user_id') THEN
        ALTER TABLE public.users ADD COLUMN supabase_user_id UUID UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
        ALTER TABLE public.users ADD COLUMN password_hash TEXT;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_unique_lower_email_idx ON public.users ((lower(email)));
CREATE UNIQUE INDEX IF NOT EXISTS users_unique_lower_username_idx ON public.users ((lower(username)));

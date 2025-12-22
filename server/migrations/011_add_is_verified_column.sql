-- Add is_verified column if missing (seems it was missing in previous attempts)
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

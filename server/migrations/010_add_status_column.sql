-- Add status column to teachers and students for granular approval state
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Migrate existing records to pending by default if status is null
UPDATE public.teachers SET status = 'pending' WHERE status IS NULL;
UPDATE public.students SET status = 'pending' WHERE status IS NULL;

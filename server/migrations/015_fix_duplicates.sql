-- Remove duplicate users, keeping the most recently created one
DELETE FROM public.users
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
        ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY created_at DESC) as rnum
        FROM public.users
    ) t
    WHERE t.rnum > 1
);

-- Add unique constraint to prevent future duplicates (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON public.users (lower(email));

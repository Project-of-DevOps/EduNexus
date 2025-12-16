-- Ensure org_codes exists and is writable by authenticated/service flows
CREATE TABLE IF NOT EXISTS public.org_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  institute_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Enable Row Level Security so we can add explicit policies
ALTER TABLE public.org_codes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT/INSERT/UPDATE/DELETE (adjust as needed)
DROP POLICY IF EXISTS "Auth: select org_codes" ON public.org_codes;
CREATE POLICY "Auth: select org_codes" ON public.org_codes FOR SELECT TO authenticated, service_role USING (true);

DROP POLICY IF EXISTS "Auth: insert org_codes" ON public.org_codes;
CREATE POLICY "Auth: insert org_codes" ON public.org_codes FOR INSERT TO authenticated, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Auth: update org_codes" ON public.org_codes;
CREATE POLICY "Auth: update org_codes" ON public.org_codes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth: delete org_codes" ON public.org_codes;
CREATE POLICY "Auth: delete org_codes" ON public.org_codes FOR DELETE TO authenticated USING (true);

-- Grant basic privileges to authenticated role (so Postgres role checks pass as well)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_codes TO authenticated;
-- Also grant to the Supabase service role so service-key operations succeed
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_codes TO service_role;

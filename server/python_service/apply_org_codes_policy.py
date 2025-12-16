import os
from dotenv import load_dotenv
import psycopg2


def load_env():
    here = os.path.dirname(__file__)
    load_dotenv(os.path.join(here, '..', '..', '.env'))


SQL = """
-- Apply org_codes RLS policies and grants
CREATE TABLE IF NOT EXISTS public.org_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  institute_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.org_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth: select org_codes" ON public.org_codes;
CREATE POLICY "Auth: select org_codes" ON public.org_codes FOR SELECT TO authenticated, service_role USING (true);

DROP POLICY IF EXISTS "Auth: insert org_codes" ON public.org_codes;
CREATE POLICY "Auth: insert org_codes" ON public.org_codes FOR INSERT TO authenticated, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Auth: update org_codes" ON public.org_codes;
CREATE POLICY "Auth: update org_codes" ON public.org_codes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth: delete org_codes" ON public.org_codes;
CREATE POLICY "Auth: delete org_codes" ON public.org_codes FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_codes TO authenticated;
-- Also allow service role operations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_codes TO service_role;
"""


def apply():
    load_env()
    conn_str = os.environ.get('DATABASE_URL')
    if not conn_str:
        raise RuntimeError('DATABASE_URL must be set in .env to apply migration')
    conn = psycopg2.connect(conn_str)
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(SQL)
                print('Applied org_codes policies/grants successfully')
    finally:
        conn.close()


if __name__ == '__main__':
    try:
        apply()
    except Exception as e:
        print('Failed to apply org_codes policy:', e)
        raise

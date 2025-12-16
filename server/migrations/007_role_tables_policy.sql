-- Ensure teachers, students, parents tables allow authenticated service writes via RLS
CREATE TABLE IF NOT EXISTS public.teachers (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  department TEXT,
  institute_id TEXT,
  reporting_to UUID,
  class_id TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth: insert teachers" ON public.teachers;
CREATE POLICY "Auth: insert teachers" ON public.teachers FOR INSERT TO authenticated, service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Auth: select teachers" ON public.teachers;
CREATE POLICY "Auth: select teachers" ON public.teachers FOR SELECT TO authenticated, service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
-- Also allow service role to access role tables for admin/service operations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO service_role;

CREATE TABLE IF NOT EXISTS public.students (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  roll_number TEXT,
  class_id TEXT,
  parent_id UUID,
  institute_id TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth: insert students" ON public.students;
CREATE POLICY "Auth: insert students" ON public.students FOR INSERT TO authenticated, service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Auth: select students" ON public.students;
CREATE POLICY "Auth: select students" ON public.students FOR SELECT TO authenticated, service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO service_role;

CREATE TABLE IF NOT EXISTS public.parents (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  child_ids UUID[],
  institute_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth: insert parents" ON public.parents;
CREATE POLICY "Auth: insert parents" ON public.parents FOR INSERT TO authenticated, service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Auth: select parents" ON public.parents;
CREATE POLICY "Auth: select parents" ON public.parents FOR SELECT TO authenticated, service_role USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parents TO service_role;

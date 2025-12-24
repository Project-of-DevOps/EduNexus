-- 011_security_and_policies.sql
-- Add unique email constraint (case-insensitive), org_members audit columns, and RLS policies

-- Ensure pgcrypto available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Unique lower(email) index on users or profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='users' AND indexname='users_unique_lower_email_idx') THEN
      CREATE UNIQUE INDEX users_unique_lower_email_idx ON public.users ((lower(email))) WHERE email IS NOT NULL;
    END IF;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='profiles' AND indexname='profiles_unique_lower_email_idx') THEN
      CREATE UNIQUE INDEX profiles_unique_lower_email_idx ON public.profiles ((lower(email))) WHERE email IS NOT NULL;
    END IF;
  END IF;
END$$;

-- 2) Add audit columns to org_members
ALTER TABLE IF EXISTS public.org_members ADD COLUMN IF NOT EXISTS processed_by UUID;
ALTER TABLE IF EXISTS public.org_members ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- 3) Row Level Security Policies

-- ORGANIZATIONS
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_policy ON public.organizations;
CREATE POLICY org_select_policy ON public.organizations FOR SELECT TO authenticated USING (
  owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.org_members om WHERE om.org_id = organizations.id AND om.user_id = auth.uid() AND om.status = 'approved'
  )
);
DROP POLICY IF EXISTS org_insert_policy ON public.organizations;
CREATE POLICY org_insert_policy ON public.organizations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS org_update_policy ON public.organizations;
CREATE POLICY org_update_policy ON public.organizations FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS org_delete_policy ON public.organizations;
CREATE POLICY org_delete_policy ON public.organizations FOR DELETE TO authenticated USING (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO service_role;

-- CLASSES
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS class_select_policy ON public.classes;
CREATE POLICY class_select_policy ON public.classes FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = classes.org_id AND (o.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.class_assignments ca WHERE ca.class_id = classes.id AND ca.teacher_id = auth.uid()))
  )
);
DROP POLICY IF EXISTS class_insert_policy ON public.classes;
CREATE POLICY class_insert_policy ON public.classes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = classes.org_id AND o.owner_id = auth.uid())
);
DROP POLICY IF EXISTS class_update_policy ON public.classes;
CREATE POLICY class_update_policy ON public.classes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = classes.org_id AND o.owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = classes.org_id AND o.owner_id = auth.uid())
);
DROP POLICY IF EXISTS class_delete_policy ON public.classes;
CREATE POLICY class_delete_policy ON public.classes FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = classes.org_id AND o.owner_id = auth.uid())
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO service_role;

-- ORG_MEMBERS (teacher requests and approvals)
ALTER TABLE IF EXISTS public.org_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_members_insert_policy ON public.org_members;
CREATE POLICY org_members_insert_policy ON public.org_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
DROP POLICY IF EXISTS org_members_select_policy ON public.org_members;
CREATE POLICY org_members_select_policy ON public.org_members FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_members.org_id AND o.owner_id = auth.uid())
);
DROP POLICY IF EXISTS org_members_update_policy ON public.org_members;
CREATE POLICY org_members_update_policy ON public.org_members FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_members.org_id AND o.owner_id = auth.uid())
) WITH CHECK (
  (status IN ('approved','rejected') AND processed_by = auth.uid()) OR (user_id = auth.uid() AND status = 'pending')
);
DROP POLICY IF EXISTS org_members_delete_policy ON public.org_members;
CREATE POLICY org_members_delete_policy ON public.org_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_members.org_id AND o.owner_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_members TO service_role;

-- CLASS_ASSIGNMENTS
ALTER TABLE IF EXISTS public.class_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ca_insert_policy ON public.class_assignments;
CREATE POLICY ca_insert_policy ON public.class_assignments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.classes c JOIN public.organizations o ON o.id = c.org_id WHERE c.id = class_assignments.class_id AND o.owner_id = auth.uid())
);
DROP POLICY IF EXISTS ca_select_policy ON public.class_assignments;
CREATE POLICY ca_select_policy ON public.class_assignments FOR SELECT TO authenticated USING (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.organizations o JOIN public.classes c ON c.org_id = o.id WHERE c.id = class_assignments.class_id AND o.owner_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_assignments TO service_role;

-- STUDENT_ENROLLMENTS
ALTER TABLE IF EXISTS public.student_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS se_select_policy ON public.student_enrollments;
CREATE POLICY se_select_policy ON public.student_enrollments FOR SELECT TO authenticated USING (
  student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.parent_student_links p WHERE p.parent_id = auth.uid() AND p.student_id = student_enrollments.student_id) OR EXISTS (SELECT 1 FROM public.class_assignments ca WHERE ca.class_id = student_enrollments.class_id AND ca.teacher_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = student_enrollments.org_id AND o.owner_id = auth.uid())
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_enrollments TO service_role;

-- PARENT_STUDENT_LINKS
ALTER TABLE IF EXISTS public.parent_student_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS psl_select_policy ON public.parent_student_links;
CREATE POLICY psl_select_policy ON public.parent_student_links FOR SELECT TO authenticated USING (
  parent_id = auth.uid() OR student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.organizations o JOIN public.student_enrollments se ON se.org_id = o.id WHERE se.student_id = parent_student_links.student_id AND o.owner_id = auth.uid())
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_student_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_student_links TO service_role;

-- END of security and policy migration

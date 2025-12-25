-- Repoint FKs from profiles to users

-- TRUNCATE strict flow tables to avoid FK violations during constraint switch
TRUNCATE public.organizations, public.org_members, public.class_assignments, public.student_enrollments, public.parent_student_links CASCADE;

-- 1. organizations
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_owner_id_fkey;
ALTER TABLE public.organizations 
    ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. org_members
ALTER TABLE public.org_members DROP CONSTRAINT IF EXISTS org_members_user_id_fkey;
ALTER TABLE public.org_members 
    ADD CONSTRAINT org_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. class_assignments
ALTER TABLE public.class_assignments DROP CONSTRAINT IF EXISTS class_assignments_teacher_id_fkey;
ALTER TABLE public.class_assignments 
    ADD CONSTRAINT class_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. student_enrollments
ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_student_id_fkey;
ALTER TABLE public.student_enrollments 
    ADD CONSTRAINT student_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. parent_student_links
ALTER TABLE public.parent_student_links DROP CONSTRAINT IF EXISTS parent_student_links_parent_id_fkey;
ALTER TABLE public.parent_student_links 
    ADD CONSTRAINT parent_student_links_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.parent_student_links DROP CONSTRAINT IF EXISTS parent_student_links_student_id_fkey;
ALTER TABLE public.parent_student_links 
    ADD CONSTRAINT parent_student_links_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Drop the confused profiles table if it exists and is not users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        DROP TABLE public.profiles;
    END IF;
END$$;

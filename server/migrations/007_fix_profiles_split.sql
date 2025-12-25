-- 007: Fix split brain between profiles and users
-- Repoint all Foreign Keys from 'profiles' to 'users'

-- 1. Organizations
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_owner_id_fkey;
DELETE FROM public.organizations WHERE owner_id NOT IN (SELECT id FROM public.users);
ALTER TABLE public.organizations ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Org Members
ALTER TABLE public.org_members DROP CONSTRAINT IF EXISTS org_members_user_id_fkey;
DELETE FROM public.org_members WHERE user_id NOT IN (SELECT id FROM public.users);
ALTER TABLE public.org_members ADD CONSTRAINT org_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Class Assignments
ALTER TABLE public.class_assignments DROP CONSTRAINT IF EXISTS class_assignments_teacher_id_fkey;
DELETE FROM public.class_assignments WHERE teacher_id NOT IN (SELECT id FROM public.users);
ALTER TABLE public.class_assignments ADD CONSTRAINT class_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Student Enrollments
ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_student_id_fkey;
DELETE FROM public.student_enrollments WHERE student_id NOT IN (SELECT id FROM public.users);
ALTER TABLE public.student_enrollments ADD CONSTRAINT student_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. Parent Student Links
ALTER TABLE public.parent_student_links DROP CONSTRAINT IF EXISTS parent_student_links_parent_id_fkey;
DELETE FROM public.parent_student_links WHERE parent_id NOT IN (SELECT id FROM public.users);
ALTER TABLE public.parent_student_links ADD CONSTRAINT parent_student_links_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.parent_student_links DROP CONSTRAINT IF EXISTS parent_student_links_student_id_fkey;
DELETE FROM public.parent_student_links WHERE student_id NOT IN (SELECT id FROM public.users);
ALTER TABLE public.parent_student_links ADD CONSTRAINT parent_student_links_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 6. Finally, Drop Profiles if empty or migrated
-- We assume users is the master.
DROP TABLE IF EXISTS public.profiles CASCADE;

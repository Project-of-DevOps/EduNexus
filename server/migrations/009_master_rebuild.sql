
-- 1. CLEANUP: Drop existing tables and types to start fresh
DROP TABLE IF EXISTS public.parent_student_links CASCADE;
DROP TABLE IF EXISTS public.student_enrollments CASCADE;
DROP TABLE IF EXISTS public.class_assignments CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.org_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.org_type;
DROP TYPE IF EXISTS public.member_status;

-- 2. ENUMS: Define strict options for roles and types
CREATE TYPE public.user_role AS ENUM ('management', 'teacher', 'student', 'parent');
CREATE TYPE public.org_type AS ENUM ('school', 'institute');
CREATE TYPE public.member_status AS ENUM ('pending', 'approved', 'rejected');

-- 3. PROFILES: Central user identity (Extends auth.users)
-- NOTE: For this test simulation, we removed 'REFERENCES auth.users(id)' to allow inserting mock UUIDs.
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY, 
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role public.user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORGANIZATIONS: The School or Institute entity
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- The "Management Code" (e.g., SCH-8821)
    type public.org_type NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORG_MEMBERS: Links Teachers to Organizations (Approval System)
CREATE TABLE public.org_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    status public.member_status DEFAULT 'pending',
    
    -- Specific Title assigned by Management (HOD, Professor, etc.)
    -- We use text here because options differ between School/Institute
    assigned_role_title TEXT, 
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id) -- A teacher can't apply to the same org twice
);

-- 6. CLASSES: Created by Management
CREATE TABLE public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "Class 10-A" or "Computer Science 101"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, name) -- No duplicate class names in the same school
);

-- 7. CLASS_ASSIGNMENTS: Linking Teachers to Classes
CREATE TABLE public.class_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, teacher_id)
);

-- 8. STUDENT_ENROLLMENTS: Linking Students to Classes
CREATE TABLE public.student_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, class_id)
);

-- 9. PARENT_STUDENT_LINKS: The Parent-Child Connection
CREATE TABLE public.parent_student_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- 10. ROW LEVEL SECURITY (Basic Setup)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

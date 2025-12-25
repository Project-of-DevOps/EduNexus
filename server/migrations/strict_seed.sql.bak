DO $$
DECLARE
    -- Variables to hold UUIDs for our dummy users
    mgmt_id UUID := gen_random_uuid();
    teacher1_id UUID := gen_random_uuid(); -- HOD
    teacher2_id UUID := gen_random_uuid(); -- Professor
    teacher3_id UUID := gen_random_uuid(); -- Associate
    teacher4_id UUID := gen_random_uuid(); -- Pending
    student1_id UUID := gen_random_uuid(); -- Child A
    student2_id UUID := gen_random_uuid(); -- Child B
    parent_id UUID := gen_random_uuid();
    
    my_org_id UUID;
    class_a_id UUID;
    class_b_id UUID;
BEGIN
    -- 1. Create PROFILES (Simulating Signup)
    -- Admin
    INSERT INTO public.users (email, name, role, username, password_hash, supabase_user_id) 
    VALUES ('admin@edu.com', 'Principal Skinner', 'management', 'admin@edu.com', 'seeded', gen_random_uuid())
    ON CONFLICT ((lower(email))) DO NOTHING;
    SELECT id INTO mgmt_id FROM public.users WHERE lower(email) = 'admin@edu.com';
    RAISE NOTICE 'Mgmt ID: %', mgmt_id;
    
    -- Teacher 1
    INSERT INTO public.users (email, name, role, username, password_hash, supabase_user_id) 
    VALUES ('t1@edu.com', 'Mrs. Krabappel', 'teacher', 't1@edu.com', 'seeded', gen_random_uuid())
    ON CONFLICT ((lower(email))) DO NOTHING;
    SELECT id INTO teacher1_id FROM public.users WHERE lower(email) = 't1@edu.com';
    RAISE NOTICE 'Teacher1 ID: %', teacher1_id;

    -- Teacher 2
    INSERT INTO public.users (email, name, role, username, password_hash, supabase_user_id) 
    VALUES ('t2@edu.com', 'Mr. Hoover', 'teacher', 't2@edu.com', 'seeded', gen_random_uuid())
    ON CONFLICT ((lower(email))) DO NOTHING;
    SELECT id INTO teacher2_id FROM public.users WHERE lower(email) = 't2@edu.com';
    RAISE NOTICE 'Teacher2 ID: %', teacher2_id;

    -- Teacher 3
    INSERT INTO public.users (email, name, role, username, password_hash, supabase_user_id) 
    VALUES ('t3@edu.com', 'Dewey Largo', 'teacher', 't3@edu.com', 'seeded', gen_random_uuid())
    ON CONFLICT ((lower(email))) DO NOTHING;
    SELECT id INTO teacher3_id FROM public.users WHERE lower(email) = 't3@edu.com';
    RAISE NOTICE 'Teacher3 ID: %', teacher3_id;

    -- Teacher 4
    INSERT INTO public.users (email, name, role, username, password_hash, supabase_user_id) 
    VALUES ('t4@edu.com', 'Groundskeeper Willie', 'teacher', 't4@edu.com', 'seeded', gen_random_uuid())
    ON CONFLICT ((lower(email))) DO NOTHING;
    SELECT id INTO teacher4_id FROM public.users WHERE lower(email) = 't4@edu.com';
    RAISE NOTICE 'Teacher4 ID: %', teacher4_id;

    -- Student 1
    INSERT INTO public.users (email, name, role, username, password_hash, supabase_user_id) 
    VALUES ('bart@edu.com', 'Bart Simpson', 'student', 'bart@edu.com', 'seeded', gen_random_uuid())
    ON CONFLICT ((lower(email))) DO NOTHING;
    SELECT id INTO student1_id FROM public.users WHERE lower(email) = 'bart@edu.com';
    RAISE NOTICE 'Student1 ID: %', student1_id;

    -- Student 2
    INSERT INTO public.users (email, name, role, username, password_hash, supabase_user_id) 
    VALUES ('lisa@edu.com', 'Lisa Simpson', 'student', 'lisa@edu.com', 'seeded', gen_random_uuid())
    ON CONFLICT ((lower(email))) DO NOTHING;
    SELECT id INTO student2_id FROM public.users WHERE lower(email) = 'lisa@edu.com';
    RAISE NOTICE 'Student2 ID: %', student2_id;

    -- Parent
    INSERT INTO public.users (email, name, role, username, password_hash, supabase_user_id) 
    VALUES ('homer@edu.com', 'Homer Simpson', 'parent', 'homer@edu.com', 'seeded', gen_random_uuid())
    ON CONFLICT ((lower(email))) DO NOTHING;
    SELECT id INTO parent_id FROM public.users WHERE lower(email) = 'homer@edu.com';
    RAISE NOTICE 'Parent ID: %', parent_id;

    -- 2. Management Creates ORGANIZATION
    INSERT INTO public.organizations (name, code, type, owner_id)
    VALUES ('Springfield Elementary', 'SCH-999', 'school', mgmt_id)
    ON CONFLICT (code) DO NOTHING
    RETURNING id INTO my_org_id;

    -- If org already existed, fetch its ID
    IF my_org_id IS NULL THEN
        SELECT id INTO my_org_id FROM public.organizations WHERE code = 'SCH-999';
    END IF;
    RAISE NOTICE 'Organization ID: %', my_org_id;

    -- 3. Teachers Join (Requesting Code SCH-999)
    -- Teacher 1
    BEGIN
        INSERT INTO public.org_members (user_id, org_id, status, assigned_role_title)
        VALUES (teacher1_id, my_org_id, 'approved', 'HOD') ON CONFLICT DO NOTHING;
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'FK Violation for Teacher 1 Org Member';
    END;

    -- Teacher 2
    BEGIN
        INSERT INTO public.org_members (user_id, org_id, status, assigned_role_title)
        VALUES (teacher2_id, my_org_id, 'approved', 'Class Teacher') ON CONFLICT DO NOTHING;
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'FK Violation for Teacher 2 Org Member';
    END;
    
    -- Teacher 3
    BEGIN
        INSERT INTO public.org_members (user_id, org_id, status, assigned_role_title)
        VALUES (teacher3_id, my_org_id, 'approved', 'Subject Teacher') ON CONFLICT DO NOTHING;
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'FK Violation for Teacher 3 Org Member';
    END;

    -- Teacher 4
    BEGIN
        INSERT INTO public.org_members (user_id, org_id, status, assigned_role_title)
        VALUES (teacher4_id, my_org_id, 'pending', NULL) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'FK Violation for Teacher 4 Org Member';
    END;

    -- 4. Management Creates CLASSES
    INSERT INTO public.classes (org_id, name) VALUES (my_org_id, 'Class 4-A') ON CONFLICT DO NOTHING RETURNING id INTO class_a_id;
    IF class_a_id IS NULL THEN SELECT id INTO class_a_id FROM public.classes WHERE name = 'Class 4-A' AND org_id = my_org_id; END IF;

    INSERT INTO public.classes (org_id, name) VALUES (my_org_id, 'Class 4-B') ON CONFLICT DO NOTHING RETURNING id INTO class_b_id;
    IF class_b_id IS NULL THEN SELECT id INTO class_b_id FROM public.classes WHERE name = 'Class 4-B' AND org_id = my_org_id; END IF;

    -- 5. Assign Teachers to Classes
    BEGIN
        INSERT INTO public.class_assignments (class_id, teacher_id) VALUES (class_a_id, teacher1_id) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK Violation for Class Assignment A'; END;
    
    BEGIN
        INSERT INTO public.class_assignments (class_id, teacher_id) VALUES (class_b_id, teacher2_id) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK Violation for Class Assignment B'; END;

    -- 6. Students Signup & Select Class
    BEGIN
        INSERT INTO public.student_enrollments (student_id, class_id, org_id) VALUES (student1_id, class_a_id, my_org_id) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK Violation for Student 1 Enrollment'; END;

    BEGIN
        INSERT INTO public.student_enrollments (student_id, class_id, org_id) VALUES (student2_id, class_a_id, my_org_id) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK Violation for Student 2 Enrollment'; END;

    -- 7. Parent Signup (Links to both kids)
    BEGIN
        INSERT INTO public.parent_student_links (parent_id, student_id) VALUES (parent_id, student1_id) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK Violation for Parent Link 1'; END;

    BEGIN
        INSERT INTO public.parent_student_links (parent_id, student_id) VALUES (parent_id, student2_id) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK Violation for Parent Link 2'; END;
    
END $$;


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
    INSERT INTO public.profiles (id, email, full_name, role) VALUES 
    (mgmt_id, 'admin@edu.com', 'Principal Skinner', 'management'),
    (teacher1_id, 't1@edu.com', 'Mrs. Krabappel', 'teacher'),
    (teacher2_id, 't2@edu.com', 'Mr. Hoover', 'teacher'),
    (teacher3_id, 't3@edu.com', 'Dewey Largo', 'teacher'),
    (teacher4_id, 't4@edu.com', 'Groundskeeper Willie', 'teacher'),
    (student1_id, 'bart@edu.com', 'Bart Simpson', 'student'),
    (student2_id, 'lisa@edu.com', 'Lisa Simpson', 'student'),
    (parent_id, 'homer@edu.com', 'Homer Simpson', 'parent');

    -- 2. Management Creates ORGANIZATION
    INSERT INTO public.organizations (name, code, type, owner_id)
    VALUES ('Springfield Elementary', 'SCH-999', 'school', mgmt_id)
    RETURNING id INTO my_org_id;

    -- 3. Teachers Join (Requesting Code SCH-999)
    -- Teacher 1: Approved as HOD
    INSERT INTO public.org_members (user_id, org_id, status, assigned_role_title)
    VALUES (teacher1_id, my_org_id, 'approved', 'HOD');

    -- Teacher 2: Approved as Class Teacher
    INSERT INTO public.org_members (user_id, org_id, status, assigned_role_title)
    VALUES (teacher2_id, my_org_id, 'approved', 'Class Teacher');
    
    -- Teacher 3: Approved as Subject Teacher
    INSERT INTO public.org_members (user_id, org_id, status, assigned_role_title)
    VALUES (teacher3_id, my_org_id, 'approved', 'Subject Teacher');

    -- Teacher 4: Still Pending (Management hasn't accepted yet)
    INSERT INTO public.org_members (user_id, org_id, status, assigned_role_title)
    VALUES (teacher4_id, my_org_id, 'pending', NULL);

    -- 4. Management Creates CLASSES
    INSERT INTO public.classes (org_id, name) VALUES (my_org_id, 'Class 4-A') RETURNING id INTO class_a_id;
    INSERT INTO public.classes (org_id, name) VALUES (my_org_id, 'Class 4-B') RETURNING id INTO class_b_id;

    -- 5. Assign Teachers to Classes
    -- Krabappel gets 4-A, Hoover gets 4-B
    INSERT INTO public.class_assignments (class_id, teacher_id) VALUES (class_a_id, teacher1_id);
    INSERT INTO public.class_assignments (class_id, teacher_id) VALUES (class_b_id, teacher2_id);

    -- 6. Students Signup & Select Class
    -- Bart joins Class 4-A
    INSERT INTO public.student_enrollments (student_id, class_id, org_id) VALUES (student1_id, class_a_id, my_org_id);
    -- Lisa joins Class 4-A (Same class pair)
    INSERT INTO public.student_enrollments (student_id, class_id, org_id) VALUES (student2_id, class_a_id, my_org_id);

    -- 7. Parent Signup (Links to both kids)
    INSERT INTO public.parent_student_links (parent_id, student_id) VALUES (parent_id, student1_id);
    INSERT INTO public.parent_student_links (parent_id, student_id) VALUES (parent_id, student2_id);
    
END $$;

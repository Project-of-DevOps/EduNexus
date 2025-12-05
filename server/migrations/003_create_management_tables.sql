-- Create Departments Table
CREATE TABLE IF NOT EXISTS "departments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "institute_id" TEXT, 
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_dept_name_institute UNIQUE ("name", "institute_id")
);

-- Create Classes Table
CREATE TABLE IF NOT EXISTS "classes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "department_id" UUID REFERENCES "departments"("id") ON DELETE SET NULL,
    "institute_id" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_class_name_institute UNIQUE ("name", "institute_id")
);

-- Create Teacher Profiles Table (Linking to Users)
CREATE TABLE IF NOT EXISTS "teacher_profiles" (
    "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
    "department_id" UUID REFERENCES "departments"("id") ON DELETE SET NULL,
    "reporting_to" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "title" TEXT,
    "subjects" JSONB DEFAULT '[]', -- Array of subject strings
    "qualifications" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create Student Profiles Table (Linking to Users)
CREATE TABLE IF NOT EXISTS "student_profiles" (
    "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
    "class_id" UUID REFERENCES "classes"("id") ON DELETE SET NULL,
    "department_id" UUID REFERENCES "departments"("id") ON DELETE SET NULL,
    "parent_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "enrollment_no" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create User Activities Log
CREATE TABLE IF NOT EXISTS "user_activities" (
    "id" SERIAL PRIMARY KEY,
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "changes" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create Audit Logs (System Level)
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" SERIAL PRIMARY KEY,
    "admin_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "action" TEXT NOT NULL,
    "target_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create Generated Reports
CREATE TABLE IF NOT EXISTS "generated_reports" (
    "id" SERIAL PRIMARY KEY,
    "report_type" TEXT NOT NULL,
    "generated_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "report_data" JSONB, -- Store snapshot of data or link to file
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

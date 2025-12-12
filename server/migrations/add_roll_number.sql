-- Add roll_number to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS roll_number TEXT;

-- Create composite index for efficient lookup of students by (Organization, RollNumber)
CREATE INDEX IF NOT EXISTS idx_users_org_roll ON users(organization_id, roll_number);

-- Add constraint to ensure Roll Numbers are unique WITHIN an organization for Students
-- (We use a partial index for this to avoid affecting other roles)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_roll_per_org 
ON users(organization_id, roll_number) 
WHERE role = 'Student';

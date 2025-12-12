-- Create Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    management_id UUID REFERENCES users(id), -- The management user who owns this org
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add organization_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Add linked_student_id to users (for Parents)
ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_student_id UUID REFERENCES users(id);

-- Create Index on Code
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);

-- Create sequences for schools and institutes
CREATE SEQUENCE IF NOT EXISTS school_seq START 1;
CREATE SEQUENCE IF NOT EXISTS institute_seq START 1;

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY DEFAULT 'school-' || nextval('school_seq'),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- Create institutes table
CREATE TABLE IF NOT EXISTS institutes (
    id TEXT PRIMARY KEY DEFAULT 'institute-' || nextval('institute_seq'),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- Enable RLS (Row Level Security) - Optional but good practice, keeping it open for now or matching strictness of users
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to everyone (or restricted as needed, for now open for management dashboard queries)
CREATE POLICY "Allow public read access" ON schools FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON institutes FOR SELECT USING (true);

-- Policy: Allow insert during signup (service role usually handles this, but for completeness)
CREATE POLICY "Allow service insert" ON schools FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service insert" ON institutes FOR INSERT WITH CHECK (true);

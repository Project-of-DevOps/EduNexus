-- Enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "generated_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_code_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_resets" ENABLE ROW LEVEL SECURITY;

-- Note: The server (Node.js) connects using the service key/connection string, 
-- which BYPASSES RLS. These policies are for the frontend client (Anon Key).

-- 1. Departments & Classes: Public Read (needed for signup lists)
CREATE POLICY "Public Read Departments" ON "departments" FOR SELECT USING (true);
CREATE POLICY "Public Read Classes" ON "classes" FOR SELECT USING (true);

-- 2. Users: 
-- Authenticated users can read basic user info (needed for directories, etc.)
-- Users can only update their own profile
CREATE POLICY "Auth Read Users" ON "users" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Self Update Users" ON "users" FOR UPDATE TO authenticated USING (id = auth.uid());
-- Allow insert during signup (if using Supabase Auth, but we have custom auth)
-- Since we use custom auth with a Node backend, the backend does the insertion. 
-- The backend bypasses RLS, so we don't need an INSERT policy for anon here 
-- UNLESS the frontend inserts directly (which it doesn't seem to, it calls /api/signup).

-- 3. Profiles: Authenticated read
CREATE POLICY "Auth Read Teachers" ON "teacher_profiles" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth Read Students" ON "student_profiles" FOR SELECT TO authenticated USING (true);

-- 4. Logs: Admin only (or self for activity)
-- For now, allow users to see their own activity
CREATE POLICY "Self Read Activity" ON "user_activities" FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 5. Org Codes: Public read/insert?
-- Likely handled by backend. If handled by backend, no anon policy needed.

-- 6. Email/Password: Backend only.
-- No policies added means default DENY for Anon/Authenticated. Only Service Role can access. 
-- This is correct for security tables.

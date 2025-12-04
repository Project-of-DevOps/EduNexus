-- Migration: Seed data
INSERT INTO users (email, password_hash, role, name, extra)
VALUES 
('admin@edunexus.ai', '$2b$10$EpIxT98hP7jF.qixj.qixj.qixj.qixj.qixj.qixj.qixj.qixj', 'Management', 'Admin User', '{"department": "IT"}'::jsonb),
('teacher@edunexus.ai', '$2b$10$EpIxT98hP7jF.qixj.qixj.qixj.qixj.qixj.qixj.qixj.qixj', 'Teacher', 'Teacher User', '{"subject": "Math"}'::jsonb),
('student@edunexus.ai', '$2b$10$EpIxT98hP7jF.qixj.qixj.qixj.qixj.qixj.qixj.qixj.qixj', 'Student', 'Student User', '{"grade": "10"}'::jsonb)
ON CONFLICT ((lower(email)), role) DO NOTHING;

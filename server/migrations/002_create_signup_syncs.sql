-- Migration: create signup_syncs audit table
CREATE TABLE IF NOT EXISTS signup_syncs (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

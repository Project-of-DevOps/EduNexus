CREATE TABLE IF NOT EXISTS org_code_requests (
  id SERIAL PRIMARY KEY,
  management_email VARCHAR(255) NOT NULL,
  org_type VARCHAR(50) NOT NULL,
  institute_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, rejected
  token VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# Management Login Database Constraints Analysis

## Executive Summary

After analyzing your Supabase database setup and management login implementation, I've identified **several missing constraints and improvements** that should be added to ensure data integrity, security, and proper role-based access control.

---

## Current Database Schema Issues

### 1. **Users Table - Missing Constraints**

**Current Schema:**
```sql
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT,
    "email" TEXT UNIQUE NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "extra" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
```

**Issues Found:**
- ❌ **No CHECK constraint on role** - Allows invalid role values like "admin", "superuser", etc.
- ❌ **No INDEX on email** - Email lookups are slow (though UNIQUE creates an index)
- ❌ **No updated_at timestamp** - Can't track when records were modified
- ❌ **No status column** - Can't mark users as active/inactive/suspended
- ❌ **No organization scope** - Management users can't be scoped to specific schools/institutes
- ❌ **password_hash allows NULL** - Could be problematic for non-OAuth users

---

### 2. **Missing Management-Specific Table**

**Current Issue:** Management users are stored in the generic `users` table without role-specific metadata.

**What's Missing:**
```sql
-- MISSING: Management-specific metadata table
CREATE TABLE "management_profiles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "management_role" TEXT NOT NULL, -- e.g., 'Chairman', 'Director', 'Principal'
    "institute_id" TEXT NOT NULL,
    "org_type" TEXT NOT NULL, -- 'school' or 'institute'
    "permissions" JSONB DEFAULT '{}', -- Role-specific permissions
    "approval_status" TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("user_id", "institute_id", "org_type")
);
```

---

### 3. **Org Code Requests Table - Insufficient Constraints**

**Current Schema:**
```sql
CREATE TABLE "org_code_requests" (
    "token" TEXT PRIMARY KEY,
    "management_email" TEXT NOT NULL,
    "org_type" TEXT NOT NULL,
    "institute_id" TEXT,
    "status" TEXT DEFAULT 'pending',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
```

**Issues Found:**
- ❌ **No FOREIGN KEY to users** - Can't verify management email exists
- ❌ **No CHECK constraint on status** - Allows invalid statuses
- ❌ **No expiration tracking** - Requests can stay pending indefinitely
- ❌ **No approval tracking** - Can't see who approved/rejected
- ❌ **No updated_at** - Can't track status change times
- ❌ **No uniqueness constraint** - Same email can request multiple codes
- ❌ **No audit trail** - Can't track approval history

**What's Missing:**
```sql
ALTER TABLE "org_code_requests" ADD COLUMN "expires_at" TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days';
ALTER TABLE "org_code_requests" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "org_code_requests" ADD COLUMN "approved_by" TEXT;
ALTER TABLE "org_code_requests" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "org_code_requests" ADD CONSTRAINT chk_status CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));
ALTER TABLE "org_code_requests" ADD CONSTRAINT chk_org_type CHECK (org_type IN ('school', 'institute'));
```

---

### 4. **Missing Email Verification Constraints**

**Current Schema:**
```sql
CREATE TABLE "email_verifications" (
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    PRIMARY KEY ("token")
);
```

**Issues Found:**
- ❌ **No INDEX on email** - Email lookups are slow
- ❌ **No user association** - Can't link verification to user
- ❌ **No verification type tracking** - Can't distinguish between signup/password-reset/email-change
- ❌ **Allows multiple tokens per email** - Should only allow 1 active token per email

**What's Missing:**
```sql
ALTER TABLE "email_verifications" ADD COLUMN "user_id" UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "email_verifications" ADD COLUMN "verification_type" TEXT DEFAULT 'email_verification';
ALTER TABLE "email_verifications" ADD COLUMN "used_at" TIMESTAMPTZ;
CREATE UNIQUE INDEX idx_email_active_verification ON email_verifications(email, verification_type) 
    WHERE used_at IS NULL AND expires_at > NOW();
ALTER TABLE "email_verifications" ADD CONSTRAINT chk_type CHECK (verification_type IN ('email_verification', 'password_reset', 'email_change'));
```

---

### 5. **Password Resets Table - Missing Constraints**

**Current Schema:**
```sql
CREATE TABLE "password_resets" (
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL
);
```

**Issues Found:**
- ❌ **No PRIMARY KEY** - Could have duplicate rows
- ❌ **No INDEX on email** - Lookups are slow
- ❌ **No used_at tracking** - Can't enforce one-time-use policy
- ❌ **No attempt counter** - Can't prevent brute force attacks
- ❌ **No user_id linking** - Can't verify user exists
- ❌ **No expiration enforcement** - Need DB-level enforcement

**What's Missing:**
```sql
ALTER TABLE "password_resets" ADD COLUMN "id" UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE "password_resets" ADD COLUMN "user_id" UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "password_resets" ADD COLUMN "used_at" TIMESTAMPTZ;
ALTER TABLE "password_resets" ADD COLUMN "attempt_count" INTEGER DEFAULT 0;
CREATE UNIQUE INDEX idx_active_reset ON password_resets(email) WHERE used_at IS NULL AND expires_at > NOW();
ALTER TABLE "password_resets" ADD CONSTRAINT chk_attempts CHECK (attempt_count <= 5);
```

---

## Management Login Specific Issues

### Issue 1: No Role Validation in Users Table

**Current Code (components/Login/UnifiedLoginForm.tsx:20):**
```typescript
const managementRoles = ['Chairman', 'Director', 'Principal', 'Vice Principal', 'Dean'];
```

**Problem:** This is client-side only. The database doesn't enforce valid management roles.

**Required Fix:**
```sql
-- Add CHECK constraint to users table for valid roles
ALTER TABLE "users" 
ADD CONSTRAINT chk_user_role CHECK (role IN ('student', 'teacher', 'parent', 'management', 'librarian', 'dean'));

-- Create a separate table for valid management roles
CREATE TABLE "management_roles" (
    "id" SERIAL PRIMARY KEY,
    "role_name" TEXT UNIQUE NOT NULL, -- 'Chairman', 'Director', 'Principal', etc.
    "permissions" JSONB DEFAULT '{}',
    "description" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key in management_profiles to management_roles
ALTER TABLE "management_profiles" 
ADD CONSTRAINT fk_management_role FOREIGN KEY (management_role) REFERENCES management_roles(role_name);
```

---

### Issue 2: No Institute/School Scoping

**Current Issue:** Management users aren't scoped to specific institutions, allowing access conflicts.

**Required Fix:**
```sql
-- Create schools/institutes table
CREATE TABLE "institutes" (
    "id" TEXT PRIMARY KEY, -- institute_id from requests
    "name" TEXT NOT NULL,
    "org_type" TEXT NOT NULL CHECK (org_type IN ('school', 'institute')),
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "address" TEXT,
    "verified" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Add institute reference to management_profiles
ALTER TABLE "management_profiles" 
ADD CONSTRAINT fk_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE;

-- Add institute reference to users
ALTER TABLE "users" 
ADD COLUMN "institute_id" TEXT,
ADD CONSTRAINT fk_user_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE SET NULL;
```

---

### Issue 3: No Approval Workflow

**Current Issue:** No tracking of which management accounts are approved/pending.

**Required Fix:**
```sql
-- Add to users table
ALTER TABLE "users" 
ADD COLUMN "status" TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'inactive')),
ADD COLUMN "approved_at" TIMESTAMPTZ,
ADD COLUMN "approved_by" UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN "suspended_reason" TEXT;

-- Add audit table for approval workflow
CREATE TABLE "management_approvals" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "status" TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    "reviewed_by" UUID REFERENCES users(id) ON DELETE SET NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Issue 4: No Audit Logging for Management Actions

**Current Issue:** No audit trail for sensitive management operations.

**Required Fix:**
```sql
CREATE TABLE "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES users(id) ON DELETE SET NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL, -- 'user', 'org_code', 'institute', etc.
    "resource_id" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_action CHECK (action IN ('create', 'read', 'update', 'delete', 'approve', 'reject'))
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
```

---

## Complete Recommended Schema

Here's the **complete recommended schema** for proper management login constraints:

```sql
-- 1. Users Table (Enhanced)
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "password_hash" TEXT,
    "role" TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'management', 'librarian', 'dean')),
    "status" TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'inactive')),
    "institute_id" TEXT,
    "extra" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    "approved_at" TIMESTAMPTZ,
    "suspended_at" TIMESTAMPTZ,
    "suspended_reason" TEXT
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_institute ON users(institute_id);

-- 2. Management Profiles Table (New)
CREATE TABLE "management_profiles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    "management_role" TEXT NOT NULL, -- 'Chairman', 'Director', 'Principal', etc.
    "institute_id" TEXT NOT NULL,
    "org_type" TEXT NOT NULL CHECK (org_type IN ('school', 'institute')),
    "department" TEXT,
    "permissions" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("user_id", "institute_id", "org_type")
);

CREATE INDEX idx_management_profiles_institute ON management_profiles(institute_id);

-- 3. Institutes Table (New)
CREATE TABLE "institutes" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "org_type" TEXT NOT NULL CHECK (org_type IN ('school', 'institute')),
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "address" TEXT,
    "verified" BOOLEAN DEFAULT FALSE,
    "verification_code" TEXT UNIQUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Org Code Requests Table (Enhanced)
CREATE TABLE "org_code_requests" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "token" TEXT UNIQUE NOT NULL,
    "management_email" TEXT NOT NULL,
    "org_type" TEXT NOT NULL CHECK (org_type IN ('school', 'institute')),
    "institute_id" TEXT,
    "status" TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'used')),
    "expires_at" TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
    "approved_by" UUID REFERENCES users(id) ON DELETE SET NULL,
    "rejected_reason" TEXT,
    "org_code" TEXT UNIQUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_requests_email ON org_code_requests(management_email);
CREATE INDEX idx_org_requests_status ON org_code_requests(status);
CREATE INDEX idx_org_requests_expires ON org_code_requests(expires_at);

-- 5. Email Verifications Table (Enhanced)
CREATE TABLE "email_verifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES users(id) ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "verification_type" TEXT DEFAULT 'email_verification' CHECK (verification_type IN ('email_verification', 'password_reset', 'email_change')),
    "used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_verif_email ON email_verifications(email);
CREATE INDEX idx_email_verif_token ON email_verifications(token);
CREATE UNIQUE INDEX idx_email_active_verif ON email_verifications(email, verification_type) 
    WHERE used_at IS NULL AND expires_at > NOW();

-- 6. Password Resets Table (Enhanced)
CREATE TABLE "password_resets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES users(id) ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ,
    "attempt_count" INTEGER DEFAULT 0 CHECK (attempt_count <= 5),
    "expires_at" TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_password_reset_email ON password_resets(email);
CREATE UNIQUE INDEX idx_active_reset ON password_resets(email) 
    WHERE used_at IS NULL AND expires_at > NOW();

-- 7. Audit Logs Table (New)
CREATE TABLE "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES users(id) ON DELETE SET NULL,
    "action" TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'approve', 'reject', 'suspend', 'login', 'logout')),
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- 8. Management Roles (Reference Table - New)
CREATE TABLE "management_roles" (
    "id" SERIAL PRIMARY KEY,
    "role_name" TEXT UNIQUE NOT NULL,
    "permissions" JSONB DEFAULT '{"dashboard": true, "user_management": false, "analytics": false}',
    "description" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO "management_roles" (role_name, permissions, description) VALUES
('Chairman', '{"dashboard": true, "user_management": true, "analytics": true, "audit": true}', 'Full access'),
('Director', '{"dashboard": true, "user_management": true, "analytics": true}', 'Full access'),
('Principal', '{"dashboard": true, "user_management": true, "analytics": true}', 'Full access'),
('Vice Principal', '{"dashboard": true, "user_management": true, "analytics": false}', 'Limited access'),
('Dean', '{"dashboard": true, "user_management": false, "analytics": false}', 'View only'),
('Admin', '{"dashboard": true, "user_management": true, "analytics": true, "audit": true, "system": true}', 'System administrator');
```

---

## Supabase-Specific Configuration

If you're using **Supabase** specifically, follow these steps:

### 1. **Enable RLS (Row Level Security)**

```sql
-- For management_profiles - Users can only see their own profile
ALTER TABLE management_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON management_profiles
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all"
    ON management_profiles
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- For users - Management users can view users in their institute
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can view institute users"
    ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM management_profiles 
            WHERE user_id = auth.uid()
            AND institute_id = users.institute_id
        )
    );
```

### 2. **Create Indexes for Performance**

```sql
-- Management login queries will benefit from these
CREATE INDEX idx_management_by_email ON users(email, role) WHERE role = 'management';
CREATE INDEX idx_management_by_institute ON users(institute_id, role) WHERE role = 'management';
CREATE INDEX idx_org_requests_pending ON org_code_requests(management_email, status) 
    WHERE status = 'pending' AND expires_at > NOW();
```

### 3. **Setup Triggers for Auto-Update**

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER management_profiles_updated_at BEFORE UPDATE ON management_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER org_requests_updated_at BEFORE UPDATE ON org_code_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Action Items for Your Project

### Priority 1 (Critical - Do First)
- [ ] Add `status` column to users table (pending/approved/suspended/inactive)
- [ ] Add `institute_id` to users table and management profiles
- [ ] Add CHECK constraint on `role` column
- [ ] Add CHECK constraint on `status` in org_code_requests

### Priority 2 (Important - Do Second)
- [ ] Create `management_profiles` table
- [ ] Create `institutes` table
- [ ] Create `management_roles` reference table
- [ ] Add audit logging table

### Priority 3 (Enhancement - Do Last)
- [ ] Enable RLS policies in Supabase
- [ ] Add trigger functions for `updated_at`
- [ ] Add comprehensive indexes
- [ ] Setup audit log middleware in backend

---

## Testing Checklist

After implementing constraints:

- [ ] Management login validates role against allowed roles
- [ ] Email uniqueness constraint prevents duplicate accounts
- [ ] Status field prevents login for suspended/inactive users
- [ ] Institute scoping prevents cross-institute access
- [ ] Org code requests expire after 30 days
- [ ] All unique constraints enforce one-to-one relationships
- [ ] Foreign keys prevent orphaned records
- [ ] Audit logs capture all management actions

---

## Summary

Your current setup is **missing critical constraints** that could lead to:
- 🔴 **Security Issues:** No role validation, no status tracking
- 🔴 **Data Integrity:** No unique constraints, orphaned records possible
- 🔴 **Compliance:** No audit trail for management actions
- 🔴 **Scoping Issues:** Management users not scoped to institutions
- 🔴 **Workflow Issues:** No approval tracking for management signups

**Recommended Next Step:** Implement Priority 1 items first, then proceed with Priority 2 and 3 based on your timeline.

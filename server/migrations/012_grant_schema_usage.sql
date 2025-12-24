-- 012_grant_schema_usage.sql
-- Ensure required roles have USAGE on schema public and rights on sequences/tables

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  -- Grant USAGE on schema to common Supabase roles
  EXECUTE 'GRANT USAGE ON SCHEMA public TO authenticated';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO anon';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO service_role';

  -- Grant usage/select on sequences to allow nextval/select usage
  EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated';
  EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon';
  EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role';

  -- Grant minimal table privileges (RLS will still control row-level access)
  EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated';
  EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon';
  EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role';

  -- Ensure future objects have the correct default privileges for the schema owner
  -- Note: This affects objects created by the current role running this migration.
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role';

  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role';
END$$;

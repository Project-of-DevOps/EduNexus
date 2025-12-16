
import os
import psycopg2
from dotenv import load_dotenv

# Load env from parent of parent (root)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

DB_URL = os.environ.get("DATABASE_URL") or os.environ.get("DIRECT_URL")

if not DB_URL:
    print("Error: DATABASE_URL not found in .env")
    # try constructing it if we have credentials? No, we rely on env.
    exit(1)

def run_sql(sql):
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"SQL Error: {e}")
        return False

def check_and_create_tables():
    print("Checking tables...")

    # Users (Public Profile)
    # We assume 'users' table exists or we verify it.
    run_sql("""
    CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT,
        password_hash TEXT,
        extra JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    # Management Managers
    run_sql("""
    CREATE TABLE IF NOT EXISTS public.management_managers (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES public.users(id),
        name TEXT,
        email TEXT,
        role TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    # Org Codes
    run_sql("""
    CREATE TABLE IF NOT EXISTS public.org_codes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        type TEXT CHECK (type IN ('school', 'institute')),
        institute_id TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    # Teachers
    run_sql("""
    CREATE TABLE IF NOT EXISTS public.teachers (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES public.users(id),
        title TEXT,
        department TEXT,
        institute_id TEXT,
        class_id TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        subjects TEXT[] -- Array of subjects
    );
    """)

    # Students
    run_sql("""
    CREATE TABLE IF NOT EXISTS public.students (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES public.users(id),
        roll_number TEXT,
        class_id TEXT,
        institute_id TEXT,
        parent_id TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    # Parents
    run_sql("""
    CREATE TABLE IF NOT EXISTS public.parents (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES public.users(id),
        institute_id TEXT,
        child_ids TEXT[], -- Array of child user_ids or student_ids
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    # User Dashboard States (for JSON state persistence)
    run_sql("""
    CREATE TABLE IF NOT EXISTS public.user_dashboard_states (
        user_id UUID PRIMARY KEY REFERENCES public.users(id),
        state_data JSONB,
        last_updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    print("Tables check/creation complete.")

if __name__ == "__main__":
    check_and_create_tables()

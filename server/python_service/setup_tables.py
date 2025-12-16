import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv


def load_env():
    # load .env from repo root
    here = os.path.dirname(os.path.dirname(__file__))
    load_dotenv(os.path.join(here, '..', '.env'))


def get_conn():
    load_env()
    conn_str = os.environ.get('DATABASE_URL')
    if not conn_str:
        raise RuntimeError('DATABASE_URL not found in environment')
    # allow insecure local connections
    return psycopg2.connect(conn_str)


def setup_tables():
    conn = get_conn()
    cur = conn.cursor()
    try:
        # users public table (minimal)
        cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT,
            email TEXT UNIQUE,
            role TEXT,
            extra JSONB,
            password_hash TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ''')

        # user dashboard state
        cur.execute('''
        CREATE TABLE IF NOT EXISTS user_dashboard_states (
            user_id UUID PRIMARY KEY,
            state_data JSONB,
            last_updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ''')

        # org codes
        cur.execute('''
        CREATE TABLE IF NOT EXISTS org_codes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL,
            institute_id TEXT,
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE
        );
        ''')

        # teachers, students, parents
        cur.execute('''
        CREATE TABLE IF NOT EXISTS teachers (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            title TEXT,
            department TEXT,
            institute_id TEXT,
            reporting_to UUID,
            class_id TEXT,
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ''')

        cur.execute('''
        CREATE TABLE IF NOT EXISTS students (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            roll_number TEXT,
            class_id TEXT,
            parent_id UUID,
            institute_id TEXT,
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ''')

        cur.execute('''
        CREATE TABLE IF NOT EXISTS parents (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            child_ids UUID[],
            institute_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ''')

        # management managers table (optional)
        cur.execute('''
        CREATE TABLE IF NOT EXISTS management_managers (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            name TEXT,
            email TEXT,
            role TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ''')

        conn.commit()
        print('Tables ensured.')
    finally:
        cur.close()
        conn.close()


if __name__ == '__main__':
    try:
        setup_tables()
    except Exception as e:
        print('Error setting up tables:', e)
        raise
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', '.env'))

url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing Supabase Credentials")
    exit(1)

supabase: Client = create_client(url, key)

def create_tables():
    print("Setting up tables...")

    # 1. Teachers Table
    # We can't actually "CREATE TABLE" via JS/Python client easily unless we use RPC or SQL editor.
    # But we can try to use the 'check_schema.js' approach or just assume we have permissions if we use a specific rpc if available.
    # However, standard Supabase client doesn't support generic SQL execution without a helper function.
    # The user environment has a postgres client in 'setup_db.js'. I should probably use that or the python specialized libraries if installed.
    # Looking at the file list, I see 'setup_db.js' uses 'pg'. I will use a Node script for table creation as it has direct DB access via connection string.
    pass

if __name__ == "__main__":
    print("Please run setup_tables.js instead (using direct PG connection).")

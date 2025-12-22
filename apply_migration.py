
import os
import sys
from supabase import create_client, Client

# Manually load .env since dotenv might be missing
env_path = os.path.join(os.getcwd(), '.env')
env_vars = {}
try:
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, val = line.strip().split('=', 1)
                env_vars[key] = val
except Exception as e:
    print(f"Could not load .env: {e}")

# Use env vars or defaults (User provided Supabase keys in other files)
# I'll rely on the agent environment variables if this fails, but let's try to read them.
url = env_vars.get("SUPABASE_URL") or os.environ.get("SUPABASE_URL")
key = env_vars.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found.")
    sys.exit(1)

supabase: Client = create_client(url, key)

sql_file = os.path.join(os.getcwd(), 'server', 'migrations', '008_create_school_institute_tables.sql')
with open(sql_file, 'r') as f:
    sql = f.read()

print("Applying migration...")

# Supabase-py doesn't support raw SQL directly easily without RPC or standard PG connection.
# But I can try to use a postgres driver.
try:
    import psycopg2
    # Connection string
    db_url = env_vars.get("DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found.")
        sys.exit(1)
        
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    cur.close()
    conn.close()
    print("Migration applied successfully via psycopg2.")
except ImportError:
    print("psycopg2 not installed. Trying node script fallback.")
    sys.exit(1)
except Exception as e:
    print(f"Migration failed: {e}")
    sys.exit(1)

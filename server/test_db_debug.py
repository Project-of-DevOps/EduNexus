
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

url = os.environ.get("DATABASE_URL")
print(f"URL found: {url[:20]}...{url[-20:] if url else 'None'}")

if not url:
    print("No DATABASE_URL")
    exit(1)

try:
    print("Connecting...")
    conn = psycopg2.connect(url)
    print("Connected!")
    
    cur = conn.cursor()
    cur.execute("SELECT current_user, current_database(), version();")
    print("User/DB:", cur.fetchone())
    
    print("Checking permissions on public schema...")
    try:
        cur.execute("CREATE TABLE IF NOT EXISTS test_perm (id serial primary key);")
        print("CREATE TABLE success")
        cur.execute("DROP TABLE test_perm;")
        print("DROP TABLE success")
    except Exception as e:
        print("Write permission failed:", e)
        conn.rollback()

    cur.close()
    conn.close()
except Exception as e:
    print("Connection failed:", e)

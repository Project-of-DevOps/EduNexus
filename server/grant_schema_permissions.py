
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

url = os.environ.get("DATABASE_URL")

try:
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    # GRANT USAGE ON SCHEMA PUBLIC
    print("Granting SCHEMA permissions...")
    sqls = [
        "GRANT USAGE ON SCHEMA public TO service_role;",
        "GRANT CREATE ON SCHEMA public TO service_role;",
        "GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;",
        "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;",
        "GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;",

        # Also grant authenticated and anon minimal schema usage and sequence/table select rights
        "GRANT USAGE ON SCHEMA public TO authenticated;",
        "GRANT USAGE ON SCHEMA public TO anon;",
        "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;",
        "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;",
        "GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;",
        "GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;",
    ]

    for sql in sqls:
        try:
            cur.execute(sql)
            print(f"Executed: {sql}")
        except Exception as e:
            print(f"Failed {sql}: {e}")
            conn.rollback()

    conn.commit()
    print("Schema permissions granted.")
    conn.close()
except Exception as e:
    print("Error:", e)

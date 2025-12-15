
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
        
        # Also ensure postgres has it (it should)
        "GRANT ALL ON SCHEMA public TO postgres;" 
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

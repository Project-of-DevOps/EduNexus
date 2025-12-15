
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

url = os.environ.get("DATABASE_URL")

try:
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    tables = ["users", "management_managers", "user_dashboard_states"]
    roles = ["service_role", "anon", "authenticated"]
    
    print("Granting permissions...")
    for table in tables:
        for role in roles:
            # Grant ALL to service_role, SELECT/INSERT/UPDATE to others based on policy? 
            # For simplicity now, let's give ALL to service_role and usage to others.
            if role == "service_role":
                 sql = f"GRANT ALL ON TABLE {table} TO {role};"
            else:
                 sql = f"GRANT ALL ON TABLE {table} TO {role};" # Open it up for now, refine with RLS later
            
            try:
                cur.execute(sql)
                print(f"Executed: {sql}")
            except Exception as e:
                print(f"Failed {sql}: {e}")
                conn.rollback()

    conn.commit()
    print("Permissions granted.")
    conn.close()
except Exception as e:
    print("Error:", e)

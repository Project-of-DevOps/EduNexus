import os
from dotenv import load_dotenv
load_dotenv('.env')
import psycopg2

conn_str = os.environ.get('DATABASE_URL')
if not conn_str:
    raise SystemExit('DATABASE_URL missing')

with psycopg2.connect(conn_str) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='org_codes' ORDER BY grantee")
        print('org_codes grants:')
        for r in cur.fetchall():
            print(r)
        cur.execute("SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='teachers' ORDER BY grantee")
        print('\nteachers grants:')
        for r in cur.fetchall():
            print(r)
        cur.execute("SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='students' ORDER BY grantee")
        print('\nstudents grants:')
        for r in cur.fetchall():
            print(r)
        cur.execute("SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='parents' ORDER BY grantee")
        print('\nparents grants:')
        for r in cur.fetchall():
            print(r)

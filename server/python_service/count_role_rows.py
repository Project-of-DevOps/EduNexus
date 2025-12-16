import os
from dotenv import load_dotenv
load_dotenv('.env')
import psycopg2

conn_str = os.environ.get('DATABASE_URL')
if not conn_str:
    raise SystemExit('DATABASE_URL missing')
with psycopg2.connect(conn_str) as conn:
    with conn.cursor() as cur:
        for t in ['teachers','students','parents']:
            cur.execute(f"SELECT count(*) FROM {t};")
            print(t, cur.fetchone()[0])

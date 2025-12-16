import os
from dotenv import load_dotenv
import psycopg2


SQL = open(os.path.join(os.path.dirname(__file__), '..', 'migrations', '007_role_tables_policy.sql')).read()


def load_env():
    here = os.path.dirname(__file__)
    load_dotenv(os.path.join(here, '..', '..', '.env'))


def apply():
    load_env()
    conn_str = os.environ.get('DATABASE_URL')
    if not conn_str:
        raise RuntimeError('DATABASE_URL must be set in .env to apply role policies')
    conn = psycopg2.connect(conn_str)
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(SQL)
                print('Applied role table policies/grants successfully')
    finally:
        conn.close()


if __name__ == '__main__':
    try:
        apply()
    except Exception as e:
        print('Failed to apply role policies:', e)
        raise

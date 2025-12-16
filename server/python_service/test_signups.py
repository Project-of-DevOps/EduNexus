import os
import time
import uuid
from dotenv import load_dotenv
from supabase import create_client
from setup_tables import setup_tables


def load_env():
    # load .env from repo root
    here = os.path.dirname(__file__)
    load_dotenv(os.path.join(here, '..', '.env'))

# Guard for admin.create_user usage in automated flows
ALLOW_ADMIN_CREATE = os.environ.get('ALLOW_ADMIN_CREATE', '').lower() in ('1', 'true', 'yes')


def rand_email(prefix: str):
    return f"{prefix.lower()}_{int(time.time())}_{uuid.uuid4().hex[:6]}@example.com"


def run():
    load_env()
    # Ensure tables exist
    try:
        print('Ensuring DB tables...')
        setup_tables()
    except Exception as e:
        print('setup_tables error (continuing):', e)

    url = os.environ.get('SUPABASE_URL') or os.environ.get('VITE_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not url or not key:
        print('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in environment')
        return

    sb = create_client(url, key)

    # Create an institution code and a school code to test org code based signups
    inst_code = None
    school_code = None
    try:
        inst_code = 'I' + uuid.uuid4().hex[:7].upper()
        school_code = 'S' + uuid.uuid4().hex[:7].upper()
        print('Creating institution code:', inst_code)
        r1 = sb.table('org_codes').insert({'code': inst_code, 'type': 'institution', 'institute_id': 'INST_TEST'}).execute()
        if hasattr(r1, 'error') and r1.error:
            raise Exception(r1.error)
        print('Creating school code:', school_code)
        r2 = sb.table('org_codes').insert({'code': school_code, 'type': 'school', 'institute_id': 'INST_TEST_SCHOOL'}).execute()
        if hasattr(r2, 'error') and r2.error:
            raise Exception(r2.error)
    except Exception as e:
        print('Supabase insert failed for initial org_codes, attempting fallback DB inserts:', e)
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            from dotenv import load_dotenv as _load_env
            _load_env(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
            conn_str = os.environ.get('DATABASE_URL')
            if not conn_str:
                raise RuntimeError('DATABASE_URL not configured for fallback')
            with psycopg2.connect(conn_str) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    if inst_code:
                        cur.execute("INSERT INTO org_codes (code, type, institute_id) VALUES (%s, %s, %s) RETURNING *;", (inst_code, 'institution', 'INST_TEST'))
                        row = cur.fetchone()
                        print('Fallback inst_code insert succeeded:', bool(row), 'code:', inst_code)
                    if school_code:
                        cur.execute("INSERT INTO org_codes (code, type, institute_id) VALUES (%s, %s, %s) RETURNING *;", (school_code, 'school', 'INST_TEST_SCHOOL'))
                        row = cur.fetchone()
                        print('Fallback school_code insert succeeded:', bool(row), 'code:', school_code)
        except Exception as e2:
            print('Fallback DB insert failed for org_codes:', e2)

    roles = ['Management', 'Teacher', 'Student', 'Parent']
    created = []

    for role in roles:
        email = rand_email(role)
        password = 'Testpass123!'
        name = f'Test {role} {email.split("@")[0]}'
        print(f'Creating {role} user: {email}')
        try:
            res = sb.auth.sign_up({"email": email, "password": password})
        except Exception as e:
            print('Auth sign_up failed:', e)
            res = None

        # If sign_up returned an object with user, capture id
        user_id = None
        try:
            if res and hasattr(res, 'user') and res.user:
                user_id = res.user.id
        except Exception:
            # older supabase-py may return dict
            try:
                user_id = res['user']['id']
            except Exception:
                user_id = None

        # Persist minimal public profile if not present
        if user_id:
            check = sb.table('users').select('*').eq('id', user_id).execute()
            exists = bool(check.data)
            if not exists:
                print('Inserting public profile for', user_id)
                sb.table('users').insert({
                    'id': user_id,
                    'name': name,
                    'email': email,
                    'role': role,
                    'extra': {},
                    'password_hash': 'supabase_auth'
                }).execute()

            # Role-specific records. Attempt Supabase insert first; on permission error fall back to direct DB insert
            if role == 'Teacher':
                try:
                    res = sb.table('teachers').insert({
                        'user_id': user_id,
                        'title': 'Teacher',
                        'department': 'Test Dept',
                        'institute_id': 'INST_TEST'
                    }).execute()
                    if hasattr(res, 'error') and res.error:
                        raise Exception(res.error)
                except Exception as e:
                    print('Supabase insert failed for teachers, falling back to DB insert:', e)
                    try:
                        import psycopg2
                        from psycopg2.extras import RealDictCursor
                        from dotenv import load_dotenv as _load_env
                        _load_env(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
                        conn_str = os.environ.get('DATABASE_URL')
                        with psycopg2.connect(conn_str) as conn:
                            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                                cur.execute("INSERT INTO teachers (user_id, title, department, institute_id) VALUES (%s,%s,%s,%s)", (user_id, 'Teacher', 'Test Dept', 'INST_TEST'))
                    except Exception as e2:
                        print('Fallback insert into teachers failed:', e2)
            if role == 'Student':
                try:
                    res = sb.table('students').insert({
                        'user_id': user_id,
                        'roll_number': 'R-100',
                        'class_id': 'C-1',
                        'institute_id': 'INST_TEST'
                    }).execute()
                    if hasattr(res, 'error') and res.error:
                        raise Exception(res.error)
                except Exception as e:
                    print('Supabase insert failed for students, falling back to DB insert:', e)
                    try:
                        import psycopg2
                        from psycopg2.extras import RealDictCursor
                        from dotenv import load_dotenv as _load_env
                        _load_env(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
                        conn_str = os.environ.get('DATABASE_URL')
                        with psycopg2.connect(conn_str) as conn:
                            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                                cur.execute("INSERT INTO students (user_id, roll_number, class_id, institute_id) VALUES (%s,%s,%s,%s)", (user_id, 'R-100', 'C-1', 'INST_TEST'))
                    except Exception as e2:
                        print('Fallback insert into students failed:', e2)
            if role == 'Parent':
                try:
                    res = sb.table('parents').insert({
                        'user_id': user_id,
                        'child_ids': [],
                        'institute_id': 'INST_TEST'
                    }).execute()
                    if hasattr(res, 'error') and res.error:
                        raise Exception(res.error)
                except Exception as e:
                    print('Supabase insert failed for parents, falling back to DB insert:', e)
                    try:
                        import psycopg2
                        from psycopg2.extras import RealDictCursor
                        from dotenv import load_dotenv as _load_env
                        _load_env(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
                        conn_str = os.environ.get('DATABASE_URL')
                        with psycopg2.connect(conn_str) as conn:
                            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                                cur.execute("INSERT INTO parents (user_id, child_ids, institute_id) VALUES (%s,%s,%s)", (user_id, [], 'INST_TEST'))
                    except Exception as e2:
                        print('Fallback insert into parents failed:', e2)

            created.append({'role': role, 'email': email, 'password': password, 'id': user_id})
        else:
            print('No user_id returned for signup; attempting admin create_user')
            if not ALLOW_ADMIN_CREATE:
                raise RuntimeError('Refusing to call admin.create_user: set ALLOW_ADMIN_CREATE=1 in env to enable')
            try:
                admin_res = sb.auth.admin.create_user({
                    'email': email,
                    'password': password,
                    'email_confirm': True
                })
                uid = admin_res['user']['id'] if isinstance(admin_res, dict) else getattr(admin_res.user, 'id', None)
                if uid:
                    print('Admin created user id', uid)
                    sb.table('users').insert({'id': uid, 'name': name, 'email': email, 'role': role, 'extra': {}, 'password_hash': 'supabase_auth'}).execute()
                    # Ensure role-specific rows exist even when using admin.create_user (no auth.sign_up flow)
                    try:
                        if role == 'Teacher':
                            r = sb.table('teachers').insert({
                                'user_id': uid,
                                'title': 'Teacher',
                                'department': 'Test Dept',
                                'institute_id': 'INST_TEST'
                            }).execute()
                            if hasattr(r, 'error') and r.error:
                                raise Exception(r.error)
                        if role == 'Student':
                            r = sb.table('students').insert({
                                'user_id': uid,
                                'roll_number': 'R-100',
                                'class_id': 'C-1',
                                'institute_id': 'INST_TEST'
                            }).execute()
                            if hasattr(r, 'error') and r.error:
                                raise Exception(r.error)
                        if role == 'Parent':
                            r = sb.table('parents').insert({
                                'user_id': uid,
                                'child_ids': [],
                                'institute_id': 'INST_TEST'
                            }).execute()
                            if hasattr(r, 'error') and r.error:
                                raise Exception(r.error)
                    except Exception as e:
                        print('Supabase insert failed for role table (admin-created user), falling back to DB insert:', e)
                        try:
                            import psycopg2
                            from psycopg2.extras import RealDictCursor
                            from dotenv import load_dotenv as _load_env
                            _load_env(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
                            conn_str = os.environ.get('DATABASE_URL')
                            with psycopg2.connect(conn_str) as conn:
                                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                                    if role == 'Teacher':
                                        cur.execute("INSERT INTO teachers (user_id, title, department, institute_id) VALUES (%s,%s,%s,%s)", (uid, 'Teacher', 'Test Dept', 'INST_TEST'))
                                    if role == 'Student':
                                        cur.execute("INSERT INTO students (user_id, roll_number, class_id, institute_id) VALUES (%s,%s,%s,%s)", (uid, 'R-100', 'C-1', 'INST_TEST'))
                                    if role == 'Parent':
                                        cur.execute("INSERT INTO parents (user_id, child_ids, institute_id) VALUES (%s,%s,%s)", (uid, [], 'INST_TEST'))
                        except Exception as e2:
                            print('Fallback insert into role table failed for admin-created user:', e2)
                    created.append({'role': role, 'email': email, 'password': password, 'id': uid})
            except Exception as e:
                print('Admin create failed:', e)

    # Try signing in with credentials for each created user to ensure signin works
    print('\nAttempting sign-in checks for created users...')
    # Prefer using anon key to simulate real client sign-in, fall back to service key
    anon_key = os.environ.get('VITE_SUPABASE_ANON_KEY') or os.environ.get('SUPABASE_ANON_KEY')
    client_for_signin = None
    if anon_key:
        client_for_signin = create_client(url, anon_key)
    else:
        print('Warning: anon key not available, reusing service role key for sign-in tests')
        client_for_signin = sb

    signin_results = []
    for u in created:
        try:
            print('Signing in', u['email'])
            signin = client_for_signin.auth.sign_in_with_password({"email": u['email'], "password": u['password']})
            # Try both dict and object shapes
            session_ok = False
            try:
                if isinstance(signin, dict) and signin.get('user'):
                    session_ok = True
                elif hasattr(signin, 'user') and signin.user:
                    session_ok = True
            except Exception:
                session_ok = False
            print('Sign-in result for', u['email'], 'session_ok=', session_ok, 'raw=', getattr(signin, '__dict__', signin))
            signin_results.append({'email': u['email'], 'ok': session_ok})
        except Exception as e:
            print('Sign-in failed for', u['email'], e)
            signin_results.append({'email': u['email'], 'ok': False, 'error': str(e)})

    # Verify role-specific rows exist
    for u in created:
        tid = None
        try:
            role = u['role']
            if role == 'Teacher':
                r = sb.table('teachers').select('*').eq('user_id', u['id']).execute()
                ok = bool(getattr(r, 'data', None))
                print('Teacher row exists for', u['email'], ok)
            if role == 'Student':
                r = sb.table('students').select('*').eq('user_id', u['id']).execute()
                ok = bool(getattr(r, 'data', None))
                print('Student row exists for', u['email'], ok)
            if role == 'Parent':
                r = sb.table('parents').select('*').eq('user_id', u['id']).execute()
                ok = bool(getattr(r, 'data', None))
                print('Parent row exists for', u['email'], ok)
        except Exception as e:
            print('Role-table check failed for', u['email'], e)

    # Create an org code and verify. If regular insert fails due to permission issues
    # (some Supabase projects enforce RLS/policies), fall back to direct DB insert via DATABASE_URL.
    org_code_created_via_supabase = False
    try:
        print('Creating org code via Supabase table API...')
        code = 'TST' + uuid.uuid4().hex[:6].upper()
        res = sb.table('org_codes').insert({'code': code, 'type': 'institution', 'institute_id': 'INST_TEST'}).execute()
        # If insert returns an error structure, raise to trigger fallback
        if hasattr(res, 'error') and res.error:
            raise Exception(res.error)
        check = sb.table('org_codes').select('*').eq('code', code).execute()
        org_code_created_via_supabase = bool(getattr(check, 'data', None))
        print('Org code present via Supabase:', org_code_created_via_supabase, 'code:', code)
    except Exception as e:
        print('Supabase insert failed for org_codes, attempting direct DB fallback:', e)
        # Fallback: use DATABASE_URL to insert directly
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            from dotenv import load_dotenv as _load_dotenv
            _load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
            conn_str = os.environ.get('DATABASE_URL')
            if not conn_str:
                raise RuntimeError('DATABASE_URL not configured for fallback')
            with psycopg2.connect(conn_str) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("INSERT INTO org_codes (code, type, institute_id) VALUES (%s, %s, %s) RETURNING *;", (code, 'institution', 'INST_TEST'))
                    row = cur.fetchone()
                    print('Fallback insert succeeded:', bool(row), 'code:', code)
        except Exception as e2:
            print('Fallback DB insert failed for org_codes:', e2)

    # Theme / dashboard state test for first created user (if any)
    if created:
        u = created[0]
        print('Testing dashboard state storage for', u['email'])
        state = {'theme': 'dark', 'lastSeen': 'test', 'prefs': {'compact': True}}
        try:
            sb.table('user_dashboard_states').upsert({'user_id': u['id'], 'state_data': state}).execute()
            got = sb.table('user_dashboard_states').select('*').eq('user_id', u['id']).execute()
            print('Stored state:', got.data)
        except Exception as e:
            print('Dashboard state upsert/read failed:', e)

    print('\nTEST SUMMARY')
    for c in created:
        print('-', c['role'], c['email'], 'id=', c['id'])

    # --- Assertions to fail fast in CI ---
    # Sign-ins
    if not all(r['ok'] for r in signin_results):
        failed = [r for r in signin_results if not r['ok']]
        raise SystemExit(f"Sign-in assertion failed for: {failed}")

    # Role rows
    for c in created:
        role = c['role']
        uid = c['id']
        if role == 'Teacher':
            r = sb.table('teachers').select('*').eq('user_id', uid).execute()
            if not getattr(r, 'data', None):
                raise SystemExit(f"Missing teachers row for user {c['email']}")
        if role == 'Student':
            r = sb.table('students').select('*').eq('user_id', uid).execute()
            if not getattr(r, 'data', None):
                raise SystemExit(f"Missing students row for user {c['email']}")
        if role == 'Parent':
            r = sb.table('parents').select('*').eq('user_id', uid).execute()
            if not getattr(r, 'data', None):
                raise SystemExit(f"Missing parents row for user {c['email']}")

    # Org code via Supabase
    if not org_code_created_via_supabase:
        raise SystemExit('Org code could not be created via Supabase table API (fallback was used)')

    # Dashboard state check
    if created:
        u = created[0]
        got = sb.table('user_dashboard_states').select('*').eq('user_id', u['id']).execute()
        if not getattr(got, 'data', None):
            raise SystemExit(f"Dashboard state missing for {u['email']}")


if __name__ == '__main__':
    run()

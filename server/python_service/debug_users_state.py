
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Setup Supabase URL and Key in .env")
    exit(1)

supabase: Client = create_client(url, key)

emails = ["maneeth1302rao@gmail.com", "maneeth0213rao@gmail.com"]

print(f"Checking {len(emails)} users...")

for email in emails:
    print(f"\n--- {email} ---")
    # 1. Check Public Users Table
    try:
        res = supabase.table("users").select("*").eq("email", email).execute()
        if res.data:
            print(f"[Public Table] FOUND: ID={res.data[0]['id']}")
        else:
            print("[Public Table] NOT FOUND")
    except Exception as e:
        print(f"[Public Table] ERROR: {e}")

    # 2. Check Auth (Admin List) - Not easy to filter by email directly in list_users in some versions,
    # but we can try to sign up/sign in or just ignore if not critical. 
    # With Service Role, we can try get_user_by_id if we had it.
    # We will try admin.list_users() and see if we can find it.
    try:
        # Warning: This lists ALL users. In production this is bad. For dev it's ok.
        # Pagination usually defaults to 50 users.
        # Actually, let's just create a dummy user logic or rely on public table for now.
        print("[Auth] (Skipping direct auth check due to list limits, relying on public table status)")
    except Exception as e:
        print(f"[Auth] ERROR: {e}")

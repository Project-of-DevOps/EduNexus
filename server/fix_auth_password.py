import os
from supabase import create_client
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

print(f"Connecting to Supabase: {url}")
supabase = create_client(url, key)

email = "maneeth1302rao@gmail.com"
new_password = "maneeth2006"

import time

# Retry wrapper
def run_with_retry(func, *args, **kwargs):
    retries = 5
    for i in range(retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if i == retries - 1:
                raise e
            print(f"⚠️ Connection error ({e}), retrying {i+1}/{retries}...")
            time.sleep(2)

# Get User ID
print(f"Searching for {email}...")

def find_user():
    users = supabase.auth.admin.list_users()
    return next((u for u in users if u.email == email), None)

user = run_with_retry(find_user)

if user:
    print(f"Found User ID: {user.id}")
    print(f"Resetting password to: {new_password}")
    try:
        def update_pw():
            supabase.auth.admin.update_user_by_id(user.id, {"password": new_password})
        
        run_with_retry(update_pw)
        print("Password updated successfully.")
    except Exception as e:
        print(f"Failed to update password: {e}")
else:
    print(f"User {email} not found. Creating new user...")
    try:
        def create_u():
            attr = {"email": email, "password": new_password, "email_confirm": True}
            supabase.auth.admin.create_user(attr)
        
        run_with_retry(create_u)
        print("User created successfully with given password.")
    except Exception as e:
         print(f"Failed to create user: {e}")

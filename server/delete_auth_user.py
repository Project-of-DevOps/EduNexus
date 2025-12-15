
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(url, key)

email = "maneeth1302rao@gmail.com"

print(f"Deleting Auth User {email}...")

# List users to find ID
users = supabase.auth.admin.list_users()
user = next((u for u in users if u.email == email), None)

if user:
    print(f"Found user {user.id}. Deleting...")
    supabase.auth.admin.delete_user(user.id)
    print("✅ Deleted.")
else:
    print("User not found.")


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

print(f"Deleting {len(emails)} users...")

for email in emails:
    print(f"\n--- {email} ---")
    
    # 1. Get ID from Public Table
    try:
        res = supabase.table("users").select("id").eq("email", email).execute()
        if res.data:
            user_id = res.data[0]['id']
            print(f"Deleting ID={user_id}...")
            
            # Delete from Public Users Table
            supabase.table("users").delete().eq("id", user_id).execute()
            print("Deleted from public 'users' table.")
            
            # Delete from Authority (Admin)
            try:
                supabase.auth.admin.delete_user(user_id)
                print("Deleted from Auth.")
            except Exception as auth_e:
                print(f"Auth delete failed (might be already gone or different ID): {auth_e}")
        else:
            print("Not found in public table.")
            
    except Exception as e:
        print(f"Error: {e}")

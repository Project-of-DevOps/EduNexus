import os
import argparse
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Load env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print(json.dumps({"error": "Missing Supabase Credentials"}))
    exit(1)

supabase: Client = create_client(url, key)

def verify_user(email: str, role: str):
    results = {"email": email, "role": role, "checks": {}}
    
    try:
        # 1. Check Auth User (Optional, direct DB check usually better but we use Admin API)
        # We'll check the public 'users' table which should be synced
        res_user = supabase.table("users").select("*").eq("email", email).execute()
        if not res_user.data:
            results["checks"]["public_user_found"] = False
            return results
        
        user_data = res_user.data[0]
        results["checks"]["public_user_found"] = True
        results["user_id"] = user_data.get("id")
        results["stored_role"] = user_data.get("role")
        
        # 2. Check Role Specific Table
        if role == "Management":
            res_role = supabase.table("management_managers").select("*").eq("user_id", user_data["id"]).execute()
            results["checks"]["role_table_entry"] = len(res_role.data) > 0
            
        elif role == "Teacher":
            res_role = supabase.table("teachers").select("*").eq("user_id", user_data["id"]).execute()
            results["checks"]["role_table_entry"] = len(res_role.data) > 0
            
        elif role == "Student":
            res_role = supabase.table("students").select("*").eq("user_id", user_data["id"]).execute()
            results["checks"]["role_table_entry"] = len(res_role.data) > 0
            if results["checks"]["role_table_entry"]:
                results["student_data"] = res_role.data[0]
                
        elif role == "Parent":
            res_role = supabase.table("parents").select("*").eq("user_id", user_data["id"]).execute()
            results["checks"]["role_table_entry"] = len(res_role.data) > 0

    except Exception as e:
        results["error"] = str(e)
        
    return results

def verify_org_code(code_type: str):
    try:
         res = supabase.table("org_codes").select("*").eq("type", code_type).execute()
         return {"found": len(res.data), "data": res.data}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", help="User email to verify")
    parser.add_argument("--role", help="User role to verify")
    parser.add_argument("--check-codes", action="store_true", help="Check for org codes")
    
    args = parser.parse_args()
    
    output = {}
    
    if args.email and args.role:
        output["user_verification"] = verify_user(args.email, args.role)
        
    if args.check_codes:
        output["org_codes"] = {
            "institution": verify_org_code("institution"),
            "school": verify_org_code("school")
        }
        
    print(json.dumps(output, indent=2))

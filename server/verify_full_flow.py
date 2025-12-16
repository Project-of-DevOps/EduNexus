
import os
import argparse
import json
import asyncio
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
        # 1. Check Auth User (Public users table)
        res_user = supabase.table("users").select("*").eq("email", email).execute()
        
        if not res_user.data:
            results["checks"]["user_found"] = False
            results["status"] = "Fail: User not found in 'users' table"
            return results
        
        user_data = res_user.data[0]
        results["checks"]["user_found"] = True
        results["user_id"] = user_data.get("id")
        results["stored_role"] = user_data.get("role")
        
        # Verify Password Hash exists
        if user_data.get("password_hash"):
             results["checks"]["password_hash_exists"] = True
        else:
             results["checks"]["password_hash_exists"] = False
             results["warnings"] = ["Password hash is missing"]

        # 2. Check Role Specific Table
        if role == "Management":
            # Check management_managers
            res_role = supabase.table("management_managers").select("*").eq("user_id", user_data["id"]).execute()
            results["checks"]["role_table"] = "management_managers"
            results["checks"]["role_entry_found"] = len(res_role.data) > 0
            if len(res_role.data) > 0:
                results["role_data"] = res_role.data[0]
            else:
                 results["status"] = "Fail: User found but missing in 'management_managers'"

        elif role == "Teacher":
            # Check teachers (Renamed from teacher_profiles)
            res_role = supabase.table("teachers").select("*").eq("user_id", user_data["id"]).execute()
            results["checks"]["role_table"] = "teachers"
            results["checks"]["role_entry_found"] = len(res_role.data) > 0
            if len(res_role.data) > 0:
                results["role_data"] = res_role.data[0]
                results["checks"]["is_verified"] = res_role.data[0].get("is_verified")
            else:
                results["status"] = "Fail: User found but missing in 'teachers'"
                # Attempt to fix? (Instruction says: "if not create a table for that" - implying fix missing data or table)
                # But here table exists (we checked migration), so data is missing.
                
        elif role == "Student":
            # Check students (Renamed from student_profiles)
            res_role = supabase.table("students").select("*").eq("user_id", user_data["id"]).execute()
            results["checks"]["role_table"] = "students"
            results["checks"]["role_entry_found"] = len(res_role.data) > 0
            if len(res_role.data) > 0:
                 results["role_data"] = res_role.data[0]
                 results["checks"]["is_verified"] = res_role.data[0].get("is_verified")
            else:
                 results["status"] = "Fail: User found but missing in 'students'"

        elif role == "Parent":
            # Check parents table - Warning: Migration 003 did NOT show parents table.
            # We need to check if it exists.
            try:
                res_role = supabase.table("parents").select("*").eq("user_id", user_data["id"]).execute()
                results["checks"]["role_table"] = "parents"
                results["checks"]["role_entry_found"] = len(res_role.data) > 0
            except Exception as e:
                # Table might not exist
                 results["checks"]["role_table"] = "parents"
                 results["checks"]["role_entry_found"] = False
                 results["error"] = f"Table 'parents' access failed: {str(e)}"

    except Exception as e:
        results["error"] = str(e)
        
    return results

def verify_org_codes():
    output = {}
    try:
        res = supabase.table("org_codes").select("*").execute()
        output["total_codes"] = len(res.data)
        output["codes"] = res.data
    except Exception as e:
        output["error"] = str(e)
    return output

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
        output["org_codes"] = verify_org_codes()
        
    print(json.dumps(output, indent=2))

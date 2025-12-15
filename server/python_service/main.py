
import os
import json
import bcrypt
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load env from parent directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', '.env'))

url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
# Use Service Role Key for Admin Access (Bypasses RLS)
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("CRITICAL WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SignupRequest(BaseModel):
    name: str = "Unknown"
    email: str
    password: str
    role: str = "Management"

class SigninRequest(BaseModel):
    email: str
    password: str

class StateRequest(BaseModel):
    user_id: str
    state: Dict[str, Any]

# Helper to get a fresh Admin client
def get_supabase_admin() -> Client:
    if not url or not key:
        return None
    return create_client(url, key)

@app.on_event("startup")
def startup_db_check():
    supabase = get_supabase_admin()
    if not supabase:
        print("❌ Supabase not connected. Skipping startup check.")
        return
    
    print(f"Key loaded: {key[:5]}...")
    print("Checking Database Initialization (Native Auth)...")
    try:
        email = "maneeth1302rao@gmail.com"
        password = "SecurePassword123!"
        
        # 1. Check if Auth User exists
        users = supabase.auth.admin.list_users()
        user = next((u for u in users if u.email == email), None)
        
        user_id = None
        
        if user:
             print(f"✅ Auth User {email} exists.")
             user_id = user.id
        else:
             print(f"Auth User {email} not found. Creating...")
             # Create with email_confirm=True so they can login immediately
             attr = {"email": email, "password": password, "email_confirm": True}
             new_user = supabase.auth.admin.create_user(attr)
             user_id = new_user.user.id
             print(f"✅ Auth User {email} created.")

        # 2. Sync to PUBLIC users table
        # Check if exists in public.users
        res = supabase.table("users").select("id").eq("email", email).execute()
        if not res.data:
            print("Syncing to public.users...")
            # We use the SAME UUID from Auth
            user_data = {
                "id": user_id,
                "name": "Maneeth Rao",
                "email": email,
                "role": "Management",
                # No password_hash needed in public table anymore!
                "password_hash": "managed_by_supabase_auth" 
            }
            supabase.table("users").insert(user_data).execute()
            
            # Manager Profile
            mgr_data = {
                "user_id": user_id,
                "name": "Maneeth Rao",
                "email": email,
                "role": "Manager"
            }
            supabase.table("management_managers").insert(mgr_data).execute()
            print("✅ Public User & Manager Profile Synced.")
        else:
            print("✅ Public User record exists.")

    except Exception as e:
        print(f"❌ Startup Error: {e}")

@app.get("/")
def read_root():
    return {"status": "Python Auth Service Running (Native Supabase Auth)"}

@app.post("/api/py/signup")
def python_signup(req: SignupRequest):
    supabase = get_supabase_admin()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # 1. Native Auth Signup
        try:
             # Create client just for Auth action
             auth_client = create_client(url, key)
             auth_res = auth_client.auth.sign_up({"email": req.email, "password": req.password})
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"Auth Signup Failed: {str(e)}")
        
        if not auth_res.user:
             raise HTTPException(status_code=400, detail="Signup failed (no user returned)")
             
        user_id = auth_res.user.id

        # 2. Sync to Public Table using ADMIN client
        user_data = {
            "id": user_id,
            "name": req.name,
            "email": req.email,
            "role": req.role,
            "password_hash": "supabase_auth"
        }
        
        try:
             supabase.table("users").insert(user_data).execute()
        except Exception as e:
             pass 

        if req.role == "Management":
             manager_data = {
                "user_id": user_id,
                "name": req.name,
                "email": req.email,
                "role": "Manager"
             }
             supabase.table("management_managers").insert(manager_data).execute()

        new_user = user_data
        return {"success": True, "user": new_user}

    except Exception as e:
        print(f"Signup Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/py/signin")
def python_signin(req: SigninRequest):
    if not url or not key:
         raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        # Client A: Attempt Login
        auth_client = create_client(url, key)
        try:
             auth_res = auth_client.auth.sign_in_with_password({"email": req.email, "password": req.password})
        except Exception as e:
             raise HTTPException(status_code=401, detail="Invalid credentials (Auth)")
        
        if not auth_res.user:
             raise HTTPException(status_code=401, detail="Login failed")

        user_id = auth_res.user.id
        session_token = auth_res.session.access_token if auth_res.session else "no_token"

        # Client B: Admin Fetch (Fresh client to ensure Admin role)
        admin_client = create_client(url, key)
        
        # Fetch public profile
        res = admin_client.table("users").select("*").eq("id", user_id).execute()
        user_profile = res.data[0] if res.data else {}

        # Fetch dashboard state
        state_res = admin_client.table("user_dashboard_states").select("state_data").eq("user_id", user_id).execute()
        dashboard_state = state_res.data[0]['state_data'] if state_res.data else {}

        return {
            "success": True, 
            "token": session_token, 
            "user": user_profile, 
            "dashboard_state": dashboard_state
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/py/state")
def update_state(req: StateRequest):
    supabase = get_supabase_admin()
    if not supabase:
         raise HTTPException(status_code=500, detail="Supabase not configured")
         
    try:
        data = {"user_id": req.user_id, "state_data": req.state, "last_updated_at": "now()"}
        supabase.table("user_dashboard_states").upsert(data).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

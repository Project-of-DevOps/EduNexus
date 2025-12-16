
import os
import json
import random
import string
from fastapi import FastAPI, HTTPException, Body, Header
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://localhost:4000"],
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SignupRequest(BaseModel):
    name: str = "Unknown"
    email: str
    password: str
    role: str = "Management"
    extra: Dict[str, Any] = {}

class SigninRequest(BaseModel):
    email: str
    password: str

class StateRequest(BaseModel):
    user_id: str
    state: Dict[str, Any]

class OrgCodeRequest(BaseModel):
    type: str # 'institution' or 'school'
    institute_id: str

# Global Supabase Client
supabase_admin: Client = None

if url and key:
    try:
        supabase_admin = create_client(url, key)
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")

def get_supabase_admin() -> Client:
    return supabase_admin

@app.on_event("startup")
def startup_db_check():
    supabase = get_supabase_admin()
    if not supabase:
        print("[ERROR] Supabase not connected.")
        return
    print(f"Service Ready. Key loaded: {key[:5]}...")

@app.get("/")
def read_root():
    return {"status": "Python Auth Service Running"}

# --- Helper Functions ---

def generate_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def validate_org_code(code: str, required_type: Optional[str] = None):
    try:
        supabase = get_supabase_admin()
        res = supabase.table("org_codes").select("*").eq("code", code).eq("is_active", True).execute()
        if not res.data:
            return None
        
        data = res.data[0]
        if required_type and data['type'] != required_type:
            return None
            
        return data
    except:
        return None

# --- Endpoints ---

@app.post("/api/py/signup")
def python_signup(req: SignupRequest):
    supabase = get_supabase_admin()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    # 1. ORG CODE VALIDATION FOR NON-MANAGEMENT
    org_info = None
    if req.role in ["Student", "Parent", "Teacher"]:
        # Code is expected in 'extra'
        code = req.extra.get("uniqueId") or req.extra.get("code")
        
        # For Teachers, we now enforce validation if they claim to join an institute
        if req.role == "Teacher" and not code:
             # If using invited flow (frontend pendingTeacher), frontend might pass code?
             # But if passing uniqueId, we check it.
             pass

        if code:
            org_info = validate_org_code(code)
            if not org_info:
                # If code provided but invalid (checks org_codes table)
                # But wait, locally invited teachers might use a different code system?
                # The 'pendingTeachers' in frontend are local. 
                # If the user is using an Institute Code (from DB), it must be valid.
                raise HTTPException(status_code=400, detail="Invalid Organization Code")

    # 0. CHECK IF USER ALREADY EXISTS IN PUBLIC TABLE
    # If they do, we shouldn't try create them again in Auth or Public table.
    try:
        existing_user = supabase.table("users").select("id").eq("email", req.email).execute()
        if existing_user.data and len(existing_user.data) > 0:
             raise HTTPException(status_code=400, detail="Account already exists. Please log in.")
    except HTTPException:
        raise
    except Exception as e:
        # If table doesn't exist or connection fails, we might want to fail hard or log
        print(f"Error checking existing user: {e}")

    try:
        # 2. Native Auth Signup
        user_id = None
        try:
            auth_client = create_client(url, key)
            # Prefer admin create_user when service role key is available to avoid relying on
            # SMTP/email delivery for confirmation during automated flows/tests.
            auth_res = None
            try:
                # create user as already-confirmed to avoid email confirmation errors in test env
                auth_res = auth_client.auth.admin.create_user({"email": req.email, "password": req.password, "email_confirm": True})
                # admin.create_user returns a dict-like object with 'user'
                if isinstance(auth_res, dict) and auth_res.get('user'):
                    user_id = auth_res['user']['id']
                else:
                    user_id = getattr(auth_res.user, 'id', None)
            except Exception as auth_err:
                msg = str(auth_err)
                # If user already registered in Auth (but passed step 0, so NOT in public db), 
                # we have a zombie Auth user. We can't easily get the ID without admin.list_users 
                # or signing in.
                # However, falling back to sign_up when "User already registered" will just fail again 
                # or try to send email.
                print(f"Admin create_user failed: {msg}")
                
                if "already registered" in msg or "already exists" in msg:
                    # Zombie auth user. We really should stop or warn. 
                    # If we fallback to sign_up, it sends email.
                    # Best action: Fail and tell user to contact support or try password reset?
                    # Or for now, treat as failure.
                    raise HTTPException(status_code=400, detail="User already registered in Auth system. Please contact support.")
                
                # Only fallback if it's NOT an "already registered" error (e.g. unknown error)
                # Fallback: attempt standard sign_up (may send confirmation email)
                print("Falling back to standard sign_up...")
                auth_res = auth_client.auth.sign_up({"email": req.email, "password": req.password})
                user_id = getattr(auth_res.user, 'id', None) if auth_res and hasattr(auth_res, 'user') else None

        except Exception as e:
            # Catching the fallback error or logic error
            print(f"Auth loop failed: {e}")
            raise HTTPException(status_code=400, detail=f"Auth Signup Failed: {str(e)}")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Signup failed")
        
        user_id = user_id

        # 3. Sync to Public Table
        user_data = {
            "id": user_id,
            "name": req.name,
            "email": req.email,
            "role": req.role,
            "extra": req.extra, # Store raw extra too for flexibility
            "password_hash": "supabase_auth"
        }
        
        # Link to institute if found via code
        if org_info:
            user_data["extra"]["institute_id"] = org_info["institute_id"]
            user_data["extra"]["org_type"] = org_info["type"]

        supabase.table("users").insert(user_data).execute()

        # 4. Role Specific Tables (NEW)
        try:
            if req.role == "Management":
                # Create default manager entry
                mgr_data = {
                    "user_id": user_id,
                    "name": req.name,
                    "email": req.email,
                    "role": "Manager"
                }
                supabase.table("management_managers").insert(mgr_data).execute()

            elif req.role == "Teacher":
                t_data = {
                    "user_id": user_id,
                    "title": req.extra.get("title"),
                    "department": req.extra.get("department"),
                    "institute_id": org_info["institute_id"] if org_info else (req.extra.get("instituteName") or req.extra.get("instituteId")),
                    "class_id": req.extra.get("classId"),
                    "is_verified": False
                }
                supabase.table("teachers").insert(t_data).execute()

            elif req.role == "Student":
                s_data = {
                    "user_id": user_id,
                    "roll_number": req.extra.get("rollNumber"),
                    "class_id": req.extra.get("classId"),
                    "institute_id": org_info["institute_id"] if org_info else req.extra.get("instituteId"),
                    "parent_id": req.extra.get("parentId"),
                    "is_verified": False
                }
                supabase.table("students").insert(s_data).execute()

            elif req.role == "Parent":
                p_data = {
                    "user_id": user_id,
                    "institute_id": org_info["institute_id"] if org_info else None,
                    "child_ids": req.extra.get("childIds", [])
                }
                supabase.table("parents").insert(p_data).execute()
        except Exception as e:
            print(f"Warning: Failed to insert into role table: {e}")
            # Do not fail request, just log

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
             raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not auth_res.user:
             raise HTTPException(status_code=401, detail="Login failed")

        user_id = auth_res.user.id
        session_token = auth_res.session.access_token

        # Client B: Admin Fetch
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

@app.post("/api/py/check-email")
def check_email(req: Dict[str, str]):
    email = req.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    supabase = get_supabase_admin()
    if not supabase:
         raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res = supabase.table("users").select("id").eq("email", email).execute()
        exists = len(res.data) > 0
        return {"exists": exists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/py/create-org-code")
def create_org_code(req: OrgCodeRequest, authorization: str = Header(None)):
    # Verify Admin/Manager (Need to verify token or trust the call?
    # For now, trust the call if it comes from valid source, or verify user_id if we had it.
    # In real app, verify 'authorization' Bearer token against Supabase Auth.
    
    supabase = get_supabase_admin()
    code = generate_code()
    
    data = {
        "code": code,
        "type": req.type,
        "institute_id": req.institute_id
        # "created_by": user_id 
    }
    
    try:
        supabase.table("org_codes").insert(data).execute()
        return {"success": True, "code": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/py/state")
def update_state(req: StateRequest):
    supabase = get_supabase_admin()
    try:
        data = {"user_id": req.user_id, "state_data": req.state, "last_updated_at": "now()"}
        supabase.table("user_dashboard_states").upsert(data).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

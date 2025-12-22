
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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://localhost:4000", "https://edunexus-frontend-v2.onrender.com"],
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"Validation Error: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc), "body": str(exc.body)},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"Global Error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
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
    role: Optional[str] = None
    extra: Dict[str, Any] = {}

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

    # 1. Strict Duplicate Check (Use public table as source of truth)
    try:
        # Check simple duplicate
        existing_res = supabase.table("users").select("id").eq("email", req.email).execute()
        if existing_res.data and len(existing_res.data) > 0:
            # Strict rejection as requested
            raise HTTPException(status_code=400, detail="Email-ID already been used")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking duplicate: {e}")
        # Fail safe
        raise HTTPException(status_code=500, detail="Internal Server Error during validation")
    
    # 2. ORG CODE VALIDATION FOR NON-MANAGEMENT
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
                raise HTTPException(status_code=400, detail="Invalid Organization Code")

            # STRICT TYPE CHECK: ensure user selected correct tab/type for this code
            req_type = req.extra.get("orgType") or req.extra.get("type")
            if req_type:
                 req_type_norm = req_type.lower()
                 info_type_norm = org_info.get("type", "").lower()
                 if req_type_norm != info_type_norm:
                      # Mismatch: User used School tab for Institute code or vice versa
                      raise HTTPException(status_code=400, detail="Invalid Details")

    # 0. CHECK IF USER ALREADY EXISTS IN PUBLIC TABLE
    try:
        # Fetch role and extra to check consistency
        existing_res = supabase.table("users").select("*").eq("email", req.email).execute()
        if existing_res.data and len(existing_res.data) > 0:
             existing_user = existing_res.data[0]
             
             # Check for "Context Switch" Exception for Management Roles
             ALLOWED_TITLES = ["Chairman", "Director", "Principal", "Vice Principal", "Manager", "Administrator"]
             
             req_title = req.extra.get("title")
             is_management = req.role == "Management"
             title_ok = req_title in ALLOWED_TITLES
             
             existing_role = existing_user.get("role")
             existing_extra = existing_user.get("extra") or {}
             existing_type = existing_extra.get("type") or existing_extra.get("org_type")
             
             req_type = req.extra.get("type")
             if org_info:
                 req_type = org_info.get("type")
             
             # Allow Merge/Update if Management switching context
             if is_management and title_ok and existing_role == "Management" and existing_type and req_type and existing_type != req_type:
                 print(f"Allowing Context Switch for {req.email}: {existing_type} -> {req_type}")
                 new_extra = {**existing_extra, **req.extra}
                 if req_type:
                     new_extra["type"] = req_type
                     new_extra["org_type"] = req_type
                 
                 supabase.table("users").update({"extra": new_extra}).eq("id", existing_user['id']).execute()
                 existing_user["extra"] = new_extra
                 return {"success": True, "user": existing_user}
             
             raise HTTPException(status_code=400, detail="Email-ID is already existing")

    except HTTPException:
        raise
    except Exception as e:
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
                    raise HTTPException(status_code=400, detail="Email-ID is already existing")
                
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
                    "is_verified": False,
                    "status": "pending"
                }
                supabase.table("teachers").insert(t_data).execute()

            elif req.role == "Student":
                s_data = {
                    "user_id": user_id,
                    "roll_number": req.extra.get("rollNumber"),
                    "class_id": req.extra.get("classId"),
                    "institute_id": org_info["institute_id"] if org_info else req.extra.get("instituteId"),
                    "parent_id": req.extra.get("parentId"),
                    "is_verified": False,
                    "status": "pending"
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
        msg = str(e).lower()
        if "duplicate" in msg or "unique" in msg:
             raise HTTPException(status_code=400, detail="Email-ID is already existing")
        raise HTTPException(status_code=500, detail=str(e))


        
@app.post("/api/py/signin")
async def python_signin(req: SigninRequest):
    supabase = get_supabase_admin()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    auth_client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

    try:
        # 1. Authenticate with Supabase Auth
        try:
            auth_res = auth_client.auth.sign_in_with_password({"email": req.email, "password": req.password})
        except Exception as e:
             if "Invalid login credentials" in str(e):
                 raise HTTPException(status_code=401, detail="Invalid credentials")
             raise HTTPException(status_code=400, detail=str(e))

        if not auth_res.user:
             raise HTTPException(status_code=401, detail="Login failed")

        user_id = auth_res.user.id
        session_token = auth_res.session.access_token

        # 2. Strict Validation against Public DB
        res = supabase.table("users").select("*").eq("id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        db_user = res.data[0]
        db_role = db_user.get("role")
        db_extra = db_user.get("extra") or {}
        db_org_type = db_extra.get("org_type") or db_extra.get("type")

        # A. Role Check (if role provided)
        # Note: req.role might be "Management" but user is "Manager" (simplified role check needed?)
        # For now, strict check if provided.
        if req.role and req.role != db_role:
             raise HTTPException(status_code=400, detail=f"Login denied. Role mismatch: Account is registered as {db_role}.")

        # B. Org Type Check (Strict)
        # Verify if user registered as School trying to login as Institute
        desired_org_type = req.extra.get("orgType") if req.extra else None
        
        # Normalize comparison
        if db_org_type and desired_org_type:
            db_norm = db_org_type.lower()
            req_norm = desired_org_type.lower()
            
            if db_norm != req_norm:
                if db_norm == "school" and req_norm == "institute":
                    raise HTTPException(status_code=400, detail="Wrong Input")
                if db_norm == "institute" and req_norm == "school":
                    raise HTTPException(status_code=400, detail="Wrong Input")
                # Generic fallback
                raise HTTPException(status_code=400, detail="Wrong Input")

        # C. Institute Code & Name Check (Strict for Teacher/Student/Parent if provided)
        # Frontend will pass uniqueId (Code) and instituteName/orgName in extra
        
        # 1. Check Code Existence
        req_code = req.extra.get("uniqueId") or req.extra.get("code")
        req_org_name = req.extra.get("instituteName") or req.extra.get("orgName") or req.extra.get("schoolName")

        if req.role == "Teacher" or req.role == "Student" or req.role == "Parent":
            # If code is provided (it should be mandatory for these roles now per requirement)
            if req_code:
                # Validate Code
                org_info = validate_org_code(req_code)
                if not org_info:
                    raise HTTPException(status_code=400, detail="Invalid Code")
                
                # STRICT VALIDATION: Check Login Type Mismatch (School vs Institute)
                # Ensure user logged in with correct Type toggle matching the code
                req_login_type = req.extra.get("orgType")
                if req_login_type:
                     db_org_type = org_info.get("type", "").lower()
                     print(f"DEBUG: Login Type Check - Req: '{req_login_type}', DB: '{db_org_type}', Code: '{req_code}'")
                     if req_login_type.lower().strip() != db_org_type:
                         raise HTTPException(status_code=400, detail=f"Invalid Login Type: You selected {req_login_type} but code is for {db_org_type}")
                
                # Validate Name Matches Code
                # org_info structure: {id, code, type, institute_id, ...}
                # We need to check if 'institute_id' matches 'req_org_name' 
                # OR we might need to fetch the Organization Name from 'organizations' table using 'org_info.institute_id'
                # But 'organizations' table might not exist fully populated yet?
                # Let's check if 'organizations' table exists or if we rely on 'org_codes' having metadata?
                # The 'org_codes' table has 'institute_id'.
                
                # Assumption: 'institute_id' in org_codes IS the Name or ID?
                # Looking at create_org_code: "institute_id": req.institute_id
                # Usually this is the ID.
                # However, user requirement says "Institute name if logging from institute login or School Name... display School Name Mismatch"
                
                # Let's try to match against the 'institute_id' stored in 'org_codes'.
                # Ideally, we should fetch the REAL name from 'organizations' table.
                # Let's try to fetch organization details if possible.
                
                # Fallback: if 'institute_id' in org_codes allows storing Name directly (legacy check)?
                # Or we check if req_org_name matches.
                
                 # Strict Check: proper Name Mismatch
                db_org_id = org_info.get("institute_id")
                db_org_type = org_info.get("type", "").lower()
                
                match = False
                if db_org_id:
                     # Simple string match (case insensitive)
                     if db_org_id.lower().strip() == req_org_name.lower().strip():
                         match = True
                     else:
                         # Fetch organization name from correct table
                         try:
                             table_name = "institutes" if db_org_type == "institute" else "schools"
                             org_res = supabase.table(table_name).select("name").eq("id", db_org_id).execute()
                             if org_res.data:
                                 real_name = org_res.data[0]['name']
                                 if real_name.lower().strip() == req_org_name.lower().strip():
                                     match = True
                         except Exception as db_err:
                             print(f"Name verification DB error: {db_err}")
                             pass
                
                # If we still haven't matched, and we enforced Name validation:
                if not match:
                    # Determine Error Message
                    err_msg = "School Name Mismatch"
                    if db_org_type == "institute":
                        err_msg = "Institute Name Mismatch"
                    
                    raise HTTPException(status_code=400, detail=err_msg)

        # D. Status Check (Strict for Teachers)
        if req.role == "Teacher":
             # We need to check the 'teachers' table for the status.
             # db_user has 'id'.
             t_res = supabase.table("teachers").select("status").eq("user_id", user_id).execute()
             if t_res.data:
                 t_status = t_res.data[0].get("status") or "pending"
                 if t_status == "pending":
                     # Return 403 with specific detail handled by frontend
                     raise HTTPException(status_code=403, detail="Waiting for Management Approval")
                 elif t_status == "rejected":
                     raise HTTPException(status_code=403, detail="Request was Rejected")
        
        # 3. Fetch Dashboard State (from user_dashboard_states)
        # 3. Fetch Dashboard State
        dashboard_state = {}
        dashboard_error = False
        try:
            settings_res = supabase.table("user_dashboard_states").select("state_data").eq("user_id", user_id).execute()
            if settings_res.data:
                dashboard_state = settings_res.data[0]['state_data']
        except Exception as e:
            print(f"Dashboard State Fetch Error: {e}")
            dashboard_error = True

        return {
            "success": True, 
            "token": session_token, 
            "user": db_user, 
            "dashboard_state": dashboard_state,
            "dashboard_error": dashboard_error
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signin Error: {e}")
        # Return specific error for debugging
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

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

@app.post("/api/py/restore-dashboard-state")
def restore_dashboard_state(req: Dict[str, str]):
    user_id = req.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    supabase = get_supabase_admin()
    if not supabase:
         raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        # Simulate check first
        res = supabase.table("user_dashboard_states").select("state_data").eq("user_id", user_id).execute()
        if res.data:
            return {"success": True, "dashboard_state": res.data[0]['state_data']}
        else:
            # Return empty but success
            return {"success": True, "dashboard_state": {}}
    except Exception as e:
        print(f"Restore State Error: {e}")
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
        # Upsert into user_dashboard_states
        # We use user_id as key.
        data = {
            "user_id": req.user_id, 
            "state_data": req.state, 
            "updated_at": "now()"
        }
        # checking if user exists in settings is not strictly needed if we assume user exists, 
        # but upsert handling matches primary key.
        supabase.table("user_dashboard_states").upsert(data).execute()
        return {"success": True}
    except Exception as e:
        print(f"Update State Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/py/management/pending-teachers")
def get_pending_teachers(institute_id: Optional[str] = None):
    # Fetch teachers with status="pending"
    # Ideally scoped by institute_id
    supabase = get_supabase_admin()
    if not supabase:
         raise HTTPException(status_code=500, detail="Supabase not configured")

    # Join with users table to get name, email, extra
    try:
        # Debug: Trying simple select first to isolate join issue
        # query = supabase.table("teachers").select("*, users!inner(name, email, extra)").eq("status", "pending")
        # Removing !inner to see if it works as left join
        query = supabase.table("teachers").select("*, users(name, email, extra)").eq("status", "pending")
    
        if institute_id:
            query = query.eq("institute_id", institute_id)
        
        res = query.execute()
        return res.data
    except Exception as e:
        print(f"Error fetching pending teachers: {e}")
        # Return error as detail to see it in curl
        raise HTTPException(status_code=500, detail=f"Failed to fetch teachers: {str(e)}")

@app.post("/api/py/management/approve-teacher")
def approve_teacher(req: Dict[str, str]):
    user_id = req.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
        
    supabase = get_supabase_admin()
    # Update status to approved and is_verified to true
    supabase.table("teachers").update({"status": "approved", "is_verified": True}).eq("user_id", user_id).execute()
    return {"success": True}

@app.post("/api/py/management/reject-teacher")
def reject_teacher(req: Dict[str, str]):
    user_id = req.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
        
    supabase = get_supabase_admin()
    # Update status to rejected
    supabase.table("teachers").update({"status": "rejected", "is_verified": False}).eq("user_id", user_id).execute()
    return {"success": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

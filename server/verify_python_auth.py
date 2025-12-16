import urllib.request
import json
import uuid
import sys

BASE_URL = "http://localhost:8000"

def run_test():
    # Use a random email to ensure clean state
    unique_id = str(uuid.uuid4())[:8]
    email = f"test_user_{unique_id}@example.com"
    password = "Password123!"
    name = "Test User"
    
    print(f"--- Starting Auth Verification for {email} ---")

    # 1. Check Email (Should not exist)
    print("\n[1] Checking Email (Expect False)...")
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/py/check-email",
            data=json.dumps({"email": email}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            print("Response:", data)
            if data.get('exists') is False:
                print("Pass: Email does not exist.")
            else:
                print("Fail: Email shouldn't exist.")
                return
    except Exception as e:
        print(f"Fail: Check email request failed: {e}")
        return

    # 2. Signup
    print("\n[2] Signing Up...")
    try:
        payload = {
            "email": email,
            "password": password,
            "name": name,
            "role": "Management"
        }
        req = urllib.request.Request(
            f"{BASE_URL}/api/py/signup",
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            print("Response:", data)
            if data.get('success'):
                print("Pass: Signup successful.")
            else:
                print("Fail: Signup returned false.")
                return
    except urllib.error.HTTPError as e:
        print(f"Fail: Signup HTTP Error {e.code}: {e.read().decode('utf-8')}")
        return
    except Exception as e:
        print(f"Fail: Signup request failed: {e}")
        return

    # 3. Check Email Again (Should exist)
    print("\n[3] Checking Email Again (Expect True)...")
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/py/check-email",
            data=json.dumps({"email": email}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            print("Response:", data)
            if data.get('exists') is True:
                print("Pass: Email now exists.")
            else:
                print("Fail: Email should exist.")
                return
    except Exception as e:
        print(f"Fail: Check email request failed: {e}")
        return

    # 4. Signin
    print("\n[4] Signing In...")
    try:
        payload = {
            "email": email,
            "password": password
        }
        req = urllib.request.Request(
            f"{BASE_URL}/api/py/signin",
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            print("Response keys:", list(data.keys()))
            if data.get('success'):
                print("Pass: Signin successful.")
                print(f"User: {data.get('user', {}).get('email')}")
            else:
                print("Fail: Signin returned false.")
    except urllib.error.HTTPError as e:
        print(f"Fail: Signin HTTP Error {e.code}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Fail: Signin request failed: {e}")

if __name__ == "__main__":
    run_test()

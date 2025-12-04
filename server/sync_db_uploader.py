import json
import os
import time
import subprocess
import sys

# Configuration
DB_NAME = "edunexus_db"
DB_USER = "postgres"
DB_PASS = "root123"  # Default from your db.js
DB_HOST = "localhost"
QUEUE_FILE = os.path.join(os.path.dirname(__file__), "data", "signup_queue_disk.json")

def log(msg):
    print(f"[Sync Script] {msg}")

def run_sql(sql):
    """Runs a SQL command using psql via subprocess."""
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASS
    
    cmd = [
        "psql",
        "-h", DB_HOST,
        "-U", DB_USER,
        "-d", DB_NAME,
        "-c", sql,
        "-t", # Tuple only (no header/footer)
        "-A"  # Unaligned output
    ]
    
    try:
        result = subprocess.run(
            cmd, 
            env=env, 
            capture_output=True, 
            text=True, 
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        # DB might be down or query failed
        raise Exception(e.stderr.strip())

def wait_for_db():
    """Loops until DB is available."""
    log("Waiting for database connection...")
    while True:
        try:
            run_sql("SELECT 1")
            log("Database is active and reachable!")
            return
        except Exception:
            time.sleep(2)
            print(".", end="", flush=True)

def process_queue():
    if not os.path.exists(QUEUE_FILE):
        log("No queue file found. Nothing to sync.")
        return

    try:
        with open(QUEUE_FILE, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        log("Queue file is empty or invalid.")
        return

    if not isinstance(data, list) or len(data) == 0:
        log("Queue is empty.")
        return

    log(f"Found {len(data)} items in queue. Starting upload...")

    remaining_items = []
    synced_count = 0

    for item in data:
        if item.get("status") == "synced":
            continue

        email = item.get("email")
        name = item.get("name") or ""
        password_hash = item.get("password_hash")
        role = item.get("role") or "Management"
        extra = json.dumps(item.get("extra") or {})

        # Escape single quotes for SQL
        def esc(s): return s.replace("'", "''")

        sql = f"""
            INSERT INTO users (name, email, password_hash, role, extra) 
            VALUES ('{esc(name)}', '{esc(email)}', '{esc(password_hash)}', '{esc(role)}', '{extra}')
            RETURNING id;
        """

        try:
            user_id = run_sql(sql)
            log(f"[DEV NOTICE] Successfully uploaded: {email} (User ID: {user_id})")
            synced_count += 1
        except Exception as e:
            log(f"Failed to upload {email}: {e}")
            # Keep in queue to retry later
            remaining_items.append(item)

    # Update the queue file
    if synced_count > 0:
        with open(QUEUE_FILE, 'w') as f:
            json.dump(remaining_items, f, indent=2)
        log(f"Sync complete. {synced_count} items uploaded. {len(remaining_items)} items remaining.")
    else:
        log("No items were uploaded.")

if __name__ == "__main__":
    print("--- EduNexus DB Sync Utility ---")
    wait_for_db()
    process_queue()

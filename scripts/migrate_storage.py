#!/usr/bin/env python3
import os
import sys
import json
import paramiko

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"

LOCAL_ENV_PATH = "/home/i4yush/Desktop/intrust-india/.env.local"
PRODUCT_IMAGES_POLICIES_PATH = "/home/i4yush/Desktop/intrust-india/supabase/operational-sql/product_images_storage_policies.sql"
STORAGE_AVATAR_POLICIES_PATH = "/home/i4yush/Desktop/intrust-india/supabase/operational-sql/storage_avatar_policies.sql"

REMOTE_SCRIPT_PATH = "/var/www/intrustindia.com/migrate_storage_on_vps.py"
REMOTE_CONFIG_PATH = "/var/www/intrustindia.com/migration_config.json"

def info(msg): print(f"[INFO] {msg}")
def ok(msg):   print(f"[OK] {msg}")
def err(msg):  
    print(f"[ERROR] {msg}", file=sys.stderr)
    sys.exit(1)

def main():
    info("Starting local migrate_storage script...")
    
    # 1. Parse remote credentials from .env.local
    if not os.path.exists(LOCAL_ENV_PATH):
        err(f"Local environment file not found at {LOCAL_ENV_PATH}")
        
    remote_url = None
    remote_key = None
    
    with open(LOCAL_ENV_PATH, "r") as f:
        for line in f:
            if line.startswith("NEXT_PUBLIC_SUPABASE_URL="):
                remote_url = line.split("=")[1].strip()
            elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                remote_key = line.split("=")[1].strip()
                
    if not remote_url or not remote_key:
        err("Failed to extract remote URL or Service Role Key from .env.local")
        
    ok(f"Extracted remote Supabase URL: {remote_url}")
    
    # 2. Read RLS policy files
    if not os.path.exists(PRODUCT_IMAGES_POLICIES_PATH):
        err(f"Product images policy file not found at {PRODUCT_IMAGES_POLICIES_PATH}")
    if not os.path.exists(STORAGE_AVATAR_POLICIES_PATH):
        err(f"Avatar policy file not found at {STORAGE_AVATAR_POLICIES_PATH}")
        
    with open(PRODUCT_IMAGES_POLICIES_PATH, "r", encoding="utf-8") as f:
        product_images_policies_sql = f.read()
    with open(STORAGE_AVATAR_POLICIES_PATH, "r", encoding="utf-8") as f:
        storage_avatar_policies_sql = f.read()
        
    # 3. Connect to VPS
    info(f"Connecting to VPS at {VPS_HOST}...")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    ok("SSH connection established.")
    
    sftp = c.open_sftp()
    
    # 4. Upload migrate_storage_on_vps.py
    local_vps_script = "/home/i4yush/Desktop/intrust-india/scripts/migrate_storage_on_vps.py"
    info(f"Uploading {local_vps_script} to {REMOTE_SCRIPT_PATH}...")
    sftp.put(local_vps_script, REMOTE_SCRIPT_PATH)
    
    # Set execution permissions
    c.exec_command(f"chmod +x {REMOTE_SCRIPT_PATH}")
    
    # 5. Create and upload migration_config.json
    config_data = {
        "remote_url": remote_url,
        "remote_key": remote_key,
        "product_images_policies_sql": product_images_policies_sql,
        "storage_avatar_policies_sql": storage_avatar_policies_sql
    }
    
    info(f"Uploading migration config to {REMOTE_CONFIG_PATH}...")
    with sftp.file(REMOTE_CONFIG_PATH, "w") as f:
        json.dump(config_data, f)
        
    sftp.close()
    
    # 6. Execute migration script on VPS
    info("Executing migration script on VPS. This can take several minutes for 1,799 objects...")
    stdin, stdout, stderr = c.exec_command(f"python3 -u {REMOTE_SCRIPT_PATH}")
    
    # Stream output in real-time
    channel = stdout.channel
    while not channel.exit_status_ready():
        if channel.recv_ready():
            data = channel.recv(1024).decode("utf-8", errors="replace")
            sys.stdout.write(data)
            sys.stdout.flush()
        if channel.recv_stderr_ready():
            data = channel.recv_stderr(1024).decode("utf-8", errors="replace")
            sys.stderr.write(data)
            sys.stderr.flush()
            
    # Read remaining output
    sys.stdout.write(stdout.read().decode("utf-8", errors="replace"))
    sys.stderr.write(stderr.read().decode("utf-8", errors="replace"))
    
    exit_status = channel.recv_exit_status()
    
    # 7. Clean up configuration file (contains secrets) on the VPS
    info("Cleaning up files on VPS...")
    c.exec_command(f"rm -f {REMOTE_CONFIG_PATH}")
    c.exec_command(f"rm -f {REMOTE_SCRIPT_PATH}")
    
    c.close()
    
    if exit_status == 0:
        ok("Migration completed successfully on VPS!")
    else:
        err(f"Migration script failed on VPS with exit status {exit_status}")

if __name__ == "__main__":
    main()

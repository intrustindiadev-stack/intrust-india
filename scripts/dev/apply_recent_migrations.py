import os
import paramiko
import sys
import tempfile

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

MIGRATIONS_DIR = "/home/i4yush/Desktop/intrust-india/supabase/migrations"

def apply_migrations():
    # Find recent migrations
    files = sorted(os.listdir(MIGRATIONS_DIR))
    # We want migrations starting from 20260807000000
    recent_migrations = [f for f in files if f >= "20260807000000_" and f.endswith(".sql")]
    
    if not recent_migrations:
        print("No recent migrations found.")
        return

    print(f"Found {len(recent_migrations)} recent migrations to apply.")

    try:
        c = paramiko.SSHClient()
        c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
        sftp = c.open_sftp()
        
        for mig_file in recent_migrations:
            local_path = os.path.join(MIGRATIONS_DIR, mig_file)
            remote_path = f"/tmp/{mig_file}"
            
            print(f"Uploading {mig_file} to VPS...")
            sftp.put(local_path, remote_path)
            
            print(f"Applying {mig_file}...")
            # Run the migration using supabase_admin role to ensure access to auth schema
            cmd = f"cat {remote_path} | docker exec -i supabase-db psql -U supabase_admin -d postgres"
            stdin, stdout, stderr = c.exec_command(cmd)
            
            out = stdout.read().decode("utf-8", errors="replace")
            err = stderr.read().decode("utf-8", errors="replace")
            
            print(f"--- Output for {mig_file} ---")
            if out.strip(): print(out.strip())
            if err.strip(): print("STDERR:", err.strip())
            
            # Clean up
            c.exec_command(f"rm {remote_path}")
            
        sftp.close()
        c.close()
        print("All migrations applied successfully.")
    except Exception as e:
        print("Error:", str(e))
        sys.exit(1)

if __name__ == "__main__":
    apply_migrations()

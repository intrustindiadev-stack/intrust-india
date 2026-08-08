import os
import paramiko
import sys

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

MIGRATIONS_DIR = "/home/i4yush/Desktop/intrust-india/supabase/migrations"
mig_file = "20260809010100_bulk_preview_rpc.sql"

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    sftp = c.open_sftp()
    
    local_path = os.path.join(MIGRATIONS_DIR, mig_file)
    remote_path = f"/tmp/{mig_file}"
    
    sftp.put(local_path, remote_path)
    
    cmd = f"cat {remote_path} | docker exec -i supabase-db psql -U supabase_admin -d postgres"
    stdin, stdout, stderr = c.exec_command(cmd)
    
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    
    print(f"--- Output for {mig_file} ---")
    if out.strip(): print(out.strip())
    if err.strip(): print("STDERR:", err.strip())
    
    c.exec_command(f"rm {remote_path}")
    sftp.close()
    c.close()
except Exception as e:
    print("Error:", str(e))
    sys.exit(1)

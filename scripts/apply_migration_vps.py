import os
import sys
import paramiko

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASS = "Intrustdev@2026"
REMOTE_FILE = "/tmp/migration.sql"

def apply_migration(local_file):
    try:
        c = paramiko.SSHClient()
        c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
        
        sftp = c.open_sftp()
        sftp.put(local_file, REMOTE_FILE)
        sftp.close()
        
        print(f"Uploaded {local_file} to VPS.")
        
        cmd = f"docker exec -i supabase-db psql -U supabase_admin -d postgres < {REMOTE_FILE}"
        stdin, stdout, stderr = c.exec_command(cmd)
        
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        
        if out:
            print(out)
        if err:
            print("ERROR:", err)
            
        c.close()
        print("Migration applied successfully.")
    except Exception as e:
        print("Error:", str(e))
        sys.exit(1)

if __name__ == "__main__":
    apply_migration(sys.argv[1])

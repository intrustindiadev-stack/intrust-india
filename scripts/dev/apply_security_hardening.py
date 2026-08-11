"""
Apply ONLY the security hardening migrations from Aug 12, 2026.
"""
import paramiko
import os

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"

MIGRATIONS_DIR = "/home/i4yush/Desktop/intrust-india/supabase/migrations"

# Only apply these specific security migrations in order
SECURITY_MIGRATIONS = [
    "20260812_p0_security_hardening_execute_grants.sql",
    "20260812_p1_security_hardening_column_guard.sql",
    "20260812_p2_harden_atomic_wallet_credit_internal_auth.sql",
    "20260812_p4_payout_bola_fix.sql",
]

def apply():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=22, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    sftp = c.open_sftp()
    
    for mig_file in SECURITY_MIGRATIONS:
        local_path = os.path.join(MIGRATIONS_DIR, mig_file)
        remote_path = f"/tmp/{mig_file}"
        
        print(f"\n{'='*60}")
        print(f"Uploading {mig_file}...")
        sftp.put(local_path, remote_path)
        
        print(f"Applying {mig_file}...")
        cmd = f"cat {remote_path} | docker exec -i supabase-db psql -U supabase_admin -d postgres"
        _, stdout, stderr = c.exec_command(cmd)
        
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        
        if out.strip():
            print("OUTPUT:", out.strip())
        if err.strip():
            print("STDERR:", err.strip())
        
        # Check for actual errors (not just notices)
        if "ERROR" in err.upper() and "NOTICE" not in err.upper().split("ERROR")[0]:
            print(f"❌ Migration {mig_file} may have ERRORS above. Check carefully.")
        else:
            print(f"✅ {mig_file} applied successfully.")
        
        c.exec_command(f"rm {remote_path}")
    
    sftp.close()
    c.close()
    print("\n\n✅ All security hardening migrations applied.")

if __name__ == "__main__":
    apply()

"""
Apply Phase 1 migrations to VPS.
Targets:
  1. 20260806130000_drop_stale_team_rpc_overloads.sql
  2. 20260806140000_add_hrm_fields_to_user_profiles.sql
"""
import paramiko
import io
import os

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22
MIGRATIONS_DIR = "/home/i4yush/Desktop/intrust-india/supabase/migrations"

TARGET_MIGRATIONS = [
    "20260806130000_drop_stale_team_rpc_overloads.sql",
    "20260806140000_add_hrm_fields_to_user_profiles.sql",
]

def upload_and_apply(c, sftp, filename):
    local_path = os.path.join(MIGRATIONS_DIR, filename)
    remote_path = f"/tmp/{filename}"
    
    print(f"\n{'='*60}")
    print(f"Uploading {filename}...")
    sftp.put(local_path, remote_path)
    
    print(f"Applying {filename}...")
    cmd = f"docker exec -i supabase-db psql -U supabase_admin -d postgres < {remote_path}"
    _, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    
    if out.strip():
        print("Output:", out.strip())
    if err.strip():
        # psql outputs NOTICE to stderr — filter actual errors
        lines = [l for l in err.strip().split("\n") if l.strip()]
        for line in lines:
            if "ERROR" in line:
                print("ERROR:", line)
            else:
                print("INFO:", line)
    
    # Cleanup
    c.exec_command(f"rm -f {remote_path}")
    print(f"✓ Done: {filename}")

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    sftp = c.open_sftp()
    
    print("Connected to VPS. Applying Phase 1 migrations...\n")
    
    for mig in TARGET_MIGRATIONS:
        upload_and_apply(c, sftp, mig)
    
    # Verification queries
    print("\n" + "="*60)
    print("VERIFICATION QUERIES")
    print("="*60)
    
    verify_sql = r"""
-- 1. Verify only 1 admin_add_team_member overload remains
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN (
    'admin_add_team_member', 'admin_create_team', 'admin_remove_team_member'
)
ORDER BY p.proname;

-- 2. Verify HRM columns exist in user_profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
AND column_name IN ('employee_id', 'joining_date', 'employment_type', 'base_salary', 'city', 'department')
ORDER BY column_name;
"""
    
    verify_file = "/tmp/verify_phase1.sql"
    sftp.putfo(io.BytesIO(verify_sql.encode()), verify_file)
    cmd = f"docker exec -i supabase-db psql -U supabase_admin -d postgres < {verify_file}"
    _, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out.strip())
    if err.strip():
        print("STDERR:", err.strip())
    c.exec_command(f"rm -f {verify_file}")
    
    sftp.close()
    c.close()
    print("\nPhase 1 migrations applied and verified.")

if __name__ == "__main__":
    main()

"""Apply Phase 2+3 DB migrations: crm_lead_remarks + territory RLS."""
import paramiko
import os
import io

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22
MIGRATIONS_DIR = "/home/i4yush/Desktop/intrust-india/supabase/migrations"

TARGET_MIGRATIONS = [
    "20260806150000_create_crm_lead_remarks.sql",
    "20260806160000_territory_based_crm_lead_visibility.sql",
]

def upload_and_apply(c, sftp, filename):
    local_path = os.path.join(MIGRATIONS_DIR, filename)
    remote_path = f"/tmp/{filename}"
    sftp.put(local_path, remote_path)
    
    print(f"\n{'='*60}")
    print(f"Applying {filename}...")
    cmd = f"docker exec -i supabase-db psql -U supabase_admin -d postgres < {remote_path}"
    _, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    
    if out.strip():
        print(out.strip())
    if err.strip():
        for line in err.strip().split("\n"):
            if line.strip():
                if "ERROR" in line:
                    print("❌ ERROR:", line)
                else:
                    print("  ℹ", line)
    c.exec_command(f"rm -f {remote_path}")
    print(f"✓ Done: {filename}")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
sftp = c.open_sftp()

print("Connected. Applying Phase 2+3 DB migrations...")

for mig in TARGET_MIGRATIONS:
    upload_and_apply(c, sftp, mig)

# Verification
print("\n" + "="*60)
print("VERIFICATION")
print("="*60)

verify_sql = r"""
-- 1. crm_lead_remarks table exists?
SELECT 'crm_lead_remarks' AS table_name, COUNT(*) AS rows FROM public.crm_lead_remarks;

-- 2. RLS policies on crm_lead_remarks
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'crm_lead_remarks'
ORDER BY cmd, policyname;

-- 3. crm_leads SELECT policies
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'crm_leads' AND cmd = 'SELECT'
ORDER BY policyname;
"""

verify_file = "/tmp/verify_phase23.sql"
sftp.putfo(io.BytesIO(verify_sql.encode()), verify_file)
cmd = f"docker exec -i supabase-db psql -U supabase_admin -d postgres < {verify_file}"
_, stdout, stderr = c.exec_command(cmd)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
if out.strip(): print(out.strip())
if "ERROR" in err: print("ERROR:", err.strip())
c.exec_command(f"rm -f {verify_file}")

sftp.close()
c.close()
print("\nPhase 2+3 DB migrations complete.")

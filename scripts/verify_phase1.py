"""Quick verification of Phase 1 fixes."""
import paramiko
import io

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

def run_sql(c, sftp, sql, label):
    remote_file = "/tmp/verify.sql"
    sftp.putfo(io.BytesIO(sql.encode()), remote_file)
    cmd = f"docker exec -i supabase-db psql -U supabase_admin -d postgres < {remote_file}"
    _, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(f"\n[{label}]")
    if out.strip(): print(out.strip())
    if "ERROR" in err: print("ERROR:", err.strip())

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
sftp = c.open_sftp()

run_sql(c, sftp, r"""
SELECT p.proname AS func, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN (
    'admin_add_team_member', 'admin_create_team', 'admin_remove_team_member'
)
ORDER BY p.proname;
""", "RPC OVERLOADS (should be 1 each)")

run_sql(c, sftp, r"""
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
AND column_name IN ('employee_id','joining_date','employment_type','base_salary','city','department')
ORDER BY column_name;
""", "HRM COLUMNS IN user_profiles")

run_sql(c, sftp, r"""
SELECT id, full_name, role::text, email, team_id
FROM public.user_profiles
WHERE role::text IN ('relationship_exec','relationship_manager','employee','hr_manager','admin','super_admin')
ORDER BY role, full_name;
""", "ELIGIBLE USERS FOR TEAMS (unassigned + assigned)")

sftp.close()
c.close()
print("\nVerification complete.")

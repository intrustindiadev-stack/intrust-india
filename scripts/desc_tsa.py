import paramiko
import io

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
sftp = c.open_sftp()

sql = """
\\d public.team_service_areas;
SELECT pol.polname, pol.polcmd, pol.polqual, pol.polwithcheck
FROM pg_policy pol
JOIN pg_class tbl ON pol.polrelid = tbl.oid
JOIN pg_namespace nsp ON tbl.relnamespace = nsp.oid
WHERE nsp.nspname = 'public' AND tbl.relname = 'team_service_areas';
"""
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/desc_tsa.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/desc_tsa.sql")
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())

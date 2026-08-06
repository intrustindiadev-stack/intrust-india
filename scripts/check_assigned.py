import paramiko
import io

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

sql = """
SELECT COUNT(assigned_to) AS assigned_count, COUNT(*) AS total_count FROM public.crm_leads;
SELECT tm.team_id, tm.user_id, up.role FROM public.team_members tm JOIN public.user_profiles up ON tm.user_id = up.id LIMIT 10;
"""
sftp = c.open_sftp()
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/check_assigned.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/check_assigned.sql")
print(stdout.read().decode())

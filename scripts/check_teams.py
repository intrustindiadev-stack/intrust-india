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
SELECT id, name, region_level, city FROM public.teams;
SELECT city, COUNT(*) FROM public.crm_leads GROUP BY city ORDER BY 2 DESC LIMIT 10;
"""

sftp.putfo(io.BytesIO(sql.encode()), "/tmp/check_teams.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/check_teams.sql")
print(stdout.read().decode())
if stderr:
    print(stderr.read().decode())

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
GRANT EXECUTE ON FUNCTION public.team_get_user_subtree(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_get_user_subtree(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.team_get_user_subtree(uuid) TO service_role;
"""
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/grant_func.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres -c \"$(cat /tmp/grant_func.sql)\"")
print("STDOUT:", stdout.read().decode().strip())
print("STDERR:", stderr.read().decode().strip())

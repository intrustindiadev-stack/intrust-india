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
SELECT up.id, up.full_name, up.role, au.email
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE au.email = 'bhartichouhan928@gmail.com';
"""
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/get_bharti.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/get_bharti.sql")
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())

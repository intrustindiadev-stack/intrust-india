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
SELECT id, email, role FROM user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
"""
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/get_admin.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/get_admin.sql")
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())

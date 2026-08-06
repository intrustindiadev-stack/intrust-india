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
SELECT id, state, city, area, pincode FROM team_service_areas WHERE team_id = '630fa633-dcc0-4209-afbf-de8c0bf9b0dd';
"""
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/desc_service.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres -t -c \"$(cat /tmp/desc_service.sql)\"")
print("STDOUT:", stdout.read().decode().strip())
print("STDERR:", stderr.read().decode().strip())

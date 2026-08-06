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
SELECT id, name, region_level, state, city FROM teams LIMIT 5;
"""
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/desc_teams_db.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres -t -c \"$(cat /tmp/desc_teams_db.sql)\"")
print("STDOUT:", stdout.read().decode().strip())
print("STDERR:", stderr.read().decode().strip())

import paramiko

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"

sql = """
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles';
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=22, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
cmd = f'''docker exec supabase-db psql -U postgres -d postgres -t -c "{sql}"'''
stdin, stdout, stderr = c.exec_command(cmd)
print("OUT:", stdout.read().decode())
print("ERR:", stderr.read().decode())
c.close()

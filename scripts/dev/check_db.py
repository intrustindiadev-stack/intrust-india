import paramiko
import io

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=22, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

cmd = 'psql -U intrustindia -d intrust_db -c "\\d crm_lead_activities"'
stdin, stdout, stderr = c.exec_command(cmd)
print("OUT:", stdout.read().decode())
print("ERR:", stderr.read().decode())

cmd = 'psql -U intrustindia -d intrust_db -c "\\d user_profiles"'
stdin, stdout, stderr = c.exec_command(cmd)
print("OUT:", stdout.read().decode())
print("ERR:", stderr.read().decode())

c.close()

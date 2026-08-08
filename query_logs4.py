import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("187.124.98.130", username="intrustindia", password="Intrustdev@2026")
cmd = """
psql -U postgres -d postgres -c "\d user_profiles"
"""
stdin, stdout, stderr = c.exec_command(cmd)
print(stdout.read().decode())
print(stderr.read().decode())

import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("187.124.98.130", port=22, username="intrustindia", password="Intrustdev@2026")
stdin, stdout, stderr = client.exec_command("docker restart supabase-db supabase-auth")
print(stdout.read().decode())
print(stderr.read().decode())
client.close()

import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("187.124.98.130", port=22, username="intrustindia", password="Intrustdev@2026")
stdin, stdout, stderr = client.exec_command("docker logs supabase-auth 2>&1 | grep -i token | tail -n 20")
print(stdout.read().decode())
client.close()

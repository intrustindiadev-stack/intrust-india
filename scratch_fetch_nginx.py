import paramiko

host = '187.124.98.130'
user = 'intrustindia'
password = 'Intrustdev@2026'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

command = "echo 'Intrustdev@2026' | sudo -S docker logs supabase-kong 2>&1 | grep '39f0923d7b24c41748e2bd54cb01ab4f'"
stdin, stdout, stderr = ssh.exec_command(command)

print("--- STDOUT ---")
print(stdout.read().decode('utf-8'))
print("--- STDERR ---")
print(stderr.read().decode('utf-8'))

ssh.close()

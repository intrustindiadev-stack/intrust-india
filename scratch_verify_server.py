import paramiko
host = '187.124.98.130'
user = 'intrustindia'
password = 'Intrustdev@2026'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

command = "grep -rn '1747f89b4a232fb6.js' /var/www/intrustindia.com/app/.next/server/"
stdin, stdout, stderr = ssh.exec_command(command)
print("--- NEW CHUNK STDOUT ---")
print(stdout.read().decode('utf-8'))

command = "grep -rn '3313fb8f56811a06.js' /var/www/intrustindia.com/app/.next/server/"
stdin, stdout, stderr = ssh.exec_command(command)
print("--- OLD CHUNK STDOUT ---")
print(stdout.read().decode('utf-8'))

ssh.close()

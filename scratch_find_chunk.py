import paramiko
host = '187.124.98.130'
user = 'intrustindia'
password = 'Intrustdev@2026'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

command = "find /var/www/intrustindia.com/app/.next -name '3313fb8f56811a06.js'"
stdin, stdout, stderr = ssh.exec_command(command)
print("--- STDOUT ---")
print(stdout.read().decode('utf-8'))

ssh.close()

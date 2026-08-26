import paramiko
host = '187.124.98.130'
user = 'intrustindia'
password = 'Intrustdev@2026'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

command = "grep -rn 'Always overwrite apikey' /var/www/intrustindia.com/app/.next/static/chunks/"
stdin, stdout, stderr = ssh.exec_command(command)
out = stdout.read().decode('utf-8')
print("--- STDOUT ---")
if not out:
    print("NO MATCH FOUND - INTERCEPTOR IS MISSING FROM PRODUCTION BUILD!")
else:
    print(out)

ssh.close()

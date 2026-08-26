import paramiko

def run():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('187.124.98.130', username='intrustindia', password='Intrustdev@2026', timeout=10)
    stdin, stdout, stderr = ssh.exec_command("cat /var/log/nginx/access.log | awk '$9 == 400 || $9 == 401' | tail -n 20")
    print(stdout.read().decode())
    ssh.close()

if __name__ == '__main__':
    run()

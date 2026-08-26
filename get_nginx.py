import paramiko

def run():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('187.124.98.130', username='intrustindia', password='Intrustdev@2026', timeout=10)
    stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-available/intrust-india || cat /etc/nginx/nginx.conf")
    print(stdout.read().decode())
    ssh.close()

if __name__ == '__main__':
    run()

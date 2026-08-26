import paramiko

def fetch_logs():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('187.124.98.130', username='intrustindia', password='Intrustdev@2026', timeout=10)
    stdin, stdout, stderr = ssh.exec_command("grep -n -C 5 'No API key' /home/intrustindia/.pm2/logs/*.log")
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    ssh.close()

if __name__ == '__main__':
    fetch_logs()

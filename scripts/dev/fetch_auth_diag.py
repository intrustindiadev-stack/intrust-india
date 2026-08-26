import paramiko
import sys

def run_ssh(command):
    host = '187.124.98.130'
    user = 'intrustindia'
    password = 'Intrustdev@2026'

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password, timeout=10)
        stdin, stdout, stderr = ssh.exec_command(f"echo '{password}' | sudo -S {command}")
        out = stdout.read().decode('utf-8')
        if out: print(out)
    finally:
        ssh.close()

if __name__ == '__main__':
    run_ssh("cat /tmp/pm2_tail.log | grep -A 15 -B 2 -i 'path: .*/login' | head -n 30")

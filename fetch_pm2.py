import paramiko
import sys

def check_pm2():
    host = '187.124.98.130'
    user = 'intrustindia'
    password = 'Intrustdev@2026'

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password, timeout=10)
        command = "cat ~/.pm2/logs/intrust-india-error.log | tail -n 100 && cat ~/.pm2/logs/intrust-india-out.log | tail -n 100"
        stdin, stdout, stderr = ssh.exec_command(command)
        print("--- STDOUT ---")
        print(stdout.read().decode('utf-8'))
        print("--- STDERR ---")
        print(stderr.read().decode('utf-8'))
    finally:
        ssh.close()

if __name__ == '__main__':
    check_pm2()

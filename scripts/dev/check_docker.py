import paramiko

HOST = '187.124.98.130'
USER = 'intrustindia'
PASSWORD = 'Intrustdev@2026'

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASSWORD)
        stdin, stdout, stderr = ssh.exec_command('docker ps')
        print(stdout.read().decode('utf-8'))
    finally:
        ssh.close()

if __name__ == '__main__':
    main()
